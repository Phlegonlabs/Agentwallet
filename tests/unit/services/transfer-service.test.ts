import { createHash } from "node:crypto";
import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockSendFile = mock(async () => undefined);

mock.module("@ton/ton", () => ({
  TonClient: class {
    sendFile = mockSendFile;
  },
}));

const { broadcastTransaction } = await import("../../../src/services/transfer-service.ts");

describe("broadcastTransaction", () => {
  beforeEach(() => {
    mockSendFile.mockClear();
  });

  test("returns an honest TON submission identifier instead of a fake tx hash", async () => {
    const boc = Buffer.from("test-ton-boc");
    const expectedSubmissionId = `boc_${createHash("sha256").update(boc).digest("hex")}`;

    const result = await broadcastTransaction({
      chainType: "ton",
      serialized: boc.toString("base64"),
    });

    expect(mockSendFile).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("broadcasted");
      expect(result.value.submissionId).toBe(expectedSubmissionId);
      expect(result.value.txHash).toBeUndefined();
    }
  });
});
