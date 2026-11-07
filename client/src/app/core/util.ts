import { Capacitor } from '@capacitor/core';

/** Base URL of the DriveShare API. Change this when you deploy. */
export const API_URL = Capacitor.getPlatform() === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const CURRENCY = 'USD';
/** Symbol used on map pins (the currency pipe is used everywhere else). */
export const CURRENCY_SYMBOL = '$';
/** Where the map opens when nothing else is known (Kingston, Jamaica). */
export const DEFAULT_CENTER: [number, number] = [18.0179, -76.8099];

/** Uploaded images live on the API; bundled assets and external URLs use the client origin. */
export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/uploads/') ? API_URL + url : url;
}

/** A readable message from an HttpErrorResponse produced by the API. */
export function errorMessage(err: unknown): string {
  const e = err as { status?: number; error?: { error?: string; details?: string[] } };
  if (e?.status === 0) return 'Cannot reach the server. Is the API running?';
  const details = e?.error?.details?.length ? ` (${e.error.details.join('; ')})` : '';
  return (e?.error?.error ?? 'Something went wrong') + details;
}

/** Today's date in the browser's timezone as YYYY-MM-DD. */
export function todayIso(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Whole days between two YYYY-MM-DD dates (end exclusive). */
export function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000);
}

/** The day after a YYYY-MM-DD date. */
export function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** True if any date from start to end (inclusive) is a Saturday or Sunday. Mirrors the API rule. */
export function rangeHasWeekend(start: string, end: string): boolean {
  if (!start || !end || end < start) return false;
  const n = daysBetween(start, end);
  const [y, m, d] = start.split('-').map(Number);
  for (let i = 0; i <= n; i++) {
    const dow = new Date(Date.UTC(y, m - 1, d + i)).getUTCDay();
    if (dow === 0 || dow === 6) return true;
  }
  return false;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 'Nov 6' */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** 'Nov 6 – 9' within a month, 'Nov 28 – Dec 2' across months. */
export function rangeLabel(start: string, end: string): string {
  const [, sm] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  return sm === em ? `${shortDate(start)} – ${ed}` : `${shortDate(start)} – ${shortDate(end)}`;
}

/** 'YYYY-MM' → 'Nov' */
export function monthShort(ym: string): string {
  return MONTHS[Number(ym.split('-')[1]) - 1] ?? '';
}

/** 'Sara K.' → 'SK' */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Short display name: 'Sara Kim' → 'Sara K.' */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : (parts[0] ?? '');
}

/** Distance in miles between two coordinates (haversine). */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

/** '0.4 mi away' / '12 mi away' */
export function distanceLabel(miles: number): string {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away`;
}
