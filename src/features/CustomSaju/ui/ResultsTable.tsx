import type { MatchRow } from "../input/customSajuTypes";

export function ResultsTable({
  results,
  selectedRow,
  onSelectRow,
  gender,
}: {
  results: MatchRow[] | null;
  selectedRow: number | null;
  onSelectRow: (idx: number) => void;
  gender: "male" | "female";
}) {
  if (!results) {
    return (
      <div className="p-2 text-neutral-500 text-sm text-center">
        조건을 입력하고 검색 버튼을 눌러주세요.
      </div>
    );
  }
  if (results.length === 0) {
    return <div className="p-4 text-neutral-500">일치하는 날짜가 없습니다.</div>;
  }

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800">
        <tr>
          <th className="p-1 text-center">선택</th>
          <th className="p-1 text-center">날짜</th>
          <th className="p-1 text-center">연</th>
          <th className="p-1 text-center">월</th>
          <th className="p-1 text-center">일</th>
          <th className="p-1 text-center">시</th>
          <th className="p-1 text-center">성별</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r, idx) => (
          <tr key={`${r.date}-${idx}`} className="border-t border-neutral-200 dark:border-neutral-800">
            <td className="p-1 text-center">
              <span className="chkContainer">
                <input
                  type="radio"
                  name="selectRow"
                  id={`selectRow-${idx}`}
                  checked={selectedRow === idx}
                  onChange={() => onSelectRow(idx)}
                />
                <label htmlFor={`selectRow-${idx}`}>ON</label>
              </span>
            </td>
            <td className="p-1 text-center">{r.date}</td>
            <td className="p-1 text-center">{r.year}</td>
            <td className="p-1 text-center">{r.month}</td>
            <td className="p-1 text-center">{r.day}</td>
            <td className="p-1 text-center">
              <div className="flex flex-wrap gap-1">
                {r.hourSlots.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center mx-auto gap-1 px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    <b>{s.branch}</b>
                  </span>
                ))}
              </div>
            </td>
            <td className="p-1 text-center">{gender === "male" ? "남자" : "여자"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
