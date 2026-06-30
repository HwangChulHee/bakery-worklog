import { describe, it, expect, vi, afterEach } from "vitest";
import { backupToCloud, restoreFromCloud } from "../src/cloud";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backupToCloud", () => {
  it("POST 로 이름+비밀번호+데이터를 보내고 성공 응답 반환", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const r = await backupToCloud("철희", "pw123", { entries: { a: 1 } });

    expect(r).toEqual({ ok: true });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backup");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ name: "철희", password: "pw123", data: { entries: { a: 1 } } });
  });

  it("401 이면 서버 메시지로 에러를 던진다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: "비밀번호가 올바르지 않습니다" }),
    }));
    await expect(backupToCloud("철희", "x", {})).rejects.toThrow("비밀번호가 올바르지 않습니다");
  });

  it("본문 없는 5xx 면 기본 메시지", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 500, json: async () => { throw new Error("no body"); },
    }));
    await expect(backupToCloud("철희", "x", {})).rejects.toThrow("백업 실패 (500)");
  });
});

describe("restoreFromCloud", () => {
  it("GET 으로 이름+비밀번호를 보내 데이터를 받아 반환", async () => {
    const data = { entries: { "2026-6-1": { start: "08:30", end: "13:30" } } };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) });
    vi.stubGlobal("fetch", fetchMock);

    const r = await restoreFromCloud("철희", "pw123");

    expect(r).toEqual(data);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backup?name=%EC%B2%A0%ED%9D%AC&password=pw123");
  });

  it("특수문자는 URL 인코딩", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) });
    vi.stubGlobal("fetch", fetchMock);
    await restoreFromCloud("a b", "x&y");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/backup?name=a%20b&password=x%26y");
  });

  it("data 가 없으면 null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) }));
    expect(await restoreFromCloud("철희", "pw")).toBeNull();
  });

  it("401 이면 에러", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: "비밀번호가 올바르지 않습니다" }),
    }));
    await expect(restoreFromCloud("철희", "x")).rejects.toThrow("비밀번호가 올바르지 않습니다");
  });
});
