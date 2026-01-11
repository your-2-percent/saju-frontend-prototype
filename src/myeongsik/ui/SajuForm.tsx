// components/SajuForm.tsx
"use client";

import { useState } from "react";
import { useSajuStore } from "@/stores/sajuStore";
import type { MyeongsikRow } from "@/lib/database.types";

export default function SajuForm() {
  const add = useSajuStore((s) => s.add);

  const [name, setName] = useState("");
  const [year, setYear] = useState(1996);
  const [month, setMonth] = useState(12);
  const [day, setDay] = useState(29);
  const [time, setTime] = useState("1603"); // "HHmm"

  const handleSave = async () => {
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      birth: {
        year,
        month,
        day,
        time,
        calendarType: "solar" as const,
      },
      raw: null,
    };

    const res = await fetch("/api/saju", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // TODO: 에러 처리 (toast 등)
      return;
    }

    const data = (await res.json()) as MyeongsikRow;
    add(data);
    setName("");
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label className="text-xs text-neutral-500">이름</label>
        <input
          className="rounded border px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 나현 원국"
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-neutral-500">생년</label>
        <input
          type="number"
          className="w-24 rounded border px-2 py-1 text-sm"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-neutral-500">월</label>
        <input
          type="number"
          className="w-16 rounded border px-2 py-1 text-sm"
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-neutral-500">일</label>
        <input
          type="number"
          className="w-16 rounded border px-2 py-1 text-sm"
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-col">
        <label className="text-xs text-neutral-500">시간(HHmm)</label>
        <input
          className="w-20 rounded border px-2 py-1 text-sm"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="h-8 rounded-md bg-blue-600 px-4 text-sm text-white"
      >
        저장
      </button>
    </div>
  );
}
