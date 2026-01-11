// components/SajuList.tsx
"use client";

import { useEffect } from "react";
import { useSajuStore } from "@/stores/sajuStore";
import type { MyeongsikRow } from "@/lib/database.types";

export default function SajuList() {
  const { list, setList, remove, select, selectedId } = useSajuStore();

  useEffect(() => {
    const fetchList = async () => {
      const res = await fetch("/api/saju");
      if (!res.ok) {
        setList([]);
        return;
      }
      const data = (await res.json()) as MyeongsikRow[];
      setList(data);
    };

    void fetchList();
  }, [setList]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/saju?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      // TODO: 에러 처리
      return;
    }

    remove(id);
  };

  if (list.length === 0) {
    return (
      <p className="mt-4 text-sm text-neutral-500">
        저장된 명식이 없습니다.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {list.map((item) => {
        const isActive = item.id === selectedId;
        const birth = item.birth_json as {
          year?: number;
          month?: number;
          day?: number;
          time?: string;
        };

        return (
          <li
            key={item.id}
            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
              isActive ? "border-blue-500 bg-blue-50" : "border-neutral-200"
            }`}
          >
            <button
              type="button"
              className="flex flex-col text-left"
              onClick={() => select(item.id)}
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-xs text-neutral-500">
                {birth.year}년 {birth.month}월 {birth.day}일{" "}
                {birth.time ?? ""}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="text-xs text-red-500"
            >
              삭제
            </button>
          </li>
        );
      })}
    </ul>
  );
}
