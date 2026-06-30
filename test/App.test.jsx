import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import App from "../src/App.jsx";

// 달력이 "오늘" 기준으로 그려지므로 시스템 시간을 2026-06-15 로 고정
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 5, 15, 9, 0, 0));
  localStorage.clear();
  // 대부분의 테스트는 로그인된 상태에서 시작 (password "" → 자동백업 꺼짐, 네트워크 없음)
  localStorage.setItem("auth", JSON.stringify({ name: "테스트", password: "" }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// 시작 스플래시(1.1s)를 건너뛰고 렌더 — 대부분의 테스트는 스플래시 이후 상태를 검증한다
function renderApp() {
  const utils = render(<App />);
  act(() => { vi.advanceTimersByTime(1200); });
  return utils;
}

describe("스플래시 / 자동 로그인", () => {
  it("시작 시 스플래시를 보여준 뒤 (auth 있으면) 앱으로 자동 진입", () => {
    render(<App />);
    // 스플래시 동안엔 달력/정리본 안 보임
    expect(screen.queryByText("정리본")).not.toBeInTheDocument();
    expect(screen.getByText("잠시만요…")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1200); });
    // auth 가 localStorage 에 있으므로 자동 로그인되어 앱 진입
    expect(screen.getByText("정리본")).toBeInTheDocument();
  });

  it("auth 가 없으면 스플래시 후 로그인 화면", () => {
    localStorage.removeItem("auth");
    render(<App />);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByPlaceholderText("이름")).toBeInTheDocument();
  });
});

describe("App 기본 렌더", () => {
  it("달력 화면과 설정 버튼, 정리본이 보인다", () => {
    renderApp();
    expect(screen.getByText("정리본")).toBeInTheDocument();
    expect(screen.getByText("6월 근무")).toBeInTheDocument();
    // 우상단 설정 버튼
    expect(screen.getByRole("button", { name: "설정" })).toBeInTheDocument();
    // 달력 화면에선 뒤로(달력) 버튼이 없다 (설정 화면에서만)
    expect(screen.queryByRole("button", { name: "달력" })).not.toBeInTheDocument();
  });

  it("기본 계좌가 정리본에 출력된다", () => {
    renderApp();
    expect(document.body.textContent).toContain("우리은행(01076004597)");
  });
});

describe("탭 전환 / 설정", () => {
  it("설정 탭에서 설정 항목들이 보인다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(screen.getByText("기본 출근시간")).toBeInTheDocument();
    expect(screen.getByText("기본 퇴근시간")).toBeInTheDocument();
    expect(screen.getByText("입금 계좌")).toBeInTheDocument();
    expect(screen.getByText("공휴일 표시")).toBeInTheDocument();
  });

  it("계좌 변경이 localStorage 와 정리본에 반영된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    const input = screen.getByPlaceholderText("입금 계좌");
    fireEvent.change(input, { target: { value: "카카오뱅크(99988)" } });
    expect(JSON.parse(localStorage.getItem("account"))).toBe("카카오뱅크(99988)");
    // 달력으로 돌아가 정리본 확인
    fireEvent.click(screen.getByRole("button", { name: "달력" }));
    expect(document.body.textContent).toContain("==>카카오뱅크(99988)");
  });

  it("기본 출근/퇴근시간 변경이 localStorage 에 저장된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.change(screen.getByLabelText("기본 출근시간 시"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("기본 출근시간 분"), { target: { value: "0" } });
    expect(JSON.parse(localStorage.getItem("defaultStart"))).toBe("09:00");
  });
});

describe("공휴일 표시", () => {
  it("기본적으로 현충일(6/6)이 달력에 표시된다", () => {
    renderApp();
    expect(screen.getByText("현충일")).toBeInTheDocument();
  });

  it("공휴일 표시를 끄면 사라지고 localStorage 에 저장된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    const toggle = screen.getByText("공휴일 표시").parentElement.querySelector("button");
    fireEvent.click(toggle);
    expect(JSON.parse(localStorage.getItem("showHolidays"))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "달력" }));
    expect(screen.queryByText("현충일")).not.toBeInTheDocument();
  });
});

