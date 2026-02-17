import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";

// ============================================================================
// Types & Config
// ============================================================================

const TranscriptEntrySchema = Type.Object({
    ts: Type.Number(),
    role: Type.String(),
    agentId: Type.String(),
    name: Type.Optional(Type.String()),
    groupId: Type.String(),
    content: Type.String(),
});

type TranscriptEntry = typeof TranscriptEntrySchema.static;

const PluginConfigSchema = Type.Object({
    enabled: Type.Optional(Type.Boolean({ default: true })),
    transcriptDir: Type.Optional(
        Type.String({
            default: path.join(os.homedir(), ".openclaw", "shared", "group-transcripts"),
        })
    ),
    maxContextEntries: Type.Optional(Type.Number({ default: 20 })),
    maxAgeMinutes: Type.Optional(Type.Number({ default: 60 })), // Only look back 1 hour by default
    agentNames: Type.Optional(Type.Record(Type.String(), Type.String())),
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse group session key to extract agentId and groupId.
 * Format: agent:{agentId}:feishu:group:{groupId}
 * Example: agent:reviewer:feishu:group:oc_7707...
 */
function parseGroupSessionKey(sessionKey: string): { agentId: string; groupId: string } | null {
    const parts = sessionKey.split(":");
    // Check for standard group session key format
    if (parts.length >= 5 && parts[2] === "feishu" && parts[3] === "group") {
        return {
            agentId: parts[1],
            groupId: parts[4],
        };
    }
    return null;
}

/**
 * Extract the last assistant text message from the conversation history.
 */
function extractLastAssistantText(messages: any[]): string | null {
    if (!messages || messages.length === 0) return null;

    // Look from end to start
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "assistant") {
            if (typeof msg.content === "string") {
                return msg.content;
            }
            if (Array.isArray(msg.content)) {
                const textParts = msg.content
                    .filter((b: any) => b.type === "text")
                    .map((b: any) => b.text)
                    .join("\n");
                if (textParts) return textParts;
            }
        }
    }
    return null;
}

/**
 * Append entry to the group's transcript file.
 */
async function appendEntry(dir: string, entry: TranscriptEntry) {
    await fs.ensureDir(dir);
    const file = path.join(dir, `group-${entry.groupId}.jsonl`);
    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(file, line, "utf8");
}

/**
 * Read recent entries from the group's transcript file.
 */
async function readRecentEntries(
    dir: string,
    groupId: string,
    options: { maxEntries: number; maxAgeMinutes: number; excludeAgentId: string }
): Promise<TranscriptEntry[]> {
    const file = path.join(dir, `group-${groupId}.jsonl`);
    if (!(await fs.pathExists(file))) {
        return [];
    }

    try {
        const content = await fs.readFile(file, "utf8");
        const lines = content.split("\n").filter((line) => line.trim());
        const now = Date.now();
        const maxAgeMs = options.maxAgeMinutes * 60 * 1000;

        const entries: TranscriptEntry[] = [];
        for (const line of lines) {
            try {
                const entry = JSON.parse(line) as TranscriptEntry;
                // Filter by age
                if (now - entry.ts > maxAgeMs) continue;
                // Filter by agent (exclude self)
                if (entry.agentId === options.excludeAgentId) continue;
                entries.push(entry);
            } catch {
                continue;
            }
        }

        // Return most recent entries
        return entries.slice(-options.maxEntries);
    } catch (err) {
        console.error(`group-awareness: failed to read transcript ${file}:`, err);
        return [];
    }
}

/**
 * Format entries into a context string for the LLM.
 */
function formatContextForInjection(entries: TranscriptEntry[]): string {
    const lines = entries.map((e) => {
        const time = new Date(e.ts).toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
        const name = e.name || e.agentId;
        return `[${time}] ${name}: ${e.content}`;
    });

    return `<group-chat-context>
The following are recent messages from other bots in this group chat.
They are hidden from your standard history because of platform isolation.
Use this context to be aware of what other bots have said.

${lines.join("\n")}
</group-chat-context>`;
}

// ============================================================================
// Plugin Definition
// ============================================================================

const groupAwarenessPlugin = {
    id: "group-awareness",
    name: "Group Awareness",
    description: "Enables multi-bot context sharing in group chats via shared file transcript",
    configSchema: PluginConfigSchema,

    register(api: OpenClawPluginApi) {
        const cfg = Value.Decode(PluginConfigSchema, Value.Default(PluginConfigSchema, api.pluginConfig ?? {}));
        const transcriptDir = api.resolvePath(cfg.transcriptDir!); // Resolve ~ to home dir

        api.logger.info(`group-awareness: plugin registered (dir: ${transcriptDir})`);

        // Hook 1: Write to transcript after agent replies
        api.on("agent_end", async (event, ctx) => {
            if (!ctx.sessionKey) return;
            const parsed = parseGroupSessionKey(ctx.sessionKey);
            if (!parsed) return;

            const replyText = extractLastAssistantText(event.messages);
            if (!replyText) return;

            try {
                await appendEntry(transcriptDir, {
                    ts: Date.now(),
                    role: "assistant",
                    agentId: parsed.agentId,
                    name: cfg.agentNames?.[parsed.agentId] ?? ctx.agentId, // Use configured name or fallback to agent ID
                    groupId: parsed.groupId,
                    content: replyText,
                });
                api.logger.info(`group-awareness: recorded reply from ${ctx.agentId} in group ${parsed.groupId} (${replyText.length} chars)`);
            } catch (err) {
                api.logger.error(`group-awareness: failed to record entry: ${String(err)}`);
            }
        });

        // Hook 2: Read from transcript before agent starts
        api.on("before_agent_start", async (_event, ctx) => {
            if (!ctx.sessionKey) return;
            const parsed = parseGroupSessionKey(ctx.sessionKey);
            if (!parsed) return;

            try {
                const entries = await readRecentEntries(transcriptDir, parsed.groupId, {
                    maxEntries: cfg.maxContextEntries!,
                    maxAgeMinutes: cfg.maxAgeMinutes!,
                    excludeAgentId: parsed.agentId,
                });

                if (entries.length === 0) return;

                api.logger.info(`group-awareness: injecting ${entries.length} entries from other bots into ${ctx.agentId}'s context`);

                return {
                    prependContext: formatContextForInjection(entries),
                };
            } catch (err) {
                api.logger.error(`group-awareness: failed to inject context: ${String(err)}`);
            }
        });
    },
};

export default groupAwarenessPlugin;
