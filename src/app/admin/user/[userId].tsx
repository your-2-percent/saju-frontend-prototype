"use client";

import { useAdminUserDetailInput } from "@/app/admin/user/detail/input/useAdminUserDetailInput";
import { useAdminUserDetailCalc } from "@/app/admin/user/detail/calc/useAdminUserDetailCalc";
import { useAdminUserDetailSave } from "@/app/admin/user/detail/save/useAdminUserDetailSave";
import type { MyeongsikRow } from "@/app/admin/user/detail/model/types";

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  const input = useAdminUserDetailInput();
  const calc = useAdminUserDetailCalc(input.profile);
  const save = useAdminUserDetailSave({
    userId,
    profile: input.profile,
    setProfile: input.setProfile,
    setMyeongsikList: input.setMyeongsikList,
    setSaving: input.setSaving,
  });

  return (
    <div className="p-6 text-white">
      <button className="mb-4 underline cursor-pointer" onClick={() => save.goTo("/admin/user")}>
        사용자 목록으로 돌아가기
      </button>

      <h1 className="text-2xl font-bold mb-4">사용자 정보</h1>

      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">프로필</h2>
            <button
              className="px-3 py-1 bg-blue-700 text-xs rounded cursor-pointer"
              onClick={() => save.handleViewAsUser()}
            >
              사용자로 보기(읽기 전용)
            </button>
          </div>
        </div>

        {!calc.hasProfile && (
          <button
            onClick={save.handleCreateProfile}
            className="px-3 py-2 bg-blue-600 rounded cursor-pointer"
            disabled={input.saving}
          >
            프로필 생성하기
          </button>
        )}

        {calc.hasProfile && input.profile && (
          <div className="space-y-3">
            <div>
              <label>이름</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={input.profile.name ?? ""}
                onChange={(e) => input.setProfile({ ...input.profile, name: e.target.value })}
              />
            </div>

            <div>
              <label>닉네임</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={input.profile.nickname ?? ""}
                onChange={(e) => input.setProfile({ ...input.profile, nickname: e.target.value })}
              />
            </div>

            <div>
              <label>Email</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={input.profile.email ?? ""}
                onChange={(e) => input.setProfile({ ...input.profile, email: e.target.value })}
              />
            </div>

            <div>
              <label>관리자 메모</label>
              <textarea
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                rows={3}
                value={input.profile.mgr_memo ?? ""}
                onChange={(e) => input.setProfile({ ...input.profile, mgr_memo: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={save.handleSaveProfile}
                className="px-3 py-2 bg-green-600 rounded cursor-pointer text-xs"
                disabled={input.saving}
              >
                저장하기
              </button>

              {calc.isDisabled && (
                <button
                  onClick={save.handleRestoreAccount}
                  className="px-3 py-2 bg-blue-600 rounded cursor-pointer text-xs"
                  disabled={input.saving}
                >
                  활성화 + 계정복구
                </button>
              )}

              <button
                onClick={save.toggleDisable}
                className={`px-3 py-2 rounded cursor-pointer text-xs ${
                  calc.isDisabled ? "bg-yellow-600" : "bg-gray-600"
                }`}
              >
                {calc.isDisabled ? "계정 활성화" : "계정 비활성화"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">명식 목록</h2>
          <button
            className="px-3 py-2 bg-blue-700 rounded text-xs cursor-pointer"
            onClick={save.handleRestoreAllMyeongsik}
            disabled={input.saving}
          >
            명식 전체 복구
          </button>
        </div>

        {input.myeongsikList.map((m: MyeongsikRow) => (
          <div key={m.id} className="p-3 bg-neutral-800 border border-neutral-700 rounded mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.name || "(no name)"}</div>
                <div className="text-sm text-neutral-400">
                  Birth: {m.birth_json?.birthDay ?? "-"} ·{" "}
                  {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                </div>
              </div>

              {/* ✅ 여기가 원래 버튼 영역인데, 주석만 있으면 아무것도 안 뜸 */}
              <div className="flex gap-2">
                <button
                  className="text-nowrap px-2 py-1 border border-emerald-500 text-emerald-100 rounded cursor-pointer text-xs"
                  onClick={() => save.handleRestoreMyeongsik(m.id)}
                  disabled={input.saving}
                >
                  이 명식 복구
                </button>
              </div>
            </div>
          </div>
        ))}

        {input.myeongsikList.length === 0 && <div className="text-neutral-400">명식이 없습니다.</div>}
      </div>
    </div>
  );
}
