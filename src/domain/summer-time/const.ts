interface SummerTime {
  start: Date;
  end: Date;
}

export const SUMMER_TIME_MAP: Record<number, SummerTime> = {
  1948: {
    start: formatDate(1948, 5, 1),
    end: formatDate(1948, 8, 13)
  },
  1949: {
    start: formatDate(1949, 3, 3),
    end: formatDate(1949, 8, 11)
  },
  1950: {
    start: formatDate(1950, 3, 1),
    end: formatDate(1950, 8, 10)
  },
  1951: {
    start: formatDate(1951, 4, 6),
    end: formatDate(1951, 8, 9)
  },
  1955: {
    start: formatDate(1955, 4, 5),
    end: formatDate(1955, 8, 9)
  },
  1956: {
    start: formatDate(1956, 4, 20),
    end: formatDate(1956, 8, 30)
  },
  1957: {
    start: formatDate(1957, 4, 5),
    end: formatDate(1957, 8, 22)
  },
  1958: {
    start: formatDate(1958, 4, 4),
    end: formatDate(1958, 8, 21)
  },
  1959: {
    start: formatDate(1959, 4, 3),
    end: formatDate(1959, 8, 20)
  },
  1960: {
    start: formatDate(1960, 4, 1),
    end: formatDate(1960, 8, 18)
  },
  1987: {
    start: formatDate(1987, 4, 10),
    end: formatDate(1987, 9, 11)
  },
  1988: {
    start: formatDate(1988, 4, 8),
    end: formatDate(1988, 9, 9)
  },
};

function formatDate(year: number, months: number, date: number) {
  return new Date(year, months, date, 0, 0);
}