import type { ClawdbotConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import { botIdCandidates, botOpenIds, botNames } from "./state.js";
import { resolveFeishuAccount } from "./accounts.js";
import { getFeishuRuntime } from "./runtime.js";
import { createFeishuReplyDispatcher } from "./reply-dispatcher.js";

/**
 * Maximum forwarding depth to prevent infinite bot-to-bot loops.
 * e.g. Manager -> Reviewer -> Manager -> Reviewer ...
 */
const MAX_FORWARD_DEPTH = 1;

/**
 * Track active forwarding chains to prevent recursion.
 * Key: chatId, Value: current depth
 */
const activeForwardChains = new Map<string, number>();

/**
 * Process bot-to-bot mention forwarding for outgoing messages.
 *
 * When a bot sends a message that mentions another bot in a group,
 * this function bypasses Feishu's event system (which blocks bot-to-bot
 * messages) and directly dispatches the message to the target agent
 * via OpenClaw's internal routing.
 *
 * Key design decisions:
 * - Does NOT call handleFeishuMessage (which has 5 filters that block synthetic events)
 * - Uses OpenClaw runtime dispatch directly (same pipeline as real messages, minus the filters)
 * - Has recursion protection (MAX_FORWARD_DEPTH) to prevent infinite loops
 */
export async function forwardMessageToMentionedBots(params: {
    cfg: ClawdbotConfig;
    content: string;
    chatId: string;
    chatType: "group" | "p2p";
    senderAccountId: string;
    runtime?: RuntimeEnv;
}): Promise<void> {
    const { cfg, content, chatId, chatType, senderAccountId, runtime } = params;
    const log = runtime?.log ?? console.log;

    log(
        `feishu[${senderAccountId}]: forward check started, chatType=${chatType}, chatId=${chatId}, content preview: "${content.slice(0, 100)}"`,
    );
    log(
        `feishu[${senderAccountId}]: botNames map: ${JSON.stringify(Array.from(botNames.entries()))}`,
    );

    // Only forward group messages (not DMs)
    if (chatType !== "group") {
        log(`feishu[${senderAccountId}]: skipping forward, chatType=${chatType} is not group`);
        return;
    }

    // Recursion guard: prevent infinite bot-to-bot chains
    const currentDepth = activeForwardChains.get(chatId) ?? 0;
    if (currentDepth >= MAX_FORWARD_DEPTH) {
        log(
            `feishu[${senderAccountId}]: skipping forward, max depth ${MAX_FORWARD_DEPTH} reached in ${chatId}`,
        );
        return;
    }

    // Find which bots are mentioned in the content
    const targetAccountIds = findMentionedBotAccounts(content, senderAccountId, log);

    if (targetAccountIds.length === 0) {
        log(`feishu[${senderAccountId}]: no other bots mentioned in content, skipping forward`);
        return; // No other bots mentioned
    }

    // Dispatch to each mentioned bot
    for (const targetAccountId of targetAccountIds) {
        log(
            `feishu[${senderAccountId}]: forwarding mention to bot account=${targetAccountId} in ${chatId}`,
        );

        try {
            // Set recursion guard before dispatching
            activeForwardChains.set(chatId, currentDepth + 1);

            await dispatchToAgent({
                cfg,
                content,
                chatId,
                senderAccountId,
                targetAccountId,
                runtime,
            });
        } catch (err) {
            log(
                `feishu[${senderAccountId}]: error forwarding to ${targetAccountId}: ${String(err)}`,
            );
        } finally {
            // Clear recursion guard
            if (currentDepth === 0) {
                activeForwardChains.delete(chatId);
            } else {
                activeForwardChains.set(chatId, currentDepth);
            }
        }
    }
}

/**
 * Scan message content for mentions of other bots (by name or by ID).
 * Returns the list of target accountIds.
 */
function findMentionedBotAccounts(
    content: string,
    senderAccountId: string,
    log: (...args: any[]) => void,
): string[] {
    const matched = new Set<string>();

    // Strategy 1: Scan for plain text @BotName mentions
    // This is the primary method since LLMs output plain text like "@Reviewer"
    for (const [accountId, name] of botNames) {
        if (accountId === senderAccountId) continue;

        const nameRegex = new RegExp(`@${escapeRegex(name)}\\b`, "i");
        const found = nameRegex.test(content);
        log(`feishu: scanning for @${name} (account=${accountId}): ${found ? "FOUND" : "not found"}`);
        if (found) {
            matched.add(accountId);
        }
    }

    // Strategy 2: Scan for <at id="..."> tags (Feishu format)
    // Less common for LLM outputs but handles cases where content has raw Feishu tags
    const atIdPatterns = [
        /<at\s+id\s*=\s*["']?([^"'\s>]+)["']?\s*[>\s]/gi,
        /<at\s+user_id\s*=\s*["']?([^"'\s>]+)["']?\s*[>\s]/gi,
    ];

    // Build reverse lookup: open_id -> accountId (skip sender's own IDs)
    const senderBotIds = new Set(
        (botIdCandidates.get(senderAccountId) ?? []).map((id) => String(id).trim()),
    );

    for (const pattern of atIdPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const id = match[1]?.trim();
            if (!id || senderBotIds.has(id)) continue;

            // Look up which account this ID belongs to
            for (const [accountId, candidates] of botIdCandidates) {
                if (accountId === senderAccountId) continue;
                if (candidates.some((c) => c === id)) {
                    matched.add(accountId);
                }
            }
        }
    }

    return Array.from(matched);
}

