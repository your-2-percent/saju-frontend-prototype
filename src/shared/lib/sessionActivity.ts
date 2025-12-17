// shared/lib/sessionActivity.ts
export const setLastActiveAt = () => {
  localStorage.setItem("lastActiveAt", Date.now().toString());
};

export const isInactiveOver = (hours: number) => {
  const raw = localStorage.getItem("lastActiveAt");
  if (!raw) return true;

  const last = Number(raw);
  if (Number.isNaN(last)) return true;

  const diffMs = Date.now() - last;
  return diffMs >= hours * 60 * 60 * 1000;
};
