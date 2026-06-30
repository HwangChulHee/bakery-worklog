// 클라우드 백업 클라이언트 — 서버리스 /api/backup 호출
const ENDPOINT = "/api/backup";

async function errorFrom(res, fallback) {
  let msg = fallback;
  try {
    const j = await res.json();
    if (j && j.error) msg = j.error;
  } catch { /* 본문 없음 */ }
  return new Error(msg);
}

// 현재 상태(data)를 클라우드에 저장
export async function backupToCloud(password, data) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, data }),
  });
  if (!res.ok) throw await errorFrom(res, `백업 실패 (${res.status})`);
  return res.json();
}

// 클라우드에서 데이터를 불러옴 (없으면 null)
export async function restoreFromCloud(password) {
  const res = await fetch(`${ENDPOINT}?password=${encodeURIComponent(password)}`);
  if (!res.ok) throw await errorFrom(res, `복구 실패 (${res.status})`);
  const json = await res.json();
  return json.data ?? null;
}
