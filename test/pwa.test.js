import { describe, it, expect, vi, afterEach } from "vitest";
import { setupAutoUpdate } from "../src/pwa";

afterEach(() => vi.restoreAllMocks());

function makeEnv() {
  const swListeners = {}, docListeners = {};
  const reg = { update: vi.fn().mockResolvedValue(undefined) };
  const nav = { serviceWorker: {
    addEventListener: (t, cb) => { swListeners[t] = cb; },
    ready: Promise.resolve(reg),
  } };
  const doc = { visibilityState: "visible", addEventListener: (t, cb) => { docListeners[t] = cb; } };
  const win = { location: { reload: vi.fn() } };
  return { nav, doc, win, reg, swListeners, docListeners };
}

describe("setupAutoUpdate (PWA 자동 갱신)", () => {
  it("serviceWorker 미지원이면 아무 것도 하지 않는다", async () => {
    await expect(setupAutoUpdate({ nav: {}, doc: {}, win: {} })).resolves.toBeUndefined();
  });

  it("주기적/다시볼때 update 하고, 새 SW 활성화 시 1회만 새로고침한다", async () => {
    const { nav, doc, win, reg, swListeners, docListeners } = makeEnv();
    const intervalSpy = vi.spyOn(globalThis, "setInterval").mockImplementation(() => 1);

    await setupAutoUpdate({ nav, doc, win });

    // 1분 주기 등록 + 그 콜백이 update 호출
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    intervalSpy.mock.calls[0][0]();
    expect(reg.update).toHaveBeenCalledTimes(1);

    // 앱을 다시 볼 때(visible) update
    docListeners.visibilitychange();
    expect(reg.update).toHaveBeenCalledTimes(2);

    // 새 서비스워커 제어권 → 새로고침 (두 번 와도 1회)
    swListeners.controllerchange();
    swListeners.controllerchange();
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("숨김 상태에서는 다시볼때 update 를 하지 않는다", async () => {
    const { nav, doc, win, reg, docListeners } = makeEnv();
    vi.spyOn(globalThis, "setInterval").mockImplementation(() => 1);
    await setupAutoUpdate({ nav, doc, win });
    doc.visibilityState = "hidden";
    docListeners.visibilitychange();
    expect(reg.update).not.toHaveBeenCalled();
  });
});
