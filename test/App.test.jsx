import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "../src/App.jsx";

// 달력이 "오늘" 기준으로 그려지므로 시스템 시간을 2026-06-15 로 고정
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 5, 15, 9, 0, 0));
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("App 기본 렌더", () => {
  it("달력 화면과 하단 탭, 정리본이 보인다", () => {
    render(<App />);
    expect(screen.getByText("정리본")).toBeInTheDocument();
    expect(screen.getByText("6월 근무")).toBeInTheDocument();
    // 하단 탭바
    expect(screen.getByRole("button", { name: "달력" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "설정" })).toBeInTheDocument();
  });

  it("기본 계좌가 정리본에 출력된다", () => {
    render(<App />);
    expect(document.body.textContent).toContain("우리은행(01076004597)");
  });
});

describe("탭 전환 / 설정", () => {
  it("설정 탭에서 설정 항목들이 보인다", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    expect(screen.getByText("기본 출근시간")).toBeInTheDocument();
    expect(screen.getByText("기본 퇴근시간")).toBeInTheDocument();
    expect(screen.getByText("입금 계좌")).toBeInTheDocument();
    expect(screen.getByText("공휴일 표시")).toBeInTheDocument();
  });

  it("계좌 변경이 localStorage 와 정리본에 반영된다", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    const input = screen.getByPlaceholderText("입금 계좌");
    fireEvent.change(input, { target: { value: "카카오뱅크(99988)" } });
    expect(JSON.parse(localStorage.getItem("account"))).toBe("카카오뱅크(99988)");
    // 달력으로 돌아가 정리본 확인
    fireEvent.click(screen.getByRole("button", { name: "달력" }));
    expect(document.body.textContent).toContain("==>카카오뱅크(99988)");
  });

  it("기본 출근/퇴근시간 변경이 localStorage 에 저장된다", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    // 설정 화면의 time input 두 개 (출근/퇴근)
    const start = document.querySelector('input[type="time"]');
    fireEvent.change(start, { target: { value: "09:00" } });
    expect(JSON.parse(localStorage.getItem("defaultStart"))).toBe("09:00");
  });
});

describe("공휴일 표시", () => {
  it("기본적으로 현충일(6/6)이 달력에 표시된다", () => {
    render(<App />);
    expect(screen.getByText("현충일")).toBeInTheDocument();
  });

  it("공휴일 표시를 끄면 사라지고 localStorage 에 저장된다", () => {
    render(<App />);
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
    render(<App />);
    // 6/2 (화) 클릭 → 시트 열림
    fireEvent.click(screen.getByRole("button", { name: "6월 2일" }));
    // 기본 08:30~13:30 = 5h 로 저장
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(document.body.textContent).toContain("6/2(화) 8:30~1:30(5h)");
    expect(document.body.textContent).toContain("총근무시간(5h)");
    const saved = JSON.parse(localStorage.getItem("entries"));
    expect(saved["2026-6-2"]).toEqual({ start: "08:30", end: "13:30" });
  });

  it("휴무로 표시하면 달력에 '휴무'가 뜨고 정리본/합계에서 제외된다", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "6월 2일" }));
    fireEvent.click(screen.getByRole("button", { name: "휴무" }));
    // 시트가 닫히고 달력 셀에 '휴무' 표시
    expect(screen.getByText("휴무")).toBeInTheDocument();
    // 정리본에는 안 나옴
    expect(document.body.textContent).not.toContain("6/2(화)");
    // localStorage 에 off 로 저장
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-2"]).toEqual({ off: true });
  });

  it("기록 지우기로 휴무/근무 기록을 완전히 삭제한다", () => {
    localStorage.setItem(
      "entries",
      JSON.stringify({ "2026-6-2": { off: true } })
    );
    render(<App />);
    expect(screen.getByText("휴무")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^6월 2일/ })); // aria-label "6월 2일 휴무"
    fireEvent.click(screen.getByRole("button", { name: "기록 지우기" }));
    expect(screen.queryByText("휴무")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("entries"))["2026-6-2"]).toBeUndefined();
  });

  it("자주 쓰는 퇴근시간 버튼으로 시간을 바꿔 저장", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /^6월 3일/ })); // 6/3(수), 지방선거일이어도 입력 가능
    // 시트 안에서 14:00 → 표기 "2:00" 버튼
    const sheetBtn = screen.getByRole("button", { name: "2:00" });
    fireEvent.click(sheetBtn);
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(document.body.textContent).toContain("6/3(수) 8:30~2:00(5.5h)");
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
    render(<App />);
    expect(document.body.textContent).toContain("6/1(월) 8:30~1:30(5h)");
    expect(document.body.textContent).toContain("6/2(화) 8:30~1:00(4.5h)");
    expect(document.body.textContent).toContain("총근무시간(9.5h)");
  });
});

describe("복사하기", () => {
  it("정리본 텍스트를 클립보드에 쓴다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "복사하기" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("==>총근무시간");
  });
});

describe("월 이동", () => {
  it("이전 달로 가면 5월 근무가 보인다", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "◀" }));
    expect(screen.getByText("5월 근무")).toBeInTheDocument();
  });
});

describe("클라우드 백업 UI", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("'지금 백업'이 서버로 전송하고 완료 표시", async () => {
    localStorage.setItem("backupPassword", JSON.stringify("mypw"));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "지금 백업" }));

    expect(await screen.findByText("백업 완료 ✓")).toBeInTheDocument();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/backup");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body).password).toBe("mypw");
  });

  it("비밀번호 없이 백업하면 오류 안내", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "지금 백업" }));
    expect(screen.getByText("오류: 비밀번호를 입력하세요")).toBeInTheDocument();
  });

  it("복구하면 클라우드 데이터로 채워진다", async () => {
    localStorage.setItem("backupPassword", JSON.stringify("mypw"));
    const data = {
      entries: { "2026-6-2": { start: "08:30", end: "13:30" } },
      account: "복구은행(1)",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "설정" }));
    fireEvent.click(screen.getByRole("button", { name: "복구" }));

    expect(await screen.findByText("복구 완료 ✓")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "달력" }));
    expect(document.body.textContent).toContain("6/2(화)");
    expect(document.body.textContent).toContain("복구은행(1)");
  });
});
