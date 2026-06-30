import { describe, it, expect } from "vitest";
import { pad, toMin, fmtClock, fmtHours, hoursOf } from "../src/time";

describe("pad", () => {
  it("한 자리 수는 0으로 채운다", () => {
    expect(pad(5)).toBe("05");
    expect(pad(0)).toBe("00");
  });
  it("두 자리 수는 그대로", () => {
    expect(pad(30)).toBe("30");
    expect(pad(12)).toBe("12");
  });
});

describe("toMin", () => {
  it("HH:MM 을 분으로 환산", () => {
    expect(toMin("00:00")).toBe(0);
    expect(toMin("08:30")).toBe(510);
    expect(toMin("13:30")).toBe(810);
    expect(toMin("23:59")).toBe(1439);
  });
});

describe("fmtClock", () => {
  it("오전 시각은 0 패딩 없이 시 + 0 패딩 분", () => {
    expect(fmtClock("08:30")).toBe("8:30");
    expect(fmtClock("09:05")).toBe("9:05");
    expect(fmtClock("00:30")).toBe("0:30");
  });
  it("정오는 12 그대로", () => {
    expect(fmtClock("12:00")).toBe("12:00");
    expect(fmtClock("12:30")).toBe("12:30");
  });
  it("오후는 12를 뺀다", () => {
    expect(fmtClock("13:00")).toBe("1:00");
    expect(fmtClock("13:30")).toBe("1:30");
    expect(fmtClock("14:30")).toBe("2:30");
    expect(fmtClock("23:00")).toBe("11:00");
  });
});

describe("fmtHours", () => {
  it("정수는 소수점 없이", () => {
    expect(fmtHours(5)).toBe("5h");
    expect(fmtHours(0)).toBe("0h");
    expect(fmtHours(24)).toBe("24h");
  });
  it("소수는 한 자리", () => {
    expect(fmtHours(4.5)).toBe("4.5h");
    expect(fmtHours(5.5)).toBe("5.5h");
    expect(fmtHours(109.5)).toBe("109.5h");
  });
});

describe("hoursOf", () => {
  it("단순 경과시간 (휴게 공제 없음)", () => {
    expect(hoursOf({ start: "08:30", end: "13:30" })).toBe(5);
    expect(hoursOf({ start: "08:30", end: "13:00" })).toBe(4.5);
    expect(hoursOf({ start: "08:30", end: "14:00" })).toBe(5.5);
  });
  it("같은 시각이면 0", () => {
    expect(hoursOf({ start: "08:30", end: "08:30" })).toBe(0);
  });
  it("퇴근이 출근보다 빠르면 음수 대신 0", () => {
    expect(hoursOf({ start: "13:30", end: "08:30" })).toBe(0);
  });
});
