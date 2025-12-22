import { useMemo, useState } from "react";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function diffMonths(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function formatYM(dateObj: Date) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
}

function formatYMD(dateObj: Date) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(dateObj.getDate()).padStart(2, "0")}`;
}

function todayYmd() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayYm() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useMultiRangeControls() {
  const currentYear = new Date().getFullYear();

  const [seStartYear, setSeStartYear] = useState<number>(currentYear);
  const [seEndYear, setSeEndYear] = useState<number>(currentYear);

  const [wolStartYM, setWolStartYM] = useState<string>(() => todayYm());
  const [wolEndYM, setWolEndYM] = useState<string>(() => todayYm());

  const [ilStartDate, setIlStartDate] = useState<string>(() => todayYmd());
  const [ilEndDate, setIlEndDate] = useState<string>(() => todayYmd());

  // ---- 세운
  const onSeStartChange = (year: number) => {
    setSeStartYear(year);
  };

  const onSeEndChange = (year: number) => {
    setSeEndYear(year);
  };

  const onSeStartBlur = () => {
    const s = seStartYear;
    let e = seEndYear;

    if (e < s) e = s;
    if (e - s > 9) e = s + 9;

    setSeEndYear(e);
  };

  const onSeEndBlur = () => {
    let s = seStartYear;
    const e = seEndYear;

    if (e < s) s = e;
    if (e - s > 9) s = e - 9;

    setSeStartYear(s);
  };

  const seYearsCount = useMemo(() => {
    if (!Number.isFinite(seStartYear) || !Number.isFinite(seEndYear)) return 0;
    const diff = seEndYear - seStartYear + 1;
    return diff > 0 ? diff : 0;
  }, [seStartYear, seEndYear]);

  const seYearsList = useMemo(() => {
    const years: number[] = [];
    if (!Number.isFinite(seStartYear) || !Number.isFinite(seEndYear)) return years;
    for (let y = seStartYear; y <= seEndYear && years.length < 10; y++) {
      years.push(y);
    }
    return years;
  }, [seStartYear, seEndYear]);

  // ---- 월운
  const onWolStartChange = (ym: string) => {
    setWolStartYM(ym);
  };

  const onWolEndChange = (ym: string) => {
    setWolEndYM(ym);
  };

  const onWolStartBlur = () => {
    const [sY, sM] = wolStartYM.split("-").map(Number);
    const [eY, eM] = wolEndYM.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    if (end < start) {
      setWolEndYM(formatYM(start));
      return;
    }

    const diff = diffMonths(start, end);
    if (diff > 11) {
      const newEnd = new Date(start);
      newEnd.setMonth(start.getMonth() + 11);
      setWolEndYM(formatYM(newEnd));
    }
  };

  const onWolEndBlur = () => {
    const [sY, sM] = wolStartYM.split("-").map(Number);
    const [eY, eM] = wolEndYM.split("-").map(Number);

    const start = new Date(sY, sM - 1);
    const end = new Date(eY, eM - 1);

    if (end < start) {
      setWolStartYM(formatYM(end));
      return;
    }

    const diff = diffMonths(start, end);
    if (diff > 11) {
      const newStart = new Date(end);
      newStart.setMonth(end.getMonth() - 11);
      setWolStartYM(formatYM(newStart));
    }
  };

  const wolMonthsCount = useMemo(() => {
    const [sy, sm] = (wolStartYM || "").split("-").map(Number);
    const [ey, em] = (wolEndYM || "").split("-").map(Number);
    if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(ey) || !Number.isFinite(em)) {
      return 0;
    }
    const start = new Date(sy, sm - 1, 1);
    const end = new Date(ey, em - 1, 1);
    const diff = diffMonths(start, end) + 1;
    return diff > 0 ? diff : 0;
  }, [wolStartYM, wolEndYM]);

  const wolMonthsList = useMemo(() => {
    const months: string[] = [];
    const [startY, startM] = wolStartYM.split("-").map(Number);
    const [endY, endM] = wolEndYM.split("-").map(Number);
    const curDate = new Date(startY, startM - 1);
    const endDate = new Date(endY, endM - 1);

    if (Number.isNaN(curDate.getTime()) || Number.isNaN(endDate.getTime())) return months;

    while (curDate <= endDate && months.length < 12) {
      months.push(
        `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, "0")}`,
      );
      curDate.setMonth(curDate.getMonth() + 1);
    }

    return months;
  }, [wolStartYM, wolEndYM]);

  // ---- 일운
  const onIlStartChange = (dateStr: string) => {
    setIlStartDate(dateStr);
  };

  const onIlEndChange = (dateStr: string) => {
    setIlEndDate(dateStr);
  };

  const onIlStartBlur = () => {
    if (!ilStartDate || !ilEndDate) return;

    const [sY, sM, sD] = ilStartDate.split("-").map(Number);
    const [eY, eM, eD] = ilEndDate.split("-").map(Number);

    const start = new Date(sY, sM - 1, sD, 4, 0, 0);
    const end = new Date(eY, eM - 1, eD, 4, 0, 0);

    if (end < start) {
      setIlEndDate(formatYMD(start));
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    if (diffDays > 7) {
      const newEnd = new Date(start);
      newEnd.setDate(start.getDate() + 6);
      setIlEndDate(formatYMD(newEnd));
    }
  };

  const onIlEndBlur = () => {
    if (!ilStartDate || !ilEndDate) return;

    const [sY, sM, sD] = ilStartDate.split("-").map(Number);
    const [eY, eM, eD] = ilEndDate.split("-").map(Number);

    const start = new Date(sY, sM - 1, sD, 4, 0, 0);
    const end = new Date(eY, eM - 1, eD, 4, 0, 0);

    if (start > end) {
      setIlStartDate(formatYMD(end));
      return;
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
    if (diffDays > 7) {
      const newStart = new Date(end);
      newStart.setDate(end.getDate() - 6);
      setIlStartDate(formatYMD(newStart));
    }
  };

  const ilDaysCount = useMemo(() => {
    const [sy, sm, sd] = (ilStartDate || "").split("-").map(Number);
    const [ey, em, ed] = (ilEndDate || "").split("-").map(Number);
    if (!Number.isFinite(sy) || !Number.isFinite(sm) || !Number.isFinite(sd)) return 0;
    if (!Number.isFinite(ey) || !Number.isFinite(em) || !Number.isFinite(ed)) return 0;
    const start = new Date(sy, sm - 1, sd, 4, 0, 0);
    const end = new Date(ey, em - 1, ed, 4, 0, 0);
    const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    return diff > 0 ? diff : 0;
  }, [ilStartDate, ilEndDate]);

  const ilDaysList = useMemo(() => {
    const days: string[] = [];
    const [sY, sM, sD] = ilStartDate.split("-").map(Number);
    const [eY, eM, eD] = ilEndDate.split("-").map(Number);

    const start = new Date(sY, sM - 1, sD, 4, 0, 0);
    const end = new Date(eY, eM - 1, eD, 4, 0, 0);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return days;

    const cur = new Date(start);
    while (cur <= end && days.length < 31) {
      const yyyy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, "0");
      const dd = String(cur.getDate()).padStart(2, "0");
      days.push(`${yyyy}-${mm}-${dd}`);
      cur.setDate(cur.getDate() + 1);
    }

    return days;
  }, [ilStartDate, ilEndDate]);

  return {
    seStartYear,
    seEndYear,
    wolStartYM,
    wolEndYM,
    ilStartDate,
    ilEndDate,

    onSeStartChange,
    onSeEndChange,
    onSeStartBlur,
    onSeEndBlur,

    onWolStartChange,
    onWolEndChange,
    onWolStartBlur,
    onWolEndBlur,

    onIlStartChange,
    onIlEndChange,
    onIlStartBlur,
    onIlEndBlur,

    seYearsCount,
    wolMonthsCount,
    ilDaysCount,

    seYearsList,
    wolMonthsList,
    ilDaysList,
  };
}
