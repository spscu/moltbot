import type { ClawdbotConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import type { FeishuMessageEvent } from "./bot.js";
import { handleFeishuMessage } from "./bot.js";
import { botIdCandidates, botIdToAccountId, botOpenIds, botNames } from "./state.js";

/**
 * Process bot-to-bot mention forwarding for outgoing messages.
 * When a bot sends a message that mentions another bot in a group,
 * that message is also forwarded to the mentioned bot for processing.
 *
 * This enables scenarios like: Manager bot sending "@Reviewer please review this"
 * -> Reviewer bot also processes that message as input
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

    // Only forward group messages (not DMs)
    if (chatType !== "group") {
        return;
    }

    // Extract mention IDs from message content
    const mentionIdPatterns = [
        /<at\s+id\s*=\s*["']?([^"'\s>]+)["']?\s*[>\s]/gi,
        /<at\s+user_id\s*=\s*["']?([^"'\s>]+)["']?\s*[>\s]/gi,
        /["']?(?:id|user_id)["']?\s*:\s*["']?([^"',\s}]+)["']?/gi,
    ];

    const extractedIds = new Set<string>();
    for (const pattern of mentionIdPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const id = match[1]?.trim();
            if (id) extractedIds.add(id);
        }

    }

    // Also scan for plain text mentions using bot names (e.g. "@Reviewer")
    // This is needed because LLMs often output plain text mentions instead of <at> tags
    for (const [accountId, name] of botNames) {
        if (accountId === senderAccountId) continue;

        // Case-insensitive check for @Name
        // Use word boundary to avoid partial matches (e.g. @ReviewerBot matching @Reviewer)
        const nameRegex = new RegExp(`@${name}\\b`, "i");
        if (nameRegex.test(content)) {
            // Found a mention! We need the bot's open_id or user_id to forward to
            const openId = botOpenIds.get(accountId);
            const candidates = botIdCandidates.get(accountId);
            const targetId = openId || candidates?.[0];

            if (targetId) {
                extractedIds.add(targetId);
            }
        }
    }

    if (extractedIds.size === 0) {
        return; // No mentions found
    }

    // Find which of these IDs correspond to other bots
    const senderBotIds = botIdCandidates.get(senderAccountId) ?? [];
    const senderBotIdSet = new Set(senderBotIds.map((id) => String(id).trim()));

    // Filter to get only other bots' IDs
    const mentionedBotIds = Array.from(extractedIds).filter((id) => !senderBotIdSet.has(id));

    if (mentionedBotIds.length === 0) {
        return; // No other bots mentioned
    }

    // Create a synthetic Feishu message event for each mentioned bot
    for (const mentionedBotId of mentionedBotIds) {
        const targetAccountId = botIdToAccountId.get(mentionedBotId);
        if (!targetAccountId || targetAccountId === senderAccountId) {
            continue; // Target account not found or is self
        }

        // Get sender info
        const senderOpenId = botOpenIds.get(senderAccountId) ?? "unknown";

        // Create a synthetic message event representing this outgoing message
        // This event will be processed by the target bot as if it received a mention
        const syntheticEvent: FeishuMessageEvent = {
            message: {
                message_id: `synthetic_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                chat_id: chatId,
                chat_type: "group",
                content,
                message_type: "text",

                mentions: [
                    {
                        key: `@${mentionedBotId}`,
                        id: {
                            open_id: mentionedBotId,
                        },
                        name: mentionedBotId,
                    },
                ],
            },
            sender: {
                sender_id: {
                    open_id: senderOpenId,
                },
                sender_type: "bot",
            },
        };

        // Forward to target bot's handler
        log(
            `feishu[${senderAccountId}]: forwarding mention to bot ${mentionedBotId} (account: ${targetAccountId})`,
        );

        const targetBotIds = botIdCandidates.get(targetAccountId) ?? [];
        const forwardPromise = handleFeishuMessage({
            cfg,
            event: syntheticEvent,
            botOpenId: botOpenIds.get(targetAccountId),
            botIdCandidates: targetBotIds,
            runtime,
            chatHistories: new Map(), // Use empty history for synthetic events
            accountId: targetAccountId,
        });

        try {
            await forwardPromise;
        } catch (err) {
            runtime?.error?.(
                `feishu[${senderAccountId}]: error forwarding message to ${targetAccountId}: ${String(err)}`,
            );
        }
    }
}
