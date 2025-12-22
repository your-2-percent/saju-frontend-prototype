export type Parsed = {
  corrected: Date;
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string } | null;
};

export type HourGZ = { stem: string; branch: string };
