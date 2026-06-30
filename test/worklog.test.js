import { describe, it, expect } from "vitest";
import {
  DOW,
  keyOf,
  getWeeks,
  weekSum,
  monthTotal,
  buildSummary,
  weeklyBreakdown,
} from "../src/worklog";

describe("keyOf", () => {
  it("month 는 0-indexed, 키는 1-indexed 월", () => {
    expect(keyOf(2026, 5, 1)).toBe("2026-6-1");
    expect(keyOf(2026, 0, 15)).toBe("2026-1-15");
  });
});

describe("getWeeks (2026년 6월)", () => {
  const weeks = getWeeks(2026, 5); // 6월, 1일=월요일, 30일

  it("모든 주는 길이 7", () => {
    for (const w of weeks) expect(w).toHaveLength(7);
  });
  it("첫 주는 일요일 자리에 null (1일이 월요일)", () => {
    expect(weeks[0][0]).toBeNull();
    expect(weeks[0][1]).toBe(1);
  });
  it("null 을 제외하면 1~30 이 순서대로", () => {
    const days = weeks.flat().filter((d) => d !== null);
    expect(days).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });
  it("마지막 칸들은 null 로 채워 7의 배수", () => {
    const flat = weeks.flat();
    expect(flat.length % 7).toBe(0);
  });
});

describe("getWeeks (2026년 2월 - 1일이 일요일)", () => {
  it("일요일 시작이면 첫 칸이 1일", () => {
    expect(new Date(2026, 1, 1).getDay()).toBe(0); // 확인: 일요일
    const weeks = getWeeks(2026, 1);
    expect(weeks[0][0]).toBe(1);
  });
});

describe("weekSum / monthTotal", () => {
  const entries = {
    "2026-6-1": { start: "08:30", end: "13:30" }, // 5h
    "2026-6-2": { start: "08:30", end: "13:00" }, // 4.5h
    "2026-6-8": { start: "08:30", end: "14:00" }, // 5.5h
  };
  const weeks = getWeeks(2026, 5);

  it("주간 합계", () => {
    expect(weekSum(entries, 2026, 5, weeks[0])).toBe(9.5); // 1,2일
    expect(weekSum(entries, 2026, 5, weeks[1])).toBe(5.5); // 8일
  });
  it("월 합계는 모든 주의 합", () => {
    expect(monthTotal(entries, 2026, 5)).toBe(15);
  });
  it("기록 없으면 0", () => {
    expect(monthTotal({}, 2026, 5)).toBe(0);
  });
});

describe("buildSummary (어머니 형식)", () => {
  const entries = {
    "2026-6-1": { start: "08:30", end: "13:30" }, // 월 5h
    "2026-6-2": { start: "08:30", end: "13:00" }, // 화 4.5h
    "2026-6-8": { start: "08:30", end: "14:00" }, // 월 5.5h
  };

  it("정확한 전체 텍스트", () => {
    const text = buildSummary({
      entries,
      year: 2026,
      month: 5,
      account: "우리은행(01076004597)",
    });
    expect(text).toBe(
      [
        "6월 근무시간",
        "",
        "6/1(월) 8:30~1:30(5h)",
        "6/2(화) 8:30~1:00(4.5h)",
        "=>9.5h",
        "",
        "6/8(월) 8:30~2:00(5.5h)",
        "=>5.5h",
        "",
        "==>총근무시간(15h)",
        "==>우리은행(01076004597)",
      ].join("\n")
    );
  });

  it("기록 없는 주에는 소계(=>)가 없다", () => {
    const text = buildSummary({ entries, year: 2026, month: 5, account: "" });
    const arrows = text.split("\n").filter((l) => l === `=>${""}` || /^=>/.test(l));
    expect(arrows).toHaveLength(2); // 1주, 2주만
  });

  it("계좌가 비면 ==>계좌 줄이 없다", () => {
    const text = buildSummary({ entries, year: 2026, month: 5, account: "" });
    expect(text.endsWith("==>총근무시간(15h)")).toBe(true);
  });

  it("계좌 공백만 있으면 무시", () => {
    const text = buildSummary({ entries, year: 2026, month: 5, account: "   " });
    expect(text.includes("==>   ")).toBe(false);
    expect(text.endsWith("==>총근무시간(15h)")).toBe(true);
  });

  it("계좌 앞뒤 공백은 trim", () => {
    const text = buildSummary({
      entries,
      year: 2026,
      month: 5,
      account: "  카카오뱅크(123)  ",
    });
    expect(text.endsWith("==>카카오뱅크(123)")).toBe(true);
  });

  it("기록이 전혀 없어도 헤더/총합은 나온다", () => {
    const text = buildSummary({ entries: {}, year: 2026, month: 5, account: "" });
    expect(text).toBe(["6월 근무시간", "", "==>총근무시간(0h)"].join("\n"));
  });
});

