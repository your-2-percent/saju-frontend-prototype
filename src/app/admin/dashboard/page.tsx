"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type SeriesPoint = {
  day: string; // YYYY-MM-DD
  dau: number;
  total_active_ms: number; // ✅ day별 “증분”이면 합계 계산 OK / 누적스냅샷이면 합치면 안 됨(주의)
};

type DashboardStats = {
  online_now: number; // (초기 로드용) 실제 표시는 onlineNow state로
  active_today: number;
  active_7d: number;
  active_30d: number;
  active_365d: number;
  series: SeriesPoint[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function toStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function parseSeries(v: unknown): SeriesPoint[] {
  if (!Array.isArray(v)) return [];
  const out: SeriesPoint[] = [];
  for (const it of v) {
    if (!isRecord(it)) continue;
    const day = toStr(it.day);
    const dau = toNum(it.dau);
    const total_active_ms = toNum(it.total_active_ms);
    if (!day) continue;
    out.push({ day, dau, total_active_ms });
  }
  return out;
}

function parseDashboardStats(v: unknown): DashboardStats | null {
  if (!isRecord(v)) return null;
  return {
    online_now: toNum(v.online_now),
    active_today: toNum(v.active_today),
    active_7d: toNum(v.active_7d),
    active_30d: toNum(v.active_30d),
    active_365d: toNum(v.active_365d),
    series: parseSeries(v.series),
  };
}

function formatTotalActiveMs(ms?: number | null): string {
  if (!ms || ms <= 0) return "0분";
  const totalSec = Math.floor(ms / 1000);
  const day = Math.floor(totalSec / 86400);
  const hour = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  if (day >= 1) return `${day}일 ${hour}시간`;
  if (hour >= 1) return `${hour}시간 ${min}분`;
  return `${min}분`;
}

export default function AdminDashboardPage() {
  const [days, setDays] = useState<30 | 60 | 90>(30);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [onlineNow, setOnlineNow] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const runningStatsRef = useRef(false);
  const runningOnlineRef = useRef(false);

  // ✅ 무거운 통계(그래프 포함): days 변경/수동/가끔만
  const fetchStats = useCallback(async () => {
    if (runningStatsRef.current) return;
    runningStatsRef.current = true;

    setLoading(true);
    setError("");

    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_dashboard_stats", {
        p_days: days,
      });

      if (rpcErr) {
        setError(rpcErr.message || "RPC error");
        setStats(null);
        return;
      }

      const parsed = parseDashboardStats(data);
      if (!parsed) {
        setError("대시보드 데이터 파싱 실패(형식 불일치)");
        setStats(null);
        return;
      }

      setStats(parsed);
      setOnlineNow(parsed.online_now); // ✅ 초기값 동기화
    } finally {
      setLoading(false);
      runningStatsRef.current = false;
    }
  }, [days]);

  // ✅ 가벼운 온라인만(30초 폴링)
  const fetchOnlineNow = useCallback(async () => {
    if (runningOnlineRef.current) return;
    runningOnlineRef.current = true;

    try {
      const { data, error: rpcErr } = await supabase.rpc("admin_online_now");
      if (rpcErr) return;

      // data가 number면 그대로, 혹시 string이면 숫자로
      const n =
        typeof data === "number"
          ? data
          : typeof data === "string"
            ? Number(data)
            : 0;

      if (Number.isFinite(n)) setOnlineNow(n);
    } finally {
      runningOnlineRef.current = false;
    }
  }, []);

  // 초기 + days 변경 시
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // 온라인: 30초
  useEffect(() => {
    void fetchOnlineNow();
    const id = window.setInterval(() => void fetchOnlineNow(), 30_000);
    return () => window.clearInterval(id);
  }, [fetchOnlineNow]);

  // 전체 stats: 5분(너무 자주 말고)
  useEffect(() => {
    const id = window.setInterval(() => void fetchStats(), 5 * 60_000);
    return () => window.clearInterval(id);
  }, [fetchStats]);

  const series = useMemo(() => stats?.series ?? [], [stats]);

  // ✅ “day별 증분”일 때만 합계가 의미 있음.
  const totalMsSum = useMemo(() => {
    return series.reduce((acc, p) => acc + (p.total_active_ms || 0), 0);
  }, [series]);

  return (
    <RequireRole allow={["admin", "operator", "viewer"]}>
      <div className="p-6 text-white">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>

          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v === 30 || v === 60 || v === 90) setDays(v);
              }}
              className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
              title="DAU 그래프 기간"
            >
              <option value={30}>최근 30일</option>
              <option value={60}>최근 60일</option>
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

        {error ? <div className="text-red-400 mb-3">{error}</div> : null}
        {loading ? <div className="text-neutral-300 mb-3">Loading...</div> : null}

        {/* KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <KPI label="동시 접속자" value={onlineNow} />
          <KPI label="오늘 접속자(DAU)" value={stats?.active_today ?? 0} />
          <KPI label="최근 7일 접속자" value={stats?.active_7d ?? 0} />
          <KPI label="최근 30일 접속자" value={stats?.active_30d ?? 0} />
          <KPI label="최근 1년 접속자" value={stats?.active_365d ?? 0} />
        </div>

        {/* DAU Graph */}
        <section className="mb-10">
          <div className="flex items-end justify-between gap-3 mb-3">
            <h2 className="text-xl font-semibold">DAU 그래프</h2>
            <div className="text-xs text-neutral-400">(수집 시작 이후 데이터만 존재함 ㅋㅋ)</div>
          </div>

          <Graph data={series} />
        </section>

        {/* Total active time (sum) */}
        <section className="mt-6">
          <h3 className="text-lg font-semibold mb-2">최근 기간 총 이용시간(합계)</h3>
          <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
            <div className="text-sm text-neutral-400">
              series.total_active_ms 합 (day별 증분일 때만 의미 있음)
            </div>
            <div className="text-2xl font-bold mt-1">{formatTotalActiveMs(totalMsSum)}</div>
          </div>
        </section>
      </div>
    </RequireRole>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
      <div className="text-neutral-400 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Graph({ data }: { data: SeriesPoint[] }) {
  return (
    <div className="w-full h-64 bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip
            formatter={(value: unknown, name: string) => {
              if (name === "dau") return [value as number, "DAU"];
              return [value as string, name];
            }}
          />
          <Area type="monotone" dataKey="dau" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
