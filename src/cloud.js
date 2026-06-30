// 클라우드 백업 클라이언트 — 서버리스 /api/backup 호출
// name = 백업 구분용 사용자 이름, password = 공유 비밀번호(서버 검증)
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
export async function backupToCloud(name, password, data) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password, data }),
  });
  if (!res.ok) throw await errorFrom(res, `백업 실패 (${res.status})`);
  return res.json();
}

// 클라우드에서 데이터를 불러옴 (인증 + 복구 겸용, 없으면 null)
export async function restoreFromCloud(name, password) {
  const q = `name=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(`${ENDPOINT}?${q}`);
  if (!res.ok) throw await errorFrom(res, `복구 실패 (${res.status})`);
  const json = await res.json();
  return json.data ?? null;
}
