import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from "react";
const TEN_GOD_KEYS = ["비겁", "식상", "재성", "관성", "인성"];
function toNum(v, d = 0) {
    if (v == null)
        return d;
    if (typeof v === "number" && Number.isFinite(v))
        return v;
    if (typeof v === "string") {
        const n = Number(v.trim());
        return Number.isFinite(n) ? n : d;
    }
    if (typeof v === "object") {
        const any = v;
        for (const k of ["value", "val", "score", "amount"]) {
            if (k in any)
                return toNum(any[k], d);
        }
    }
    return d;
}
// perTenGod에서 '비겁' 그룹의 (비견/겁재) 서브값을 최대한 유연하게 읽어오기
function readSubFor(name, subsMap, raw, // perTenGod 원본(알 수 없는 모양)
fallbacks // 기본 라벨 ['비견','겁재'] 등
) {
    const [lLabel, rLabel] = fallbacks;
    // 1) 정석: perTenGod['비겁'] 형태
    const hit = subsMap?.[name];
    if (hit) {
        return {
            aLabel: hit.a ?? lLabel,
            bLabel: hit.b ?? rLabel,
            aVal: toNum(hit.aVal, 0),
            bVal: toNum(hit.bVal, 0),
        };
    }
    // 2) 평면 키: perTenGod['비견'], perTenGod['겁재'] 형태
    const any = (raw ?? {});
    const aFlat = any?.[lLabel];
    const bFlat = any?.[rLabel];
    if (aFlat != null || bFlat != null) {
        return {
            aLabel: lLabel,
            bLabel: rLabel,
            aVal: toNum(aFlat, 0),
            bVal: toNum(bFlat, 0),
        };
    }
    // 3) 그룹 안에 라벨 키로 들어온 경우: perTenGod['비겁'] = { 비견: 1, 겁재: 2 }
    const grp = any?.[name];
    if (grp && (grp[lLabel] != null || grp[rLabel] != null)) {
        return {
            aLabel: lLabel,
            bLabel: rLabel,
            aVal: toNum(grp[lLabel], 0),
            bVal: toNum(grp[rLabel], 0),
        };
    }
    // 못 찾으면 0
    return { aLabel: lLabel, bLabel: rLabel, aVal: 0, bVal: 0 };
}
/** 안정적 stringify (키 정렬) */
function stableStringify(obj) {
    const seen = new WeakSet();
    const sorter = (k, v) => {
        if (v && typeof v === "object") {
            if (seen.has(v))
                return;
            seen.add(v);
            if (Array.isArray(v))
                return v;
            const out = {};
            for (const key of Object.keys(v).sort())
                out[key] = (v)[key];
            return out;
        }
        return v;
    };
    try {
        return JSON.stringify(obj, sorter);
    }
    catch {
        return String(Math.random());
    }
}
/** 키 보정(공백/제로폭 제거) */
const norm = (s) => (s ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "");
/** perTenGod 키가 살짝 달라도 매칭 */
function coercePerTenGodMap(src) {
    if (!src)
        return null;
    const table = new Map();
    TEN_GOD_KEYS.forEach((k) => table.set(norm(k), k));
    const out = {};
    for (const rawKey of Object.keys(src)) {
        const hit = table.get(norm(rawKey));
        if (hit)
            out[hit] = src[rawKey];
    }
    return out;
}
/* ────────────────────────────────────────────
 * 타이틀 유틸: "경신대운" 같은 GZ 추출 + 라벨
 * ──────────────────────────────────────────── */
