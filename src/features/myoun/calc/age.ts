export const daewoonAge = (birth: Date, at: Date, offset = 0) => {
  const y = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  const d = at.getDate() - birth.getDate();
  const adjusted = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
  return Math.max(1, adjusted + offset);
};
