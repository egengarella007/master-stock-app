import { DateTime } from "luxon";

/** London / New York windows are defined in Pacific time (DST-aware). */
export const PT_ZONE = "America/Los_Angeles";
/** Tokyo session follows the Tokyo calendar (often “a day ahead” vs US). */
export const TOKYO_ZONE = "Asia/Tokyo";

export type MarketPT = {
  id: string;
  label: string;
  /** IANA zone: weekday + open/close are interpreted in this zone */
  calendarZone: string;
  /** Minutes from local midnight in `calendarZone` (same calendar day, open < close) */
  openMin: number;
  closeMin: number;
};

const H = (h: number) => h * 60;
const HM = (h: number, m: number) => h * 60 + m;

export const MARKETS: MarketPT[] = [
  {
    id: "tyo",
    label: "Tokyo",
    calendarZone: TOKYO_ZONE,
    /** TSE regular session, Mon–Fri JST (simplified continuous 9–15) */
    openMin: H(9),
    closeMin: H(15),
  },
  {
    id: "lon",
    label: "London",
    calendarZone: PT_ZONE,
    openMin: H(0),
    closeMin: HM(8, 30),
  },
  {
    id: "nyc",
    label: "New York",
    calendarZone: PT_ZONE,
    openMin: HM(6, 30),
    closeMin: H(13),
  },
];

function boundsOnDay(
  dayStart: DateTime,
  openMin: number,
  closeMin: number,
): { open: DateTime; close: DateTime } {
  return {
    open: dayStart.plus({ minutes: openMin }),
    close: dayStart.plus({ minutes: closeMin }),
  };
}

/** Luxon ISO weekday: Mon=1 … Sun=7 */
function isWeekday(dayStart: DateTime): boolean {
  return dayStart.weekday <= 5;
}

export function marketClockState(
  def: Pick<MarketPT, "openMin" | "closeMin" | "calendarZone">,
  now: DateTime = DateTime.now(),
):
  | { status: "open"; until: DateTime }
  | { status: "closed"; nextOpen: DateTime } {
  const t = now;
  const nowZ = t.setZone(def.calendarZone);
  for (let d = 0; d < 21; d++) {
    const dayStart = nowZ.startOf("day").plus({ days: d });
    if (!isWeekday(dayStart)) {
      continue;
    }
    const { open, close } = boundsOnDay(dayStart, def.openMin, def.closeMin);
    if (t >= open && t < close) {
      return { status: "open", until: close };
    }
    if (t < open) {
      return { status: "closed", nextOpen: open };
    }
  }
  let day = nowZ.startOf("day").plus({ days: 1 });
  for (let i = 0; i < 14; i++) {
    if (isWeekday(day)) {
      return {
        status: "closed",
        nextOpen: boundsOnDay(day, def.openMin, def.closeMin).open,
      };
    }
    day = day.plus({ days: 1 });
  }
  return {
    status: "closed",
    nextOpen: t.plus({ days: 7 }),
  };
}

const ONE_HOUR_SEC = 3600;

function formatCountdown(
  from: DateTime,
  to: DateTime,
  prefix: "Opens in" | "Closes in",
): string {
  const ms = Math.max(0, to.toMillis() - from.toMillis());
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (totalSec >= ONE_HOUR_SEC) {
    if (d > 0) return `${prefix} ${d}d ${h}h ${m}m`;
    return `${prefix} ${h}h ${m}m`;
  }
  if (m > 0) return `${prefix} ${m}m ${s}s`;
  return `${prefix} ${s}s`;
}

export function marketClockDisplay(
  def: MarketPT,
  now?: DateTime,
): { dot: "green" | "red"; line: string } {
  const t = now ?? DateTime.now();
  const state = marketClockState(def, t);
  if (state.status === "open") {
    return {
      dot: "green",
      line: formatCountdown(t, state.until, "Closes in"),
    };
  }
  return {
    dot: "red",
    line: formatCountdown(t, state.nextOpen, "Opens in"),
  };
}
