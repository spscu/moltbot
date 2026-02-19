import { type ChannelOutboundAdapter, DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import { sendMediaFeishu } from "./media.js";
import { getFeishuRuntime } from "./runtime.js";
import { sendMessageFeishu } from "./send.js";
import { forwardMessageToMentionedBots } from "./forward.js";

export const feishuOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => getFeishuRuntime().channel.text.chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 4000,
  sendText: async ({ cfg, to, text, accountId }) => {
    const result = await sendMessageFeishu({ cfg, to, text, accountId: accountId ?? undefined });
    // Detect chatType from target format: "chat:oc_xxx" = group, "user:ou_xxx" = p2p
    const isGroup = to.startsWith("chat:") || result.chatId.startsWith("oc_");
    const chatType = isGroup ? "group" : "p2p" as const;
    // Try forwarding to other bots if this was a group message
    // Best-effort: don't block or fail if forwarding fails
    void forwardMessageToMentionedBots({
      cfg,
      content: text,
      chatId: result.chatId,
      chatType,
      senderAccountId: accountId ?? DEFAULT_ACCOUNT_ID,
    }).catch((err) => {
      console.error(`[feishu] forwarding failed:`, err);
    });
    return { channel: "feishu", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, accountId }) => {
    // Send text first if provided
    if (text?.trim()) {
      await sendMessageFeishu({ cfg, to, text, accountId: accountId ?? undefined });
    }

    // Upload and send media if URL provided
    if (mediaUrl) {
      try {
        const result = await sendMediaFeishu({
          cfg,
          to,
          mediaUrl,
          accountId: accountId ?? undefined,
        });
        return { channel: "feishu", ...result };
      } catch (err) {
        // Log the error for debugging
        console.error(`[feishu] sendMediaFeishu failed:`, err);
        // Fallback to URL link if upload fails
        const fallbackText = `📎 ${mediaUrl}`;
        const result = await sendMessageFeishu({
          cfg,
          to,
          text: fallbackText,
          accountId: accountId ?? undefined,
        });
        return { channel: "feishu", ...result };
      }
    }

    // No media URL, just return text result
    const result = await sendMessageFeishu({
      cfg,
      to,
      text: text ?? "",
      accountId: accountId ?? undefined,
    });
    return { channel: "feishu", ...result };
  },
};
