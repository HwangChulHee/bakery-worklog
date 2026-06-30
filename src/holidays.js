import Holidays from "date-holidays";

const hd = new Holidays("KR");
// 공휴일 이름을 한국어로. 일부 환경에서 영어로 나오면 아래 EN2KO 매핑으로 보정.
try { hd.setLanguages("ko"); } catch { /* 일부 버전 미지원 */ }

// 일회성 임시공휴일만 수동으로 (date-holidays 가 못 잡는 것)
const EXTRA = { "2026-06-03": "지방선거일" };

// date-holidays 이름이 영어로 나올 때를 대비한 보정 테이블
const EN2KO = {
  "New Year's Day": "신정",
  "Korean New Year": "설날",
  "Seollal": "설날",
  "Independence Movement Day": "3·1절",
  "Children's Day": "어린이날",
  "Buddha's Birthday": "석가탄신일",
  "Memorial Day": "현충일",
  "Constitution Day": "제헌절",
  "Liberation Day": "광복절",
  "Korean Thanksgiving": "추석",
  "Chuseok": "추석",
  "National Foundation Day": "개천절",
  "Hangul Day": "한글날",
  "Christmas Day": "기독탄신일",
};

const hasHangul = (s) => /[가-힣]/.test(s);
const toKo = (name) => (hasHangul(name) ? name : EN2KO[name] || name);

const cache = {};
function holidayMap(year) {
  if (cache[year]) return cache[year];
  const map = { ...EXTRA };
  for (const h of hd.getHolidays(year)) {
    if (h.type !== "public") continue;
    map[h.date.slice(0, 10)] = toKo(h.name);
  }
  return (cache[year] = map);
}

export function holidayName(y, m, d) {
  const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return holidayMap(y)[key] || null;
}
