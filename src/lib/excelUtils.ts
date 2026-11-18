import * as XLSX from 'xlsx';
import type {
  ImportMode,
  ImportValidatedRow,
  ImportValidationReport,
  StudentWithContact,
  SystemSettings,
} from '../types';
import { isValidNpm, normalizeNullableText, sanitizeNpm } from './utils';

const HEADER_ALIASES: Record<string, string> = {
  no: 'no',
  nomor: 'no',
  npm: 'npm',
  nim: 'npm',
  'nomor pokok mahasiswa': 'npm',
  nama: 'nama',
  'nama mahasiswa': 'nama',
  'nama lengkap': 'nama',
  kelas: 'kelas',
  prodi: 'prodi',
  'program studi': 'prodi',
  jurusan: 'prodi',
  angkatan: 'angkatan',
  tahun: 'angkatan',
  'tahun angkatan': 'angkatan',
  'asal sekolah': 'asal_sekolah',
  asal_sekolah: 'asal_sekolah',
  sekolah: 'asal_sekolah',
  'sekolah asal': 'asal_sekolah',
  kecamatan: 'kecamatan',
  kec: 'kecamatan',
  'no telp': 'no_telp',
  no_telp: 'no_telp',
  'no. telp': 'no_telp',
  'nomor telepon': 'no_telp',
  'no hp': 'no_telp',
  telepon: 'no_telp',
  telp: 'no_telp',
  hp: 'no_telp',
};

const TARGET_LABELS: Record<string, string> = {
  no: 'No',
  npm: 'NPM',
  nama: 'Nama Mahasiswa',
  kelas: 'Kelas',
  prodi: 'Program Studi',
  angkatan: 'Angkatan',
  asal_sekolah: 'Asal Sekolah',
  kecamatan: 'Kecamatan',
  no_telp: 'No. Telepon',
};

function normalizeHeaderKey(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function downloadImportTemplate(): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    ['no', 'npm', 'nama', 'kelas', 'prodi', 'angkatan', 'asal sekolah', 'kecamatan', 'No telp'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 28 },
    { wch: 10 },
    { wch: 26 },
    { wch: 12 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
  ];

  const guideRows = [
    ['Kolom', 'Keterangan', 'Wajib'],
    ['no', 'Nomor urut pada Excel (opsional)', 'Tidak'],
    ['npm', 'Nomor Pokok Mahasiswa unik (4-32 karakter huruf/angka/-/_)', 'Ya'],
    ['nama', 'Nama lengkap mahasiswa', 'Ya'],
    ['kelas', 'Nama atau kode kelas (misal: A, B, NR)', 'Ya'],
    ['prodi', 'Nama Program Studi (misal: Ekonomi Syariah, Perbankan Syariah)', 'Ya'],
    ['angkatan', 'Tahun angkatan berupa angka 4 digit (2018-2035)', 'Ya'],
    ['asal sekolah', 'Nama SMA/SMK/MA asal (kosongkan jika tidak ada)', 'Tidak (Nullable)'],
    ['kecamatan', 'Nama kecamatan asal (kosongkan jika tidak ada)', 'Tidak (Nullable)'],
    ['No telp', 'Nomor telepon aktif mahasiswa (kosongkan jika tidak ada)', 'Tidak (Nullable)'],
  ];
  const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 18 }, { wch: 56 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Mahasiswa');
  XLSX.utils.book_append_sheet(wb, guideSheet, 'Panduan Kolom');
  XLSX.writeFile(wb, 'TEMPLATE_IMPORT_MAHASISWA_FEBI_UNSUR.xlsx');
}

