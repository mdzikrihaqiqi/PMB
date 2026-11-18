import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Printer, RotateCcw } from 'lucide-react';
import {
  permissions,
  type StudentWithContact,
  type SystemSettings,
  type UserProfile,
} from '../types';
import { exportStudentsToCsv, exportStudentsToExcel } from '../lib/excelUtils';
import { logActivity } from '../lib/firestoreService';
import { formatDateLongId, formatNumberId, formatPercent } from '../lib/utils';
import { Button, EmptyState, SurfaceCard } from './ui/Primitives';

interface ReportsViewProps {
  students: StudentWithContact[];
  profile: UserProfile;
  settings: SystemSettings;
}

type ReportType = 'students_list' | 'statistics' | 'cohort_comparison';

export function ReportsView({ students, profile, settings }: ReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>('students_list');
  const [filterProdi, setFilterProdi] = useState('ALL');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');
  const [filterSekolah, setFilterSekolah] = useState('ALL');

  const canPhone = permissions.canViewPhone(profile.role);
  const canExport = permissions.canExportData(profile.role);

  const prodiOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.prodi))).sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );
  const angkatanOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.angkatan))).sort((a, b) => a - b),
    [students]
  );
  const kelasOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );
  const kecamatanOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.kecamatan).filter((v): v is string => Boolean(v)))
      ).sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );
  const sekolahOptions = useMemo(
    () =>
      Array.from(
        new Set(students.map((s) => s.asal_sekolah).filter((v): v is string => Boolean(v)))
      ).sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterProdi !== 'ALL' && s.prodi !== filterProdi) return false;
      if (filterAngkatan !== 'ALL' && String(s.angkatan) !== filterAngkatan) return false;
      if (filterKelas !== 'ALL' && s.kelas !== filterKelas) return false;
      if (filterKecamatan !== 'ALL' && (s.kecamatan || '') !== filterKecamatan) return false;
      if (filterSekolah !== 'ALL' && (s.asal_sekolah || '') !== filterSekolah) return false;
      return true;
    });
  }, [students, filterProdi, filterAngkatan, filterKelas, filterKecamatan, filterSekolah]);

  const filterDescription = [
    filterProdi !== 'ALL' ? `Prodi: ${filterProdi}` : null,
    filterAngkatan !== 'ALL' ? `Angkatan: ${filterAngkatan}` : null,
    filterKelas !== 'ALL' ? `Kelas: ${filterKelas}` : null,
    filterKecamatan !== 'ALL' ? `Kecamatan: ${filterKecamatan}` : null,
    filterSekolah !== 'ALL' ? `Sekolah: ${filterSekolah}` : null,
  ]
    .filter(Boolean)
    .join(' · ') || 'Seluruh Data Mahasiswa';

  const years = useMemo(
    () => Array.from(new Set(filtered.map((s) => s.angkatan))).sort((a, b) => a - b),
    [filtered]
  );

  const prodiMatrix = useMemo(() => {
    const prodis = Array.from(new Set(filtered.map((s) => s.prodi))).sort((a, b) =>
      a.localeCompare(b, 'id')
    );
    return prodis.map((p) => {
      const subset = filtered.filter((s) => s.prodi === p);
      const byYear: Record<number, number> = {};
      years.forEach((y) => {
        byYear[y] = subset.filter((s) => s.angkatan === y).length;
      });
      return { prodi: p, total: subset.length, byYear };
    });
  }, [filtered, years]);

  const handleExportExcel = async () => {
    const filename = `LAPORAN_MAHASISWA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportStudentsToExcel(filtered, canPhone, filename, filterDescription);
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Download laporan Excel (${filtered.length} data · ${filterDescription})`,
      filename
    );
  };

  const handleExportCsv = async () => {
    const filename = `LAPORAN_MAHASISWA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.csv`;
    exportStudentsToCsv(filtered, canPhone, filename);
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Download laporan CSV (${filtered.length} data · ${filterDescription})`,
      filename
    );
  };

  const handlePrintPdf = async () => {
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Cetak Laporan PDF resmi (${reportType} · ${filtered.length} data)`,
      filterDescription
    );
    window.print();
  };

  if (students.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Belum Ada Data untuk Dilaporkan"
        description="Impor atau tambahkan data mahasiswa terlebih dahulu untuk membuat laporan PDF, Excel, dan CSV."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Control Panel (hidden on print) */}
      <SurfaceCard className="no-print p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#202A35]">
              Generator Laporan & Export Resmi
            </h2>
            <p className="text-xs text-[#5E6875] mt-0.5">
              Pilih jenis laporan dan parameter filter, lalu unduh Excel/CSV atau cetak PDF dengan kop resmi fakultas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExport && (
              <>
                <Button type="button" variant="outline" onClick={() => void handleExportExcel()}>
                  <FileSpreadsheet className="w-4 h-4 text-[#146B4A]" />
                  <span>Download Excel</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExportCsv()}>
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </Button>
              </>
            )}
            <Button type="button" onClick={() => void handlePrintPdf()}>
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan PDF</span>
            </Button>
          </div>
        </div>

        {/* Report Type Switch */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F8FA] rounded-[11px] border border-slate-200/70 w-fit">
          {[
            { id: 'students_list' as const, label: 'Daftar Mahasiswa' },
            { id: 'statistics' as const, label: 'Statistik Mahasiswa' },
            { id: 'cohort_comparison' as const, label: 'Perbandingan Antarangkatan' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setReportType(t.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-[9px] cursor-pointer ${
                reportType === t.id
                  ? 'bg-[#0D3A2B] text-white'
                  : 'text-[#5E6875] hover:text-[#202A35]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          <select
            value={filterProdi}
            onChange={(e) => setFilterProdi(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px]"
          >
            <option value="ALL">Semua Program Studi</option>
            {prodiOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterAngkatan}
            onChange={(e) => setFilterAngkatan(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px]"
          >
            <option value="ALL">Semua Angkatan</option>
            {angkatanOptions.map((y) => (
              <option key={y} value={String(y)}>
                Angkatan {y}
              </option>
            ))}
          </select>

          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px]"
          >
            <option value="ALL">Semua Kelas</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          <select
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px]"
          >
            <option value="ALL">Semua Kecamatan</option>
            {kecamatanOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <select
            value={filterSekolah}
            onChange={(e) => setFilterSekolah(e.target.value)}
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px]"
          >
            <option value="ALL">Semua Asal Sekolah</option>
            {sekolahOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {(filterProdi !== 'ALL' ||
          filterAngkatan !== 'ALL' ||
          filterKelas !== 'ALL' ||
          filterKecamatan !== 'ALL' ||
          filterSekolah !== 'ALL') && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterProdi('ALL');
                setFilterAngkatan('ALL');
                setFilterKelas('ALL');
                setFilterKecamatan('ALL');
                setFilterSekolah('ALL');
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter Laporan</span>
            </Button>
          </div>
        )}
      </SurfaceCard>

      {/* Official Printable Document Canvas */}
      <SurfaceCard className="p-6 sm:p-10 space-y-6 bg-white">
        {/* Official Institutional Header */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b-2 border-[#0D3A2B]">
          <img
            src="/src/assets/images/febi_unsur_emblem_1794985241331.jpg"
            alt="Logo FEBI UNSUR"
            referrerPolicy="no-referrer"
            className="w-14 h-14 object-contain shrink-0"
          />
          <div className="text-center sm:text-left flex-1">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-[#0D3A2B]">
              FAKULTAS EKONOMI DAN BISNIS ISLAM
            </p>
            <p className="font-display text-lg font-extrabold uppercase tracking-wide text-[#202A35]">
              UNIVERSITAS SURYAKANCANA
            </p>
            <p className="text-xs text-[#5E6875] mt-0.5">{settings.address}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 text-xs text-[#5E6875] border-b border-slate-200 pb-4">
          <div>
            <p className="font-display text-sm font-bold text-[#202A35]">
              {reportType === 'students_list'
                ? 'LAPORAN DATA MAHASISWA'
                : reportType === 'statistics'
                ? 'LAPORAN STATISTIK AKADEMIK MAHASISWA'
                : 'LAPORAN PERBANDINGAN ANTARANGKATAN & PROGRAM STUDI'}
            </p>
            <p className="mt-1">Parameter Filter: {filterDescription}</p>
          </div>
          <div className="sm:text-right">
            <p>Tanggal Pembuatan: {formatDateLongId(new Date())}</p>
            <p className="tabular-nums">Total Tercatat: {formatNumberId(filtered.length)} mahasiswa</p>
          </div>
        </div>

        {reportType === 'students_list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-[#F7F8FA] text-[#202A35] font-semibold">
                  <th className="px-3 py-2.5">No</th>
                  <th className="px-3 py-2.5">NPM</th>
                  <th className="px-3 py-2.5">Nama Mahasiswa</th>
                  <th className="px-3 py-2.5">Program Studi</th>
                  <th className="px-3 py-2.5">Angkatan</th>
                  <th className="px-3 py-2.5">Kelas</th>
                  <th className="px-3 py-2.5">Asal Sekolah</th>
                  <th className="px-3 py-2.5">Kecamatan</th>
                  {canPhone && <th className="px-3 py-2.5">No. Telp</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filtered.map((s, idx) => (
                  <tr key={s.npm}>
                    <td className="px-3 py-2 font-mono tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{s.npm}</td>
                    <td className="px-3 py-2 font-medium text-[#202A35]">{s.nama}</td>
                    <td className="px-3 py-2">{s.prodi}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{s.angkatan}</td>
                    <td className="px-3 py-2">{s.kelas}</td>
                    <td className="px-3 py-2">{s.asal_sekolah ?? '—'}</td>
                    <td className="px-3 py-2">{s.kecamatan ?? '—'}</td>
                    {canPhone && (
                      <td className="px-3 py-2 font-mono tabular-nums">
                        {s.no_telp ?? '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(reportType === 'statistics' || reportType === 'cohort_comparison') && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 bg-[#F7F8FA] font-semibold text-[#202A35]">
                    <th className="px-3 py-2.5">Program Studi</th>
                    {years.map((y) => (
                      <th key={y} className="px-3 py-2.5 text-right">
                        Angkatan {y}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Proporsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {prodiMatrix.map((row) => (
                    <tr key={row.prodi}>
                      <td className="px-3 py-2.5 font-medium text-[#202A35]">{row.prodi}</td>
                      {years.map((y) => (
                        <td key={y} className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {formatNumberId(row.byYear[y] || 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold">
                        {formatNumberId(row.total)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {formatPercent(row.total, filtered.length)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-8 flex justify-end text-xs text-[#202A35]">
          <div className="text-center w-64">
            <p>Cianjur, {formatDateLongId(new Date())}</p>
            <p className="mt-1 font-medium">Bagian Akademik & Kemahasiswaan</p>
            <div className="h-16" />
            <p className="font-semibold underline">{profile.full_name}</p>
            <p className="text-[#5E6875]">{settings.faculty_name}</p>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
