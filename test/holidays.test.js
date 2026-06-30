import { describe, it, expect } from "vitest";
import { holidayName } from "../src/holidays";

describe("holidayName (date-holidays 기반)", () => {
  it("주요 공휴일을 한국어 이름으로 반환 (2026)", () => {
    expect(holidayName(2026, 0, 1)).toBe("신정"); // 1/1
    expect(holidayName(2026, 2, 1)).toBe("3·1절"); // 3/1
    expect(holidayName(2026, 4, 5)).toBe("어린이날"); // 5/5
    expect(holidayName(2026, 5, 6)).toBe("현충일"); // 6/6
    expect(holidayName(2026, 7, 15)).toBe("광복절"); // 8/15
    expect(holidayName(2026, 11, 25)).toBe("기독탄신일"); // 12/25
  });

  it("EXTRA 수동 임시공휴일 (2026 지방선거일)", () => {
    expect(holidayName(2026, 5, 3)).toBe("지방선거일"); // 6/3
  });

  it("공휴일이 아닌 날은 null", () => {
    expect(holidayName(2026, 5, 15)).toBeNull(); // 평범한 6/15
    expect(holidayName(2026, 0, 2)).toBeNull(); // 1/2
  });

  it("미래 연도도 하드코딩 없이 자동 계산", () => {
    expect(holidayName(2030, 0, 1)).toBe("신정");
    expect(holidayName(2031, 2, 1)).toBe("3·1절");
  });

  it("반환되는 이름은 한글을 포함 (영어로 새지 않음)", () => {
    const name = holidayName(2026, 0, 1);
    expect(name).toMatch(/[가-힣]/);
  });
});