describe("근무 입력 흐름", () => {
  it("날짜를 눌러 기본값으로 저장하면 정리본/합계/localStorage 에 반영", () => {
    renderApp();
    // 6/2 (화) 클릭 → 시트 열림
    fireEvent.click(screen.getByRole("button", { name: "6월 2일" }));
    // 기본 08:30~13:30 = 5h 로 저장
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));

    expect(document.body.textContent).toContain("6/2(화) 8:30~1:30(5h)");
    expect(document.body.textContent).toContain("총근무시간(5h)");
    const saved = JSON.parse(localStorage.getItem("entries"));
    expect(saved["2026-6-2"]).toEqual({ start: "08:30", end: "13:30" });
  });

  it("휴무로 표시하면 달력에 '휴무'가 뜨고 정리본/합계에서 제외된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "6월 2일" }));
    fireEvent.click(screen.getByRole("button", { name: /휴무/ })); // 휴무 토글
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));  // 저장
    // 시트가 닫히고 달력 셀에 '휴무' 표시
    expect(screen.getByText("휴무")).toBeInTheDocument();
    // 정리본에는 안 나옴
    expect(document.body.textContent).not.toContain("6/2(화)");
    // localStorage 에 off 로 저장
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-2"]).toEqual({ off: true });
  });

  it("삭제 누르면 확인 창에 대상 정보가 뜨고, 취소하면 유지된다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-2": { start: "08:30", end: "13:30" } }));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /^6월 2일/ }));
    fireEvent.click(screen.getByRole("button", { name: "기록 지우기" }));
    expect(screen.getByText("이 기록을 삭제할까요?")).toBeInTheDocument();
    expect(screen.getByText("8:30~1:30 (5h)")).toBeInTheDocument(); // 삭제 대상 정보
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByText("이 기록을 삭제할까요?")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-2"]).toBeTruthy();
  });

  it("기록 지우기로 휴무/근무 기록을 완전히 삭제한다", () => {
    localStorage.setItem(
      "entries",
      JSON.stringify({ "2026-6-2": { off: true } })
    );
    renderApp();
    expect(screen.getByText("휴무")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^6월 2일/ })); // aria-label "6월 2일 휴무"
    fireEvent.click(screen.getByRole("button", { name: "기록 지우기" })); // 지우기 링크
    fireEvent.click(screen.getByRole("button", { name: "삭제" })); // 확인 다이얼로그
    expect(screen.queryByText("휴무")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-2"]).toBeUndefined();
  });

  it("시/분 드롭다운으로 시간을 선택해 저장", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "6월 4일" })); // 목
    fireEvent.change(screen.getByLabelText("출근 시"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("출근 분"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-4"].start).toBe("09:00");
  });

  it("날짜에 메모를 남기면 저장되고 주간 보기에 표시된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "6월 16일" })); // 이번 주(화)
    fireEvent.change(screen.getByPlaceholderText("메모 (선택)"), { target: { value: "재고 정리" } });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-16"].memo).toBe("재고 정리");
    fireEvent.click(screen.getByRole("button", { name: "주간" }));
    expect(document.body.textContent).toContain("재고 정리");
  });

  it("퇴근시간을 바꿔 저장하면 반영된다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /^6월 3일/ })); // 6/3(수), 지방선거일이어도 입력 가능
    fireEvent.change(screen.getByLabelText("퇴근 시"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("퇴근 분"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(document.body.textContent).toContain("6/3(수) 8:30~2:00(5.5h)");
  });

  it("저장 버튼 없이 뒤로가기로 나가면 저장되지 않는다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "6월 4일" }));
    fireEvent.change(screen.getByLabelText("퇴근 시"), { target: { value: "14" } });
    // 저장 버튼을 누르지 않고 뒤로가기로 시트를 닫음 → 저장 안 됨
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(JSON.parse(localStorage.getItem("entries") || "{}")["2026-6-4"]).toBeUndefined();
  });
});

describe("localStorage 자동복원", () => {
  it("저장된 기록을 처음 렌더에서 불러온다", () => {
    localStorage.setItem(
      "entries",
      JSON.stringify({
        "2026-6-1": { start: "08:30", end: "13:30" },
        "2026-6-2": { start: "08:30", end: "13:00" },
      })
    );
    renderApp();
    expect(document.body.textContent).toContain("6/1(월) 8:30~1:30(5h)");
    expect(document.body.textContent).toContain("6/2(화) 8:30~1:00(4.5h)");
    expect(document.body.textContent).toContain("총근무시간(9.5h)");
  });
});