const STEMS = "갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥";
function extractGZ(raw) {
    if (!raw)
        return null;
    const chars = Array.from(String(raw));
    let s = null, b = null;
    for (const ch of chars) {
        if (!s && STEMS.includes(ch))
            s = ch;
        if (BRANCHES.includes(ch))
            b = ch;
    }
    return s && b ? s + b : null;
}
function buildTitleLine(pillars, dae, se, wol) {
    const natal = Array.isArray(pillars) && pillars.length >= 4
        ? `${pillars[0]}년 ${pillars[1]}월 ${pillars[2]}일 ${pillars[3]}시`
        : "";
    const d = extractGZ(dae);
    const s = extractGZ(se);
    const w = extractGZ(wol);
    const extras = [d ? `${d}대운` : null, s ? `${s}세운` : null, w ? `${w}월운` : null].filter(Boolean);
    if (!natal && extras.length === 0)
        return "";
    return extras.length > 0 ? `${natal} + ${extras.join(" ")}` : natal;
}
export default function PentagonChart({ data, perTenGod, width = 280, height = 280, revKey, // 선택: 부모에서 넘기면 그대로 사용
// ▼ 추가: 타이틀용 원국/운
pillars, daewoonGz, sewoonGz, wolwoonGz, }) {
    const sizeW = width, sizeH = height;
    const cx = sizeW / 2, cy = sizeH / 2;
    const r = Math.min(sizeW, sizeH) * 0.37;
    const defaultSubs = React.useMemo(() => ({
        비겁: ["비견", "겁재"],
        식상: ["식신", "상관"],
        재성: ["정재", "편재"],
        관성: ["정관", "편관"],
        인성: ["정인", "편인"],
    }), []);
    // 1) 매 렌더마다 최신 맵 재구성 (in-place 업데이트 반영)
    const subsMap = coercePerTenGodMap(perTenGod);
    // 2) 깊은 값 시그니처 생성
    const perSig = stableStringify(TEN_GOD_KEYS.map((k) => {
        const s = subsMap?.[k];
        return [k, s?.a, s?.b, Number(s?.aVal ?? 0), Number(s?.bVal ?? 0)];
    }));
    const dataSig = stableStringify(data.map((d) => [d.name, d.value]));
    const titleLine = buildTitleLine(pillars, daewoonGz, sewoonGz, wolwoonGz);
    const titleSig = stableStringify([pillars ?? [], extractGZ(daewoonGz), extractGZ(sewoonGz), extractGZ(wolwoonGz)]);
    // 3) 시그니처 변경 시 version 증가 → <svg key={version}>로 리마운트
    const [version, setVersion] = useState(0);
    const lastSigRef = useRef("");
    useEffect(() => {
        const sig = `${revKey ?? ""}||${dataSig}||${perSig}||${titleSig}`;
        if (sig !== lastSigRef.current) {
            lastSigRef.current = sig;
            setVersion((v) => v + 1);
        }
    }, [revKey, dataSig, perSig, titleSig]);
    const angle = (i) => Math.PI / 2 + (2 * -Math.PI * i) / 5;
    const points = useMemo(() => data.map((d, i) => ({
        ...d,
        x: cx + r * Math.cos(angle(i)),
        y: cy - r * Math.sin(angle(i)),
    })), [data, cx, cy, r]);
    return (_jsxs("div", { className: "w-full", children: [titleLine && (_jsx("div", { className: "text-xs text-center text-neutral-700 dark:text-neutral-300 mb-1", children: titleLine })), _jsxs("svg", { width: sizeW, height: sizeH, className: "mx-auto pt-2", children: [points.map((p, i) => {
                        const target = points[(i + 2) % 5];
                        return (_jsx("line", { x1: p.x, y1: p.y, x2: target.x, y2: target.y, stroke: "#94a3b8", strokeWidth: 1 }, `line-${i}`));
                    }), points.map((p, i) => {
                        const next = points[(i + 1) % 5];
                        const mx = (p.x + next.x) / 2;
                        const my = (p.y + next.y) / 2;
                        const vx = mx - cx;
                        const vy = my - cy;
                        const factor = 1.5;
                        const qx = cx + vx * factor;
                        const qy = cy + vy * factor;
                        return (_jsx("path", { d: `M${p.x},${p.y} Q${qx},${qy} ${next.x},${next.y}`, stroke: "#ef4444", strokeWidth: 1.5, fill: "none", markerEnd: "url(#arrow)" }, `curve-${i}`));
                    }), _jsx("defs", { children: _jsx("marker", { id: "arrow", markerWidth: "6", markerHeight: "6", refX: "5", refY: "3", orient: "auto", children: _jsx("path", { d: "M0,0 L6,3 L0,6 Z", fill: "#ef4444" }) }) }), points.map((p) => {
                        const name = p.name;
                        const [leftLabel, rightLabel] = defaultSubs[name];
                        // ★ 여기서 안전하게 a/b와 값 읽기 (여러 모양 지원)
                        const { aLabel, bLabel, aVal, bVal } = readSubFor(name, subsMap, // coercePerTenGodMap(perTenGod) 결과
                        perTenGod, // 원본 그대로도 넘겨서 평면/그룹 내 라벨 키까지 커버
                        [leftLabel, rightLabel]);
                        return (_jsxs("g", { transform: `translate(${p.x},${p.y})`, children: [_jsx("circle", { r: 33, fill: p.color, opacity: p.value === 0 ? 0.7 : 1 }), _jsxs("text", { textAnchor: "middle", dy: "-6", fontSize: "14", className: "fill-white font-semibold", children: [p.name, " ", p.value] }), _jsxs("text", { textAnchor: "middle", dy: "8", fontSize: "10", className: "fill-white", children: [aLabel, " ", aVal] }), _jsxs("text", { textAnchor: "middle", dy: "19", fontSize: "10", className: "fill-white", children: [bLabel, " ", bVal] })] }, `${p.name}-${aVal}-${bVal}`));
                    })] }, version)] }));
}
