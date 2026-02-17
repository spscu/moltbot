import { describe, expect, it } from "vitest";
import { extractMentionTargets, isMentionForwardRequest } from "./mention.js";
import type { FeishuMessageEvent } from "./bot.js";

function makeEvent(params: {
  chatType?: "p2p" | "group";
  mentions?: FeishuMessageEvent["message"]["mentions"];
}): FeishuMessageEvent {
  return {
    sender: {
      sender_id: { open_id: "ou_sender" },
      sender_type: "user",
    },
    message: {
      message_id: "om_1",
      chat_id: "oc_1",
      chat_type: params.chatType ?? "group",
      message_type: "text",
      content: JSON.stringify({ text: "hi" }),
      mentions: params.mentions ?? [],
    },
  };
}

describe("mention forwarding id compatibility", () => {
  it("treats bot mention by user_id as valid bot mention in group", () => {
    const event = makeEvent({
      mentions: [
        { key: "@_1", name: "Manager", id: { user_id: "ou_manager" } },
        { key: "@_2", name: "Reviewer", id: { user_id: "ou_reviewer" } },
      ],
    });
    expect(isMentionForwardRequest(event, "ou_manager")).toBe(true);
  });

  it("extracts non-bot mention target when mention id is in user_id field", () => {
    const event = makeEvent({
      mentions: [
        { key: "@_1", name: "Manager", id: { user_id: "ou_manager" } },
        { key: "@_2", name: "Reviewer", id: { user_id: "ou_reviewer" } },
      ],
    });
    const targets = extractMentionTargets(event, "ou_manager");
    expect(targets).toEqual([
      { key: "@_2", name: "Reviewer", openId: "ou_reviewer" },
    ]);
  });

  it("supports bot id candidates list", () => {
    const event = makeEvent({
      mentions: [
        { key: "@_1", name: "Manager", id: { union_id: "on_manager" } },
        { key: "@_2", name: "Reviewer", id: { open_id: "ou_reviewer" } },
      ],
    });
    expect(isMentionForwardRequest(event, ["ou_manager", "on_manager"])).toBe(true);
  });
});

