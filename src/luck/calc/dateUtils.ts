export const fromPropMonth = (year: number, month1to12: number) => {
  return new Date(year, month1to12, 15, 12, 0, 0, 0);
};

export const toNoon = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 0, 0);
  return x;
};
