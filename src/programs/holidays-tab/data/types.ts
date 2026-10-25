/** A public holiday (attendance `PublicHolidaySerializer`). Holidays are global, not per program. */
export interface Holiday {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  description: string;
}

export type HolidayPayload = Omit<Holiday, 'id'>;
