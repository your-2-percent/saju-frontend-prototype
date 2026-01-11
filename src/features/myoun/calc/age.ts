export const daewoonAge = (birth: Date, at: Date, offset = 0) => {
  const raw =
    (at.getTime() - birth.getTime()) /
    (365.2425 * 24 * 60 * 60 * 1000);
  const base = raw < 1 ? 1 + raw : raw;
  return Math.max(1, base + offset);
};
