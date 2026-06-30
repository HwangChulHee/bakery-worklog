// 클라우드 백업용 서버리스 함수 (Vercel)
// - 비밀번호(BACKUP_PASSWORD)를 서버에서 확인 → 화면 코드에 노출 안 됨
// - 저장소: Upstash Redis (Vercel Storage 에서 무료로 연결)
//   GET  /api/backup?password=...      → 저장된 데이터 반환 { data }
//   POST /api/backup { password, data } → 데이터 저장 { ok: true }
import { Redis } from "@upstash/redis";

const KEY = "worklog:default";

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  const expected = process.env.BACKUP_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: "서버에 BACKUP_PASSWORD 가 설정되지 않았습니다" });
  }

  const body = typeof req.body === "string" && req.body ? JSON.parse(req.body) : req.body || {};
  const password =
    req.headers["x-backup-password"] || (req.query && req.query.password) || body.password;

  if (password !== expected) {
    return res.status(401).json({ error: "비밀번호가 올바르지 않습니다" });
  }

  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({ error: "저장소(Redis)가 연결되지 않았습니다" });
  }

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
