"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
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

type DailyPoint = { day: string; count: number };

export default function AdminDashboardPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalMyeongsik, setTotalMyeongsik] = useState(0);
  const [todayNewUsers, setTodayNewUsers] = useState(0);
  const [todayNewMs, setTodayNewMs] = useState(0);

  const [userGraph, setUserGraph] = useState<DailyPoint[]>([]);
  const [msGraph, setMsGraph] = useState<DailyPoint[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // -----------------------------
  // FETCH KPI
  // -----------------------------
  const fetchKPI = useCallback(async () => {
    // Total users
    const { count: usersCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    setTotalUsers(usersCount || 0);

    // Total Myeongsik
    const { count: msCount } = await supabase
      .from("myeongsik")
      .select("*", { count: "exact", head: true });
    setTotalMyeongsik(msCount || 0);

    // Today new users
    const { count: todayUserCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    setTodayNewUsers(todayUserCount || 0);

    // Today new myeongsik
    const { count: todayMsCount } = await supabase
      .from("myeongsik")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());
    setTodayNewMs(todayMsCount || 0);
  }, [today]);

  // -----------------------------
  // GRAPH: 30 DAYS USERS
  // -----------------------------
  const fetchUserGraph = useCallback(async () => {
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const { data } = await supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: true });

    const map: Record<string, number> = {};

    (data || []).forEach((row) => {
      const d = new Date(row.created_at).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });

    const arr = Object.entries(map).map(([day, count]) => ({ day, count }));
    setUserGraph(arr);
  }, []);

  // -----------------------------
  // GRAPH: 30 DAYS MYEONGSIK
  // -----------------------------
  const fetchMsGraph = useCallback(async () => {
    const from = new Date();
    from.setDate(from.getDate() - 30);

    const { data } = await supabase
      .from("myeongsik")
      .select("created_at")
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: true });

    const map: Record<string, number> = {};

    (data || []).forEach((row) => {
      const d = new Date(row.created_at).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });

    const arr = Object.entries(map).map(([day, count]) => ({ day, count }));
    setMsGraph(arr);
  }, []);

  useEffect(() => {
    fetchKPI();
    fetchUserGraph();
    fetchMsGraph();
  }, [fetchKPI, fetchUserGraph, fetchMsGraph]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <RequireRole allow={["admin", "operator", "viewer"]}>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <KPI label="전체 가입자" value={totalUsers} />
          <KPI label="전체 명식 수" value={totalMyeongsik} />
          <KPI label="오늘 가입" value={todayNewUsers} />
          <KPI label="오늘 생성된 명식" value={todayNewMs} />
        </div>

        {/* User Graph */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">최근 30일 가입자 증가</h2>
          <Graph data={userGraph} />
        </section>

        {/* Myeongsik Graph */}
        <section>
          <h2 className="text-xl font-semibold mb-3">최근 30일 명식 생성량</h2>
          <Graph data={msGraph} />
        </section>
      </div>
    </RequireRole>
  );
}

// -----------------------------
// KPI Component
// -----------------------------
function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
      <div className="text-neutral-400 text-sm">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

// -----------------------------
// Graph Component
// -----------------------------
function Graph({ data }: { data: DailyPoint[] }) {
  return (
    <div className="w-full h-64 bg-neutral-900 border border-neutral-700 rounded-lg p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="day" stroke="#bbb" />
          <YAxis stroke="#bbb" />
          <Tooltip />
          <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d855" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
