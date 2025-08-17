import { Calendar } from './base';
import { sub, add } from 'date-fns';

export class Julian extends Calendar {
  static 윤년보정 = 13;

  get dateObj(): Date {
    return new Date(
      this.year,
      this.month,
      this.date
    );
  }

  get timestamp(): number {
    return this.dateObj.getTime();
  }

  toSolarCalendar(): number {
    const date = new Date(
      this.year,
      this.month,
      this.date
    );
    const adjustedDate = add(date, { days: Julian.윤년보정 });
    return adjustedDate.getTime();
  }

  static fromSolarCalendar(solarCalendar: Date): Julian;
  static fromSolarCalendar(solarCalendar: number): Julian;
  static fromSolarCalendar(solarCalendar: Date | number): Julian {
    const dateObj = (() => {
      if (solarCalendar instanceof Date) {
        return solarCalendar;
      }
      return new Date(solarCalendar);
    })();

    const adjustedDate = sub(dateObj, { days: Julian.윤년보정 });
    return new Julian(
      adjustedDate.getFullYear(),
      adjustedDate.getMonth() + 1,
      adjustedDate.getDate()
    );
  }
}