import { 
  addDays, 
  getYear, 
  getMonth, 
  getDate, 
  isWeekend, 
  eachDayOfInterval, 
  format,
  isSameDay
} from 'date-fns';

export type GermanState = 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV' | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH' | 'ALL';

/**
 * Calculates Easter Sunday for a given year.
 * Using the Meeus/Jones/Butcher algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Returns a list of public holidays for a given year and state.
 */
export function getHolidays(year: number, state: GermanState = 'ALL'): { date: Date; name: string }[] {
  const easter = getEasterSunday(year);
  const holidays: { date: Date; name: string }[] = [];

  // --- Fixed dates (Nationwide) ---
  holidays.push({ date: new Date(year, 0, 1), name: 'Neujahr' });
  holidays.push({ date: new Date(year, 4, 1), name: 'Tag der Arbeit' });
  holidays.push({ date: new Date(year, 9, 3), name: 'Tag der Deutschen Einheit' });
  holidays.push({ date: new Date(year, 11, 25), name: '1. Weihnachtstag' });
  holidays.push({ date: new Date(year, 11, 26), name: '2. Weihnachtstag' });

  // --- Movable dates (Easter based - Nationwide) ---
  holidays.push({ date: addDays(easter, -2), name: 'Karfreitag' });
  holidays.push({ date: addDays(easter, 1), name: 'Ostermontag' });
  holidays.push({ date: addDays(easter, 39), name: 'Christi Himmelfahrt' });
  holidays.push({ date: addDays(easter, 50), name: 'Pfingstmontag' });

  // --- State-specific holidays ---

  // Heilige Drei Könige
  if (['BW', 'BY', 'ST', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 0, 6), name: 'Heilige Drei Könige' });
  }

  // Internationaler Frauentag
  if (['BE', 'MV', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 2, 8), name: 'Internationaler Frauentag' });
  }

  // Fronleichnam
  if (['BW', 'BY', 'HE', 'NW', 'RP', 'SL', 'ALL'].includes(state)) {
    holidays.push({ date: addDays(easter, 60), name: 'Fronleichnam' });
  }

  // Mariä Himmelfahrt
  if (['SL', 'BY', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 7, 15), name: 'Mariä Himmelfahrt' });
  }

  // Weltkindertag
  if (['TH', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 8, 20), name: 'Weltkindertag' });
  }

  // Reformationstag
  if (['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 9, 31), name: 'Reformationstag' });
  }

  // Allerheiligen
  if (['BW', 'BY', 'NW', 'RP', 'SL', 'ALL'].includes(state)) {
    holidays.push({ date: new Date(year, 10, 1), name: 'Allerheiligen' });
  }

  // Buß- und Bettag (Always Wednesday before Nov 23)
  if (['SN', 'ALL'].includes(state)) {
    const nov23 = new Date(year, 10, 23);
    const dayOfWeek = nov23.getDay(); // 0=Sun, 3=Wed
    let offset = dayOfWeek - 3;
    if (offset <= 0) offset += 7;
    holidays.push({ date: addDays(nov23, -offset), name: 'Buß- und Bettag' });
  }

  return holidays;
}

/**
 * Calculates the number of vacation days between two dates, 
 * excluding weekends and public holidays for the given state.
 */
export function calculateVacationDays(from: Date, to: Date, state: GermanState): number {
  if (from > to) return 0;
  
  const days = eachDayOfInterval({ start: from, end: to });
  const yearFrom = getYear(from);
  const yearTo = getYear(to);
  
  // Get holidays for all years involved
  let allHolidays: Date[] = getHolidays(yearFrom, state).map(h => h.date);
  if (yearTo !== yearFrom) {
    allHolidays = [...allHolidays, ...getHolidays(yearTo, state).map(h => h.date)];
  }

  const workdays = days.filter(day => {
    // 1. Is it a weekend?
    if (isWeekend(day)) return false;
    
    // 2. Is it a public holiday?
    const isHoliday = allHolidays.some(h => isSameDay(h, day));
    if (isHoliday) return false;

    return true;
  });

  return workdays.length;
}

export const GERMAN_STATES: { code: GermanState; name: string }[] = [
  { code: 'ALL', name: 'Alle (Gesamtdeutschland)' },
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' },
];