/**
 * Dispatch a message directly to a target agent via OpenClaw's internal routing.
 * This bypasses handleFeishuMessage's filtering (dedup, allowlist, requireMention)
 * and uses the same dispatch pipeline that real messages use for the final delivery.
 */
async function dispatchToAgent(params: {
    cfg: ClawdbotConfig;
    content: string;
    chatId: string;
    senderAccountId: string;
    targetAccountId: string;
    runtime?: RuntimeEnv;
}): Promise<void> {
    const { cfg, content, chatId, senderAccountId, targetAccountId, runtime } = params;
    const log = runtime?.log ?? console.log;

    const core = getFeishuRuntime();
    const targetAccount = resolveFeishuAccount({ cfg, accountId: targetAccountId });

    // Resolve sender info for display
    const senderName = botNames.get(senderAccountId) ?? senderAccountId;
    const senderOpenId = botOpenIds.get(senderAccountId) ?? "unknown";

    // Resolve routing for the target agent
    const route = core.channel.routing.resolveAgentRoute({
        cfg,
        channel: "feishu",
        accountId: targetAccount.accountId,
        peer: {
            kind: "group",
            id: chatId,
        },
    });

    // Format the message body with speaker attribution
    const messageBody = `${senderName}: ${content}`;
    const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(cfg);

    const body = core.channel.reply.formatAgentEnvelope({
        channel: "Feishu",
        from: `${chatId}:${senderOpenId}`,
        timestamp: new Date(),
        envelope: envelopeOptions,
        body: messageBody,
    });

    const syntheticMessageId = `synthetic_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const feishuTo = `chat:${chatId}`;

    const ctxPayload = core.channel.reply.finalizeInboundContext({
        Body: body,
        BodyForAgent: content,
        RawBody: content,
        CommandBody: content,
        From: `feishu:${senderOpenId}`,
        To: feishuTo,
        SessionKey: route.sessionKey,
        AccountId: route.accountId,
        ChatType: "group",
        GroupSubject: chatId,
        SenderName: senderName,
        SenderId: senderOpenId,
        Provider: "feishu" as const,
        Surface: "feishu" as const,
        MessageSid: syntheticMessageId,
        Timestamp: Date.now(),
        WasMentioned: true, // The target bot was mentioned
        OriginatingChannel: "feishu" as const,
        OriginatingTo: feishuTo,
    });

    const { dispatcher, replyOptions, markDispatchIdle } = createFeishuReplyDispatcher({
        cfg,
        agentId: route.agentId,
        runtime: runtime as RuntimeEnv,
        chatId,
        replyToMessageId: undefined, // No specific message to reply to
        accountId: targetAccount.accountId,
    });

    log(
        `feishu[${senderAccountId}]: dispatching forwarded message to agent ${route.agentId} (session=${route.sessionKey})`,
    );

    const { queuedFinal, counts } = await core.channel.reply.dispatchReplyFromConfig({
        ctx: ctxPayload,
        cfg,
        dispatcher,
        replyOptions,
    });

    markDispatchIdle();

    log(
        `feishu[${senderAccountId}]: forward dispatch complete (queuedFinal=${queuedFinal}, replies=${counts.final})`,
    );
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