describe("주차별 계산", () => {
  it("검산식과 함께 그 주의 휴무 사유(메모)가 표시된다", () => {
    localStorage.setItem("entries", JSON.stringify({
      "2026-6-1": { start: "08:30", end: "13:30" },
      "2026-6-2": { start: "08:30", end: "13:00" },
      "2026-6-3": { off: true, memo: "병원" },
    }));
    renderApp();
    expect(screen.getByText("주차별 계산")).toBeInTheDocument();
    expect(document.body.textContent).toContain("5 + 4.5 = 9.5h"); // 검산식
    expect(document.body.textContent).toContain("6/3 (수)");       // 빠진 날(날짜순 나열)
    expect(document.body.textContent).toContain("병원");           // 사유 메모
    // 6/4(목)·6/5(금)은 미입력 → 경고 (오늘=6/15 이전)
    expect(document.body.textContent).toContain("입력안함");
    expect(document.body.textContent).toContain("6/4 (목)");
  });
});

describe("복사하기", () => {
  it("정리본 텍스트를 클립보드에 쓴다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "복사" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("==>총근무시간");
  });
});

describe("월 이동", () => {
  it("이전 달로 가면 5월 근무가 보인다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "◀" }));
    expect(screen.getByText("5월 근무")).toBeInTheDocument();
  });
});

describe("UX: 공유 / 되돌리기 / 오늘", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("공유 버튼이 Web Share 를 호출한다", () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "공유" }));
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].text).toContain("총근무시간");
    delete navigator.share;
  });

  it("기록 삭제 후 '되돌리기'로 복구된다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-2": { start: "08:30", end: "13:30" } }));
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /^6월 2일/ }));
    fireEvent.click(screen.getByRole("button", { name: "기록 지우기" })); // 지우기 링크
    fireEvent.click(screen.getByRole("button", { name: "삭제" })); // 확인 다이얼로그
    expect(document.body.textContent).not.toContain("6/2(화)");
    fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
    expect(document.body.textContent).toContain("6/2(화) 8:30~1:30(5h)");
  });

  it("'오늘' 버튼으로 이번 달로 돌아온다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "◀" })); // 5월로
    expect(screen.getByText("5월 근무")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /오늘로/ }));
    expect(screen.getByText("6월 근무")).toBeInTheDocument();
  });
});

describe("주간 보기", () => {
  it("주간으로 바꾸면 그 주 날짜와 근무시간을 보여준다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-15": { start: "08:30", end: "13:30" } }));
    renderApp(); // 시스템 시간 2026-06-15 (월)
    fireEvent.click(screen.getByRole("button", { name: "주간" }));
    expect(document.body.textContent).toContain("6/15"); // 그 주에 포함
    expect(document.body.textContent).toContain("8:30~1:30"); // 그날 근무시간
    expect(document.body.textContent).toContain("이번 주 총 근무");
  });

  it("주간 보기에서 날짜를 눌러 저장할 수 있다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "주간" }));
    fireEvent.click(screen.getByRole("button", { name: "6월 16일" })); // 6/16(화)
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-16"]).toEqual({ start: "08:30", end: "13:30" });
  });
});

describe("뒤로가기(Android)", () => {
  it("설정에서 뒤로가기 누르면 달력으로 돌아온다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(screen.getByText("기본 출근시간")).toBeInTheDocument();
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByText("정리본")).toBeInTheDocument();
    expect(screen.queryByText("기본 출근시간")).not.toBeInTheDocument();
  });

  it("달력 홈에서 뒤로가기 한 번 → 종료 안내가 뜬다", () => {
    renderApp();
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByText("한 번 더 누르면 종료됩니다")).toBeInTheDocument();
    // 아직 앱은 그대로 (정리본 보임)
    expect(screen.getByText("정리본")).toBeInTheDocument();
  });

  it("입력 시트에서 뒤로가기 누르면 시트가 닫힌다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "6월 2일" }));
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.queryByRole("button", { name: /저장/ })).not.toBeInTheDocument();
    expect(screen.getByText("정리본")).toBeInTheDocument();
  });
});

