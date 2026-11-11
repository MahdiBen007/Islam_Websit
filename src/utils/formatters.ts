import type { Language } from '@/types/domain';

export function normalizeInstagramHandle(raw: string): string {
  const trimmed = raw.trim().replace(/^@+/, '');
  return trimmed ? `@${trimmed}` : '';
}

export function stripAtPrefix(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}

export function isValidInstagramHandle(raw: string): boolean {
  const clean = stripAtPrefix(raw);
  if (!clean) return false;
  return /^[a-zA-Z0-9._]{1,30}$/.test(clean) && !clean.endsWith('.') && !clean.includes('..');
}

const TRIVIAL_PHONE_SEQUENCES = [
  '01234567',
  '12345678',
  '23456789',
  '98765432',
  '87654321',
  '76543210',
];

export function isValidPersonName(raw: string): boolean {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2 || cleaned.length > 60) return false;
  if (!/[\p{L}]/u.test(cleaned)) return false;
  if (/(https?:\/\/|www\.|[<>@#$%^&*={}[\]\\|])/i.test(cleaned)) return false;
  if (/(.)\1{4,}/u.test(cleaned)) return false;
  return true;
}

export function isValidPhoneNumber(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || !/^[+\d\s()-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (new Set(digits).size < 3) return false;
  if (TRIVIAL_PHONE_SEQUENCES.some((seq) => digits.includes(seq))) return false;
  return true;
}

export function getInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0);
  const l = lastName.trim().charAt(0);
  if (!f && !l) return 'ط';
  return `${f}${l ? ` ${l}` : ''}`;
}

export function formatRelativeDate(isoDate: string, lang: Language): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24));

  const timeFormatted = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (diffDays === 0) {
    return lang === 'ar' ? `اليوم، ${timeFormatted}` : `Today, ${timeFormatted}`;
  }
  if (diffDays === 1) {
    return lang === 'ar' ? `أمس، ${timeFormatted}` : `Yesterday, ${timeFormatted}`;
  }

  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-DZ' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isWithinDateFilter(
  isoDate: string,
  filter: 'all' | 'today' | 'week' | 'month',
): boolean {
  if (filter === 'all') return true;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return true;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const dayMs = 1000 * 60 * 60 * 24;

  if (filter === 'today') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }
  if (filter === 'week') {
    return diffMs <= 7 * dayMs;
  }
  if (filter === 'month') {
    return diffMs <= 30 * dayMs;
  }
  return true;
}
