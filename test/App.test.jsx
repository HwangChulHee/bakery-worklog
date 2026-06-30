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

  it("휴무 버튼으로 기존 기록을 지운다", () => {
    localStorage.setItem(
      "entries",
      JSON.stringify({ "2026-6-2": { start: "08:30", end: "13:30" } })
    );
    render(<App />);
    expect(document.body.textContent).toContain("6/2(화)");
    fireEvent.click(screen.getByRole("button", { name: /^6월 2일/ }));
    fireEvent.click(screen.getByRole("button", { name: "휴무" }));
    expect(document.body.textContent).not.toContain("6/2(화)");
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