export async function parseAndValidateExcel(
  file: File,
  existingNpms: Set<string>,
  mode: ImportMode
): Promise<ImportValidationReport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang dapat dibaca.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  if (rawObjects.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki baris data.');
  }

  const rawHeaders = Object.keys(rawObjects[0] || {});
  const columnMap = new Map<string, string>();
  const detectedColumns: { source: string; target: string }[] = [];

  for (const h of rawHeaders) {
    const normalized = normalizeHeaderKey(h);
    const mapped = HEADER_ALIASES[normalized];
    if (mapped) {
      columnMap.set(h, mapped);
      detectedColumns.push({
        source: h,
        target: TARGET_LABELS[mapped] || mapped,
      });
    }
  }

  const seenInFile = new Set<string>();
  const validatedRows: ImportValidatedRow[] = [];
  let validNewCount = 0;
  let validUpdateCount = 0;
  let errorCount = 0;

  rawObjects.forEach((rawRow, idx) => {
    const mapped: Record<string, unknown> = {};
    for (const [sourceKey, targetKey] of columnMap.entries()) {
      mapped[targetKey] = rawRow[sourceKey];
    }

    const rowNumber = idx + 2; // Excel 1-indexed + header row
    const errors: string[] = [];

    const npm = sanitizeNpm(mapped.npm);
    const nama = normalizeNullableText(mapped.nama);
    const kelas = normalizeNullableText(mapped.kelas);
    const prodi = normalizeNullableText(mapped.prodi);
    const angkatanRaw = normalizeNullableText(mapped.angkatan);
    const asalSekolah = normalizeNullableText(mapped.asal_sekolah);
    const kecamatan = normalizeNullableText(mapped.kecamatan);
    const noTelp = normalizeNullableText(mapped.no_telp);

    if (!npm) {
      errors.push('NPM kosong');
    } else if (!isValidNpm(npm)) {
      errors.push('Format NPM tidak valid (harus 4-32 karakter huruf/angka/-/_)');
    } else if (seenInFile.has(npm)) {
      errors.push(`Duplikat NPM di dalam file Excel (${npm})`);
    }

    if (!nama) errors.push('Nama mahasiswa kosong');
    if (!prodi) errors.push('Program Studi kosong');
    if (!kelas) errors.push('Kelas kosong');

    let angkatanNum = NaN;
    if (!angkatanRaw) {
      errors.push('Angkatan kosong');
    } else {
      const cleanedDigits = angkatanRaw.replace(/[^\d]/g, '');
      angkatanNum = Number.parseInt(cleanedDigits, 10);
      if (Number.isNaN(angkatanNum) || angkatanNum < 2018 || angkatanNum > 2035) {
        errors.push(`Angkatan tidak valid (${angkatanRaw})`);
      }
    }

    if (npm) seenInFile.add(npm);

    const existsInDb = npm ? existingNpms.has(npm) : false;
    if (existsInDb && mode === 'insert_only') {
      errors.push(`NPM ${npm} sudah terdaftar di database (mode Tambah Baru Saja)`);
    }

    if (errors.length > 0) {
      errorCount += 1;
      validatedRows.push({
        rowNumber,
        status: 'error',
        errors,
        data: null,
        raw: rawRow,
      });
    } else {
      const status = existsInDb ? 'valid_update' : 'valid_new';
      if (status === 'valid_update') validUpdateCount += 1;
      else validNewCount += 1;

      validatedRows.push({
        rowNumber,
        status,
        errors: [],
        data: {
          npm,
          nama: nama!,
          kelas: kelas!,
          prodi: prodi!,
          angkatan: angkatanNum,
          asal_sekolah: asalSekolah,
          kecamatan,
          no_telp: noTelp,
        },
        raw: rawRow,
      });
    }
  });

  return {
    fileName: file.name,
    totalRows: rawObjects.length,
    validNewCount,
    validUpdateCount,
    errorCount,
    detectedColumns,
    rows: validatedRows,
  };
}

export function downloadValidationErrorsExcel(report: ImportValidationReport): void {
  const errorRows = report.rows.filter((r) => r.status === 'error');
  const data = errorRows.map((r) => ({
    Baris_Excel: r.rowNumber,
    Keterangan_Kesalahan: r.errors.join('; '),
    ...r.raw,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kesalahan Import');
  XLSX.writeFile(wb, `LAPORAN_KESALAHAN_${report.fileName.replace(/\.[^.]+$/, '')}.xlsx`);
}

export function exportStudentsToExcel(
  students: StudentWithContact[],
  includePhone: boolean,
  filename: string,
  filterSummary?: string
): void {
  const rows = students.map((s, idx) => {
    const base: Record<string, string | number> = {
      No: idx + 1,
      NPM: s.npm,
      'Nama Mahasiswa': s.nama,
      'Program Studi': s.prodi,
      Angkatan: s.angkatan,
      Kelas: s.kelas,
      'Asal Sekolah': s.asal_sekolah ?? '',
      Kecamatan: s.kecamatan ?? '',
    };
    if (includePhone) {
      base['Nomor Telepon'] = s.no_telp ?? '';
    }
    return base;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 30 },
    { wch: 26 },
    { wch: 10 },
    { wch: 12 },
    { wch: 28 },
    { wch: 20 },
    ...(includePhone ? [{ wch: 18 }] : []),
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Data Mahasiswa');

  const metaSheet = XLSX.utils.aoa_to_sheet([
    ['Institusi', 'Fakultas Ekonomi dan Bisnis Islam - Universitas Suryakancana'],
    ['Tanggal Export', new Date().toLocaleString('id-ID')],
    ['Jumlah Data', students.length],
    ['Filter Aktif', filterSummary || 'Semua Data'],
  ]);
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Informasi Export');

  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportStudentsToCsv(
  students: StudentWithContact[],
  includePhone: boolean,
  filename: string
): void {
  const headers = [
    'No',
    'NPM',
    'Nama Mahasiswa',
    'Program Studi',
    'Angkatan',
    'Kelas',
    'Asal Sekolah',
    'Kecamatan',
    ...(includePhone ? ['Nomor Telepon'] : []),
  ];

  const escapeCsv = (val: string | number | null | undefined) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...students.map((s, idx) =>
      [
        idx + 1,
        s.npm,
        s.nama,
        s.prodi,
        s.angkatan,
        s.kelas,
        s.asal_sekolah ?? '',
        s.kecamatan ?? '',
        ...(includePhone ? [s.no_telp ?? ''] : []),
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportDatabaseBackupJson(
  students: StudentWithContact[],
  settings: SystemSettings
): void {
  const payload = {
    exported_at: new Date().toISOString(),
    institution: `${settings.faculty_name} — ${settings.university_name}`,
    total_students: students.length,
    settings: {
      faculty_name: settings.faculty_name,
      university_name: settings.university_name,
      app_name: settings.app_name,
      app_short_name: settings.app_short_name,
      address: settings.address,
      max_import_mb: settings.max_import_mb,
      allow_upsert_by_npm: settings.allow_upsert_by_npm,
    },
    students: students.map((s) => ({
      npm: s.npm,
      nama: s.nama,
      prodi: s.prodi,
      angkatan: s.angkatan,
      kelas: s.kelas,
      asal_sekolah: s.asal_sekolah,
      kecamatan: s.kecamatan,
      no_telp: s.no_telp,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BACKUP_SIDATA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
