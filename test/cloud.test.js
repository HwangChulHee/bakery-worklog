import { describe, it, expect, vi, afterEach } from "vitest";
import { backupToCloud, restoreFromCloud } from "../src/cloud";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backupToCloud", () => {
  it("POST 로 비밀번호+데이터를 보내고 성공 응답 반환", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const r = await backupToCloud("pw123", { entries: { a: 1 } });

    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backup");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ password: "pw123", data: { entries: { a: 1 } } });
  });

  it("401 이면 서버 메시지로 에러를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: "비밀번호가 올바르지 않습니다" }),
    }));
    await expect(backupToCloud("x", {})).rejects.toThrow("비밀번호가 올바르지 않습니다");
  });

  it("본문 없는 5xx 면 기본 메시지", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => { throw new Error("no body"); },
    }));
    await expect(backupToCloud("x", {})).rejects.toThrow("백업 실패 (500)");
  });
});

describe("restoreFromCloud", () => {
  it("GET 으로 데이터를 받아 반환", async () => {
    const data = { entries: { "2026-6-1": { start: "08:30", end: "13:30" } } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) });
    vi.stubGlobal("fetch", fetchMock);

    const r = await restoreFromCloud("pw123");

    expect(r).toEqual(data);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backup?password=pw123");
  });

  it("비밀번호 특수문자는 URL 인코딩", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) });
    vi.stubGlobal("fetch", fetchMock);
    await restoreFromCloud("a b&c");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backup?password=a%20b%26c");
  });

  it("data 가 없으면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) }));
    expect(await restoreFromCloud("pw")).toBeNull();
  });

  it("401 이면 에러", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: "비밀번호가 올바르지 않습니다" }),
    }));
    await expect(restoreFromCloud("x")).rejects.toThrow("비밀번호가 올바르지 않습니다");
  });
});
