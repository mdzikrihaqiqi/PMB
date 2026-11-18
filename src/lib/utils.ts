import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Student } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function emailToSafeId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export function sanitizeNpm(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim().replace(/\s+/g, '');
}

export function isValidNpm(npm: string): boolean {
  return /^[a-zA-Z0-9_-]{4,32}$/.test(npm);
}

export function normalizeNullableText(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null' || s.toLowerCase() === 'n/a') {
    return null;
  }
  return s;
}

export function formatNumberId(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function formatDateTimeId(date?: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateLongId(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export type SchoolCategory = 'SMA' | 'SMK' | 'MA' | 'Lainnya';

export function classifySchoolType(schoolName: string | null): SchoolCategory | null {
  if (!schoolName) return null;
  const upper = schoolName.toUpperCase().trim();
  if (/\bSMK\b|SMKN|SMKS|SEKOLAH MENENGAH KEJURUAN/.test(upper)) return 'SMK';
  if (/\bMA\b|\bMAN\b|\bMAS\b|MADRASAH ALIYAH/.test(upper)) return 'MA';
  if (/\bSMA\b|SMAN|SMAS|SEKOLAH MENENGAH ATAS/.test(upper)) return 'SMA';
  return 'Lainnya';
}

export function computeStudentCompleteness(student: Student): number {
  const checks = [
    Boolean(student.npm),
    Boolean(student.nama),
    Boolean(student.prodi),
    Boolean(student.angkatan),
    Boolean(student.kelas),
    Boolean(student.asal_sekolah),
    Boolean(student.kecamatan),
    Boolean(student.has_phone),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function computeOverallCompleteness(students: Student[]): number {
  if (students.length === 0) return 0;
  const total = students.reduce((acc, s) => acc + computeStudentCompleteness(s), 0);
  return Math.round(total / students.length);
}

export const DEFAULT_SYSTEM_SETTINGS = {
  faculty_code: 'FEBI_UNSUR' as const,
  setting_key: 'identity',
  faculty_name: 'Fakultas Ekonomi dan Bisnis Islam',
  university_name: 'Universitas Suryakancana',
  app_name: 'Sistem Informasi Data Mahasiswa FEBI UNSUR',
  app_short_name: 'SIDATA FEBI UNSUR',
  address: 'Jl. Pasir Gede Raya, Bojongherang, Kec. Cianjur, Kab. Cianjur, Jawa Barat 43216',
  max_import_mb: 10,
  allow_upsert_by_npm: true,
};
