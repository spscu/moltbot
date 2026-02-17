import type { FeishuMessageEvent } from "./bot.js";

/**
 * Mention target user info
 */
export type MentionTarget = {
  openId: string;
  name: string;
  key: string; // Placeholder in original message, e.g. @_user_1
};

function resolveMentionId(mention: FeishuMessageEvent["message"]["mentions"][number]): string {
  return (
    String(
      mention.id.open_id ?? mention.id.user_id ?? mention.id.union_id ?? "",
    ).trim()
  );
}

function normalizeBotIds(botIdOrIds?: string | string[]): Set<string> {
  const arr = Array.isArray(botIdOrIds) ? botIdOrIds : [botIdOrIds];
  return new Set(
    arr
      .map((v) => String(v ?? "").trim())
      .filter(Boolean),
  );
}

/**
 * Extract mention targets from message event (excluding the bot itself)
 */
export function extractMentionTargets(
  event: FeishuMessageEvent,
  botIdOrIds?: string | string[],
): MentionTarget[] {
  const mentions = event.message.mentions ?? [];
  const botIds = normalizeBotIds(botIdOrIds);

  return mentions
    .filter((m) => {
      const mentionId = resolveMentionId(m);
      if (!mentionId) {
        return false;
      }
      // Exclude the bot itself
      if (botIds.has(mentionId)) {
        return false;
      }
      return true;
    })
    .map((m) => ({
      openId: resolveMentionId(m),
      name: m.name,
      key: m.key,
    }));
}

/**
 * Check if message is a mention forward request
 * Rules:
 * - Group: message mentions bot + at least one other user
 * - DM: message mentions any user (no need to mention bot)
 */
export function isMentionForwardRequest(
  event: FeishuMessageEvent,
  botOpenId?: string | string[],
): boolean {
  const mentions = event.message.mentions ?? [];
  if (mentions.length === 0) {
    return false;
  }
  const botIds = normalizeBotIds(botOpenId);

  const isDirectMessage = event.message.chat_type === "p2p";
  const hasOtherMention = mentions.some((m) => {
    const mentionId = resolveMentionId(m);
    return Boolean(mentionId) && !botIds.has(mentionId);
  });

  if (isDirectMessage) {
    // DM: trigger if any non-bot user is mentioned
    return hasOtherMention;
  } else {
    // Group: need to mention both bot and other users
    const hasBotMention = mentions.some((m) => botIds.has(resolveMentionId(m)));
    return hasBotMention && hasOtherMention;
  }
}

/**
 * Extract message body from text (remove @ placeholders)
 */
export function extractMessageBody(text: string, allMentionKeys: string[]): string {
  let result = text;

  // Remove all @ placeholders
  for (const key of allMentionKeys) {
    result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "");
  }

  return result.replace(/\s+/g, " ").trim();
}

/**
 * Format @mention for text message
 */
export function formatMentionForText(target: MentionTarget): string {
  return `<at user_id="${target.openId}">${target.name}</at>`;
}

/**
 * Format @everyone for text message
 */
export function formatMentionAllForText(): string {
  return `<at user_id="all">Everyone</at>`;
}

/**
 * Format @mention for card message (lark_md)
 */
export function formatMentionForCard(target: MentionTarget): string {
  return `<at id=${target.openId}></at>`;
}

/**
 * Format @everyone for card message
 */
export function formatMentionAllForCard(): string {
  return `<at id=all></at>`;
}

/**
 * Build complete message with @mentions (text format)
 */
export function buildMentionedMessage(targets: MentionTarget[], message: string): string {
  if (targets.length === 0) {
    return message;
  }

  const mentionParts = targets.map((t) => formatMentionForText(t));
  return `${mentionParts.join(" ")} ${message}`;
}

/**
 * Build card content with @mentions (Markdown format)
 */
export function buildMentionedCardContent(targets: MentionTarget[], message: string): string {
  if (targets.length === 0) {
    return message;
  }

  const mentionParts = targets.map((t) => formatMentionForCard(t));
  return `${mentionParts.join(" ")} ${message}`;
}