describe("월간↔주간 기준일 동기화", () => {
  it("월간에서 다음 달로 이동 후 주간으로 바꾸면 그 달의 주가 보인다", () => {
    renderApp(); // 2026-06
    fireEvent.click(screen.getByRole("button", { name: "▶" })); // 7월
    expect(screen.getByText("7월 근무")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "주간" }));
    expect(document.body.textContent).toContain("7/"); // 주 범위가 7월
  });

  it("주간에서 여러 주 이동 후 월간으로 바꾸면 해당 달이 보인다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "주간" }));
    const next = screen.getByRole("button", { name: "▶" });
    fireEvent.click(next); fireEvent.click(next); fireEvent.click(next); // 6/15 → 7월로
    fireEvent.click(screen.getByRole("button", { name: "월간" }));
    expect(screen.getByText("7월 근무")).toBeInTheDocument();
  });
});

describe("오늘 상태 배너", () => {
  it("오늘 기록이 없으면 '아직 입력 안 했어요'를 보여준다", () => {
    renderApp(); // 2026-06-15 (월)
    expect(screen.getByText("오늘 · 6/15 (월)")).toBeInTheDocument();
    expect(screen.getByText("아직 입력 안 했어요")).toBeInTheDocument();
  });
  it("오늘 근무를 입력했으면 시간/시각을 보여준다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-15": { start: "08:30", end: "13:30" } }));
    renderApp();
    expect(screen.getByText("5h · 8:30~1:30")).toBeInTheDocument();
  });
  it("오늘이 휴무면 휴무로 표시한다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-15": { off: true } }));
    renderApp();
    expect(screen.getAllByText("휴무").length).toBeGreaterThan(0);
  });
  it("오늘이 주말(기록 없음)이면 '주말'로 표시한다", () => {
    vi.setSystemTime(new Date(2026, 5, 14, 9, 0, 0)); // 6/14 일요일
    renderApp();
    expect(screen.getByText("주말")).toBeInTheDocument();
    expect(screen.queryByText("아직 입력 안 했어요")).not.toBeInTheDocument();
  });
  it("배너를 누르면 오늘 입력창이 열린다", () => {
    renderApp();
    fireEvent.click(screen.getByText("아직 입력 안 했어요"));
    expect(screen.getByText("6월 15일 (월)")).toBeInTheDocument(); // 입력 시트 헤더
    expect(screen.getByRole("button", { name: /저장/ })).toBeInTheDocument();
  });
});

describe("입력 엣지 케이스 (검산 경고)", () => {
  it("토요일 근무는 근무로 표시되고 '입력안함' 경고 대상이 아니다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-13": { start: "08:30", end: "13:30" } })); // 6/13(토)
    renderApp(); // 오늘 2026-06-15
    expect(document.body.textContent).toContain("6/13 (토)🍞 5h"); // 토요일=근무로 표시
    expect(document.body.textContent).toContain("입력안함");       // 같은 주 평일들은 경고
  });

  it("공휴일 평일(6/3 지방선거일)도 미입력이면 경고한다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-1": { start: "08:30", end: "13:30" } }));
    renderApp();
    expect(document.body.textContent).toContain("6/3 (수)"); // 공휴일도 근무 많아 경고 포함
    expect(document.body.textContent).toContain("6/2 (화)");
  });

  it("이번 달 아직 안 온 평일은 경고하지 않는다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-6-15": { start: "08:30", end: "13:30" } })); // 오늘
    renderApp();
    expect(document.body.textContent).not.toContain("입력안함"); // 6/16~ 미래는 경고 X
  });

  it("같은 근무시간이 반복되면 검산식을 곱하기로 압축한다", () => {
    localStorage.setItem("entries", JSON.stringify({
      "2026-6-1": { start: "08:30", end: "13:00" }, // 4.5
      "2026-6-2": { start: "08:30", end: "13:00" }, // 4.5
      "2026-6-3": { start: "08:30", end: "13:00" }, // 4.5
    }));
    renderApp();
    expect(document.body.textContent).toContain("4.5×3 = 13.5h");
  });

  it("지난 달은 평일 공백을 모두 경고한다", () => {
    localStorage.setItem("entries", JSON.stringify({ "2026-5-4": { start: "08:30", end: "13:30" } })); // 5/4(월)
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "◀" })); // 5월로 이동
    expect(screen.getByText("5월 근무")).toBeInTheDocument();
    expect(document.body.textContent).toContain("입력안함");
    expect(document.body.textContent).toContain("5/6 (수)"); // 5/5는 어린이날(공휴일)이라 제외됨
  });
});

