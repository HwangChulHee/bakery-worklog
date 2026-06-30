// 클라우드 백업용 서버리스 함수 (Vercel)
// - 허용된 사용자(AUTH_USERS)만 로그인/백업 가능 — 이름+비밀번호를 서버에서 확인
// - 저장소: Upstash Redis (Vercel Storage 에서 무료로 연결)
//   GET  /api/backup?name=..&password=..      → 저장된 데이터 반환 { data }
//   POST /api/backup { name, password, data } → 데이터 저장 { ok: true }
//
// 환경변수 AUTH_USERS 형식: "이름1:비번1,이름2:비번2"  (이름/비번에 : , 는 사용 금지)
import { Redis } from "@upstash/redis";

// 허용된 사용자 목록 파싱 → { 이름(소문자): 비번 }
function authorizedUsers() {
  const map = {};
  for (const pair of String(process.env.AUTH_USERS || "").split(",")) {
    const i = pair.indexOf(":");
    if (i === -1) continue;
    const name = pair.slice(0, i).trim().toLowerCase();
    const pw = pair.slice(i + 1).trim();
    if (name) map[name] = pw;
  }
  return map;
}

// 이름별로 저장소 키 분리 (이름이 곧 백업 구분자)
function keyFor(name) {
  const safe = String(name || "default").trim().toLowerCase().slice(0, 64) || "default";
  return `worklog:${safe}`;
}

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  const users = authorizedUsers();
  if (Object.keys(users).length === 0) {
    return res.status(500).json({ error: "서버에 AUTH_USERS 가 설정되지 않았습니다" });
  }

  const body = typeof req.body === "string" && req.body ? JSON.parse(req.body) : req.body || {};
  const password =
    req.headers["x-backup-password"] || (req.query && req.query.password) || body.password;
  const name = (req.query && req.query.name) || body.name;

  const expected = users[String(name || "").trim().toLowerCase()];
  if (expected === undefined || password !== expected) {
    return res.status(401).json({ error: "이름 또는 비밀번호가 올바르지 않습니다" });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({ error: "저장소(Redis)가 연결되지 않았습니다" });
  }

  const KEY = keyFor(name);
  try {
    if (req.method === "GET") {
      const data = await redis.get(KEY);
      return res.status(200).json({ data: data ?? null });
    }
    if (req.method === "POST") {
      await redis.set(KEY, body.data ?? null);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: "허용되지 않은 메서드" });
  } catch (e) {
    return res.status(500).json({ error: `저장소 오류: ${e.message}` });
  }
}
