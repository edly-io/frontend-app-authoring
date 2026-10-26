import React from 'react';
import { ProgramCalendar } from '@edly-io/frontend-component-fbr';

interface CalendarTabProps {
  programId: string;
}

/** The library calendar, with its roster and audit links built under `/programs/:programId`. */
const CalendarTab: React.FC<CalendarTabProps> = ({ programId }) => (
  <div className="calendar-tab">
    <ProgramCalendar programKey={programId} basePath={`/programs/${programId}`} />
  </div>
);

export default CalendarTab;
