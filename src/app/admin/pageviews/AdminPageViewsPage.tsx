"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RequireRole } from "../components/RequireRole";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DayPoint = {
  day: string;
  views: number;
  unique_visitors: number;
};

type PathRow = {
  path: string;
  views: number;
  unique_visitors: number;
};

type PageViewStats = {
  total: number;
  unique_visitors: number;
  by_day: DayPoint[];
  by_path: PathRow[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseStats(v: unknown): PageViewStats | null {
  if (!isRecord(v)) return null;

  const byDay: DayPoint[] = Array.isArray(v.by_day)
    ? v.by_day.filter(isRecord).map((r) => ({
        day: toStr(r.day),
        views: toNum(r.views),
        unique_visitors: toNum(r.unique_visitors),
      }))
    : [];

  const byPath: PathRow[] = Array.isArray(v.by_path)
    ? v.by_path.filter(isRecord).map((r) => ({
        path: toStr(r.path),
        views: toNum(r.views),
        unique_visitors: toNum(r.unique_visitors),
      }))
    : [];

  return {
    total: toNum(v.total),
    unique_visitors: toNum(v.unique_visitors),
    by_day: byDay,
    by_path: byPath,
  };
}

export default function AdminPageViewsPage() {
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [stats, setStats] = useState<PageViewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_page_view_stats", {
        p_days: period,
      });
      if (rpcErr) {
        setError(rpcErr.message || "RPC error");
        return;
      }
      const parsed = parseStats(data);
      if (!parsed) {
        setError("데이터 파싱 실패");
        return;
      }
      setStats(parsed);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const periodLabel = period === 7 ? "주간" : period === 30 ? "월간" : "90일";

  const chartData = useMemo(() => stats?.by_day ?? [], [stats]);

  return (
    <RequireRole allow={["admin", "operator", "viewer"]}>
      <div className="p-6 text-white">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">방문자 로그</h1>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === 7 || v === 30 || v === 90) setPeriod(v);
              }}
              className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 90일</option>
            </select>
            <button
              type="button"
              onClick={() => void fetchStats()}
              className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 cursor-pointer text-sm"
            >
              새로고침
            </button>
          </div>
        </div>

        {error ? <div className="text-red-400 mb-4">{error}</div> : null}
        {loading ? <div className="text-neutral-400 mb-4">불러오는 중...</div> : null}

        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
            <div className="text-neutral-400 text-sm">{periodLabel} 총 페이지뷰</div>
            <div className="text-3xl font-bold mt-1">{stats?.total.toLocaleString() ?? "-"}</div>
          </div>
          <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
            <div className="text-neutral-400 text-sm">{periodLabel} 순 방문자</div>
            <div className="text-3xl font-bold mt-1">
              {stats?.unique_visitors.toLocaleString() ?? "-"}
            </div>
          </div>
        </div>

        {/* 일별 그래프 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">일별 방문 추이</h2>
          <div className="w-full h-56 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#404040" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1c1c1c", border: "1px solid #404040" }}
                  formatter={(value: number, name: string) => {
                    if (name === "views") return [value, "페이지뷰"];
                    if (name === "unique_visitors") return [value, "순 방문자"];
                    return [value, name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#facc15"
                  fill="#facc1520"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="unique_visitors"
                  stroke="#60a5fa"
                  fill="#60a5fa20"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-yellow-400 inline-block" /> 페이지뷰
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-blue-400 inline-block" /> 순 방문자
            </span>
          </div>
        </section>

        {/* 페이지별 테이블 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">페이지별 방문 현황</h2>
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-800 text-neutral-400">
                <tr>
                  <th className="text-left px-4 py-2">경로</th>
                  <th className="text-right px-4 py-2">페이지뷰</th>
                  <th className="text-right px-4 py-2">순 방문자</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.by_path ?? []).map((row) => (
                  <tr key={row.path} className="border-t border-neutral-800 hover:bg-neutral-800/50">
                    <td className="px-4 py-2 font-mono text-neutral-200">{row.path}</td>
                    <td className="px-4 py-2 text-right">{row.views.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-blue-400">
                      {row.unique_visitors.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {!loading && (stats?.by_path ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                      데이터 없음
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequireRole>
  );
}
