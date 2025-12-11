import { supabase } from "@/lib/supabase";

export async function logAudit({
  action,
  targetUserId,
  targetRecordId,
  payload = {},
}: {
  action: string;
  targetUserId?: string;
  targetRecordId?: string;
  payload?: Record<string, unknown>;
}) {
  // 현재 로그인한 관리자 세션
  const session = await supabase.auth.getSession();
  const adminId = session.data.session?.user?.id;

  if (!adminId) return; // 안전장치

  await supabase.from("audit_logs").insert({
    action,
    target_user_id: targetUserId ?? null,
    target_record_id: targetRecordId ?? null,
    actor_admin_id: adminId,   // 관리자 ID 기록
    payload,
  });
}
