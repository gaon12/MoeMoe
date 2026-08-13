import { describe, expect, it } from "vitest";
import {
  buildConfiguredServerTimeUrl,
  buildSameOriginServerTimeUrl,
  parseServerDateHeader,
  parseServerTimePayload,
} from "./serverTime";

describe("server time utilities", () => {
  it("builds placeholder, query parameter, and same-origin URLs", () => {
    expect(
      buildConfiguredServerTimeUrl(
        "https://time.example.test/{timezone}",
        "Asia/Seoul",
      ),
    ).toBe("https://time.example.test/Asia%2FSeoul");

    expect(
      buildConfiguredServerTimeUrl(
        "https://time.example.test/current?timeZone=",
        "Asia/Seoul",
      ),
    ).toBe("https://time.example.test/current?timeZone=Asia%2FSeoul");

    expect(
      buildSameOriginServerTimeUrl(
        "https://moemoe.example.test/app?theme=dark#clock",
        123,
      ),
    ).toBe(
      "https://moemoe.example.test/app?theme=dark&_moemoe_server_time=123",
    );
  });

  it("rejects unsafe configured endpoints", () => {
    expect(
      buildConfiguredServerTimeUrl(
        "http://time.example.test/{timezone}",
        "UTC",
      ),
    ).toBeUndefined();
  });

  it("parses supported JSON time response shapes", () => {
    expect(parseServerTimePayload({ timestamp: "1786590000" })).toBe(
      1_786_590_000_000,
    );
    expect(parseServerTimePayload({ unixtime: 1_786_590_000 })).toBe(
      1_786_590_000_000,
    );
    expect(
      parseServerTimePayload({ iso8601: "2026-08-13T08:20:00.000Z" }),
    ).toBe(Date.parse("2026-08-13T08:20:00.000Z"));
    expect(
      parseServerTimePayload({ dateTime: "2026-08-13T17:20:00+09:00" }),
    ).toBe(Date.parse("2026-08-13T17:20:00+09:00"));
    expect(parseServerTimePayload({ temperature: 20 })).toBeNull();
  });

  it("parses HTTP Date response headers", () => {
    const response = new Response(null, {
      headers: { Date: "Thu, 13 Aug 2026 08:20:00 GMT" },
    });
    expect(parseServerDateHeader(response)).toBe(
      Date.parse("2026-08-13T08:20:00.000Z"),
    );
  });
});