describe("휴무(off) 처리", () => {
  const entries = {
    "2026-6-1": { start: "08:30", end: "13:30" }, // 근무 5h
    "2026-6-2": { off: true }, // 휴무
  };

  it("휴무는 시간 합계에 포함되지 않는다", () => {
    expect(monthTotal(entries, 2026, 5)).toBe(5);
    expect(weekSum(entries, 2026, 5, getWeeks(2026, 5)[0])).toBe(5);
  });

  it("휴무는 정리본에 표시되지 않는다", () => {
    const text = buildSummary({ entries, year: 2026, month: 5, account: "" });
    expect(text).toContain("6/1(월) 8:30~1:30(5h)");
    expect(text).not.toContain("6/2");
    expect(text.endsWith("==>총근무시간(5h)")).toBe(true);
  });
});

describe("weeklyBreakdown", () => {
  it("주별 일일 시간 배열과 합계 (기록 있는 주만)", () => {
    const entries = {
      "2026-6-1": { start: "08:30", end: "13:30" }, // 5
      "2026-6-2": { start: "08:30", end: "13:00" }, // 4.5
      "2026-6-8": { start: "08:30", end: "14:00" }, // 5.5
    };
    expect(weeklyBreakdown(entries, 2026, 5, 0)).toEqual([
      { days: [{ d: 1, dow: "월", hours: 5, memo: "" }, { d: 2, dow: "화", hours: 4.5, memo: "" }],
        offs: [], missing: [], total: 9.5, hrs: [5, 4.5] },
      { days: [{ d: 8, dow: "월", hours: 5.5, memo: "" }], offs: [], missing: [], total: 5.5, hrs: [5.5] },
    ]);
  });
  it("휴무는 offs 로 분리하고(메모 포함) 합계에서 제외, 일한 주만 포함", () => {
    const entries = {
      "2026-6-1": { off: true, memo: "병원" },
      "2026-6-2": { start: "08:30", end: "13:30" },
    };
    expect(weeklyBreakdown(entries, 2026, 5, 0)).toEqual([
      { days: [{ d: 2, dow: "화", hours: 5, memo: "" }],
        offs: [{ d: 1, dow: "월", memo: "병원" }], missing: [], total: 5, hrs: [5] },
    ]);
  });
  it("월~금 중 기록 없는 날을 missing 으로 표시 (upToDay 이하만)", () => {
    const entries = { "2026-6-1": { start: "08:30", end: "13:30" } }; // 6/1(월) 5h
    // 6/2~6/5(화~금) 미입력, upToDay=5 → 화수목금 경고
    expect(weeklyBreakdown(entries, 2026, 5, 5)).toEqual([
      {
        days: [{ d: 1, dow: "월", hours: 5, memo: "" }],
        offs: [],
        missing: [{ d: 2, dow: "화" }, { d: 3, dow: "수" }, { d: 4, dow: "목" }, { d: 5, dow: "금" }],
        total: 5, hrs: [5],
      },
    ]);
  });
});

describe("DOW", () => {
  it("일요일부터 시작하는 7요일", () => {
    expect(DOW).toEqual(["일", "월", "화", "수", "목", "금", "토"]);
  });
});
