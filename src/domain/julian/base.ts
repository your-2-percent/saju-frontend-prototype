interface CalendarObject {
  year: number;
  month: number;
  date: number;
}

export abstract class Calendar {
  readonly _year: number;
  readonly _month: number;
  readonly _date: number;

  constructor(year: number, month: number, date: number) {
    this._year = year;
    this._month = month;
    this._date = date;
  }

  getCalendarObject(): CalendarObject {
    return {
      year: this.year,
      month: this.month,
      date: this.date,
    } as const;
  }
  
  get year(): number {
    return this.year;  
  }

  get month(): number {
    return this.month - 1;
  }

  get date(): number {
    return this.date;
  }
}