import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockCreate, mockReply } = vi.hoisted(() => ({
  mockCreate: vi.fn().mockResolvedValue({ code: 0, data: { message_id: "m1" } }),
  mockReply: vi.fn().mockResolvedValue({ code: 0, data: { message_id: "m2" } }),
}));

vi.mock("./accounts.js", () => ({
  resolveFeishuAccount: vi.fn(() => ({
    accountId: "default",
    configured: true,
    enabled: true,
    domain: "feishu",
    config: {},
  })),
}));

vi.mock("./client.js", () => ({
  createFeishuClient: vi.fn(() => ({
    im: {
      message: {
        create: mockCreate,
        reply: mockReply,
      },
    },
  })),
}));

vi.mock("./runtime.js", () => ({
  getFeishuRuntime: vi.fn(() => ({
    channel: {
      text: {
        resolveMarkdownTableMode: vi.fn(() => "native"),
        convertMarkdownTables: vi.fn((text: string) => text),
      },
    },
  })),
}));

vi.mock("./targets.js", () => ({
  normalizeFeishuTarget: vi.fn((to: string) => to.replace(/^chat:/, "")),
  resolveReceiveIdType: vi.fn(() => "chat_id"),
}));

import { sendMessageFeishu } from "./send.js";

describe("sendMessageFeishu mention conversion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts legacy <at id=...></at> markup into text mention payload", async () => {
    const cfg = {} as ClawdbotConfig;

    await sendMessageFeishu({
      cfg,
      to: "chat:oc_group_1",
      text: '<at id=ou_manager_bot></at> please review',
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0]?.[0];
    expect(call.data.msg_type).toBe("text");
    const parsed = JSON.parse(call.data.content);
    expect(parsed.text).toContain('<at user_id="ou_manager_bot">ou_manager_bot</at>');
  });

  it("keeps non-mention messages in post format", async () => {
    const cfg = {} as ClawdbotConfig;

    await sendMessageFeishu({
      cfg,
      to: "chat:oc_group_1",
      text: "## status update",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0]?.[0];
    expect(call.data.msg_type).toBe("post");
  });

  it("retries transient socket errors and eventually succeeds", async () => {
    const cfg = {} as ClawdbotConfig;
    mockCreate
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ code: 0, data: { message_id: "m-retry" } });

    await sendMessageFeishu({
      cfg,
      to: "chat:oc_group_1",
      text: "retry check",
    });

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