describe("로그인 게이트", () => {
  it("로그인 안 된 상태면 로그인 화면이 뜨고 달력은 안 보인다", () => {
    localStorage.removeItem("auth");
    renderApp();
    expect(screen.getByPlaceholderText("이름")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("비밀번호")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "들어가기" })).toBeInTheDocument();
    expect(screen.queryByText("정리본")).not.toBeInTheDocument();
  });

  it("이름+비밀번호가 맞으면(서버 200) 앱으로 진입한다", async () => {
    localStorage.removeItem("auth");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: null }) }));
    renderApp();
    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "철희" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: "들어가기" }));

    expect(await screen.findByText("정리본")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("auth"))).toEqual({ name: "철희", password: "pw" });
  });

  it("로그인 시 클라우드 데이터를 불러와 채운다", async () => {
    localStorage.removeItem("auth");
    const data = { entries: { "2026-6-2": { start: "08:30", end: "13:30" } }, account: "복구은행(1)" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) }));
    renderApp();
    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "철희" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: "들어가기" }));

    expect(await screen.findByText("정리본")).toBeInTheDocument();
    expect(document.body.textContent).toContain("6/2(화)");
    expect(document.body.textContent).toContain("복구은행(1)");
  });

  it("비밀번호가 틀리면(401) 오류를 보여주고 진입 못 한다", async () => {
    localStorage.removeItem("auth");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ error: "비밀번호가 올바르지 않습니다" }),
    }));
    renderApp();
    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "철희" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "들어가기" }));

    expect(await screen.findByText("비밀번호가 올바르지 않습니다")).toBeInTheDocument();
    expect(screen.queryByText("정리본")).not.toBeInTheDocument();
  });

  it("서버 오류 시 '오프라인으로 시작'으로 진입할 수 있다", async () => {
    localStorage.removeItem("auth");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    renderApp();
    fireEvent.change(screen.getByPlaceholderText("이름"), { target: { value: "철희" } });
    fireEvent.change(screen.getByPlaceholderText("비밀번호"), { target: { value: "pw" } });
    fireEvent.click(screen.getByRole("button", { name: "들어가기" }));

    const offlineBtn = await screen.findByRole("button", { name: "오프라인으로 시작" });
    fireEvent.click(offlineBtn);
    expect(await screen.findByText("정리본")).toBeInTheDocument();
  });
});

describe("클라우드 백업 / 로그아웃", () => {
  it("'지금 백업'이 로그인 계정으로 서버에 전송", async () => {
    localStorage.setItem("auth", JSON.stringify({ name: "철희", password: "mypw" }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "지금 백업" }));

    expect(await screen.findByText("백업 완료 ✓")).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.name).toBe("철희");
    expect(body.password).toBe("mypw");
  });

  it("복구는 비밀번호를 다시 입력받아 덮어쓴다", async () => {
    localStorage.setItem("auth", JSON.stringify({ name: "철희", password: "mypw" }));
    const data = { entries: { "2026-6-2": { start: "08:30", end: "13:30" } }, account: "복구은행(1)" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) }));
    vi.spyOn(window, "prompt").mockReturnValue("mypw");

    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "복구" }));

    expect(await screen.findByText("복구 완료 ✓")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "달력" }));
    expect(document.body.textContent).toContain("6/2(화)");
    expect(document.body.textContent).toContain("복구은행(1)");
  });

  it("로그아웃하면 로그인 화면으로 돌아간다", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(screen.getByPlaceholderText("이름")).toBeInTheDocument();
    expect(screen.queryByText("정리본")).not.toBeInTheDocument();
  });
});
