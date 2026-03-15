import { describe, expect, test } from "bun:test";
import { ok, err } from "./result.ts";
import type { Result } from "./result.ts";

describe("Result type helpers", () => {
  test("ok() creates success result", () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  test("ok() wraps any value type", () => {
    const s = ok("hello");
    if (s.ok) expect(s.value).toBe("hello");
    const n = ok(null);
    if (n.ok) expect(n.value).toBeNull();
    const u = ok(undefined);
    if (u.ok) expect(u.value).toBeUndefined();
    const o = ok({ a: 1 });
    if (o.ok) expect(o.value).toEqual({ a: 1 });
  });

  test("err() creates failure result", () => {
    const error = new Error("test error");
    const result = err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("test error");
    }
  });

  test("Result discriminated union narrows correctly", () => {
    const result: Result<number> = ok(10);
    if (result.ok) {
      const value: number = result.value;
      expect(value).toBe(10);
    }
  });
});
