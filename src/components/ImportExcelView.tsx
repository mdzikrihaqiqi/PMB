import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ImportMode,
  ImportValidationReport,
  Student,
  SystemSettings,
  UserProfile,
} from '../types';
import {
  downloadImportTemplate,
  downloadValidationErrorsExcel,
  parseAndValidateExcel,
} from '../lib/excelUtils';
import { importStudentsBatch } from '../lib/firestoreService';
import { formatNumberId } from '../lib/utils';
import { Button, SurfaceCard } from './ui/Primitives';

interface ImportExcelViewProps {
  existingStudents: Student[];
  existingContactsMap: Record<string, string | null>;
  profile: UserProfile;
  settings: SystemSettings;
  onImportComplete: () => void;
}

export function ImportExcelView({
  existingStudents,
  existingContactsMap,
  profile,
  settings,
  onImportComplete,
}: ImportExcelViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<ImportMode>('insert_only');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportValidationReport | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'error'>('all');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [resultSummary, setResultSummary] = useState<{
    created: number;
    updated: number;
    skippedError: number;
  } | null>(null);

  const existingNpms = new Set(existingStudents.map((s) => s.npm));

  const handleFileSelected = async (file: File, activeMode: ImportMode = mode) => {
    const maxBytes = (settings.max_import_mb || 10) * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`Ukuran file melebihi batas maksimal ${settings.max_import_mb} MB.`);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Format file harus .xlsx, .xls, atau .csv');
      return;
    }

    setSelectedFile(file);
    setResultSummary(null);
    setParsing(true);
    try {
      const parsed = await parseAndValidateExcel(file, existingNpms, activeMode);
      setReport(parsed);
      toast.success(`Berhasil membaca ${parsed.totalRows} baris dari ${file.name}`);
    } catch (err) {
      setReport(null);
      toast.error(err instanceof Error ? err.message : 'Gagal membaca file Excel.');
    } finally {
      setParsing(false);
    }
  };

  const handleModeChange = async (nextMode: ImportMode) => {
    setMode(nextMode);
    if (selectedFile) {
      await handleFileSelected(selectedFile, nextMode);
    }
  };

  const handleCommitImport = async () => {
    if (!report) return;
    const validCount = report.validNewCount + report.validUpdateCount;
    if (validCount === 0) {
      toast.error('Tidak ada baris valid untuk diimpor.');
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: validCount });
    try {
      const res = await importStudentsBatch(
        report.rows,
        existingContactsMap,
        mode,
        report.fileName,
        profile,
        (done, total) => setProgress({ done, total })
      );
      setResultSummary({
        created: res.created,
        updated: res.updated,
        skippedError: report.errorCount,
      });
      toast.success(
        `Import selesai: ${res.created} mahasiswa baru, ${res.updated} diperbarui.`
      );
      setReport(null);
      setSelectedFile(null);
      onImportComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data import.');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const filteredPreviewRows = (report?.rows || []).filter((r) => {
    if (previewFilter === 'valid') return r.status !== 'error';
    if (previewFilter === 'error') return r.status === 'error';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header & Template Card */}
      <SurfaceCard className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-[#202A35]">
            Import Data Mahasiswa dari Excel
          </h2>
          <p className="text-xs text-[#5E6875] mt-1 leading-relaxed max-w-2xl">
            Unggah file <span className="font-mono text-[#202A35]">DATA MAHASISWA 2024-2026.xlsx</span>.
            Sistem akan memetakan kolom otomatis (<span className="font-mono">no, npm, nama, kelas, prodi, angkatan, asal sekolah, kecamatan, No telp</span>),
            mempertahankan nilai kosong sebagai <span className="font-mono">NULL</span>, dan memvalidasi duplikasi NPM sebelum disimpan.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={downloadImportTemplate}>
          <Download className="w-4 h-4 text-[#0D3A2B]" />
          <span>Download Template Excel</span>
        </Button>
      </SurfaceCard>

      {/* Mode Selection & Dropzone */}
      <SurfaceCard className="p-5 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#202A35] block">
            Mode Penanganan NPM Saat Import
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleModeChange('insert_only')}
              className={`p-3.5 rounded-[11px] border text-left transition-colors cursor-pointer ${
                mode === 'insert_only'
                  ? 'border-[#0D3A2B] bg-[#0D3A2B]/5'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-semibold text-[#202A35]">
                Tambah Data Baru Saja (Ketat)
              </p>
              <p className="text-[11px] text-[#5E6875] mt-1">
                NPM yang sudah ada di database ditandai sebagai duplikat dan tidak menimpa data lama.
              </p>
            </button>

            <button
              type="button"
              disabled={!settings.allow_upsert_by_npm}
              onClick={() => void handleModeChange('upsert_by_npm')}
              className={`p-3.5 rounded-[11px] border text-left transition-colors cursor-pointer disabled:opacity-50 ${
                mode === 'upsert_by_npm'
                  ? 'border-[#0D3A2B] bg-[#0D3A2B]/5'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-semibold text-[#202A35]">
                Tambah Baru & Perbarui Berdasarkan NPM
              </p>
              <p className="text-[11px] text-[#5E6875] mt-1">
                NPM baru akan ditambahkan, sedangkan NPM yang sudah ada diperbarui tanpa menghapus data lain.
              </p>
            </button>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFileSelected(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-[14px] p-8 sm:p-10 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-[#0D3A2B] bg-[#0D3A2B]/5'
              : 'border-slate-300 hover:border-[#0D3A2B]/60 bg-[#F7F8FA]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelected(file);
              e.target.value = '';
            }}
          />
          <div className="w-12 h-12 rounded-[12px] bg-white border border-slate-200 text-[#0D3A2B] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Upload className="w-5 h-5" />
          </div>
          <p className="font-display text-sm font-semibold text-[#202A35]">
            {parsing
              ? 'Membaca dan memvalidasi file Excel...'
              : 'Seret file Excel ke sini atau klik untuk memilih file'}
          </p>
          <p className="text-xs text-[#5E6875] mt-1">
            Mendukung .xlsx, .xls, dan .csv · Maksimal {settings.max_import_mb} MB
          </p>
        </div>
      </SurfaceCard>

      {/* Post-Import Result Summary */}
      {resultSummary && (
        <SurfaceCard className="p-5 bg-emerald-50/60 border-emerald-200 space-y-2">
          <div className="flex items-center gap-2 text-[#0D3A2B]">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-display text-sm font-bold">Laporan Hasil Import Excel</h3>
          </div>
          <p className="text-xs text-[#202A35] leading-relaxed">
            Berhasil menambahkan <strong>{resultSummary.created}</strong> data baru dan
            memperbarui <strong>{resultSummary.updated}</strong> data mahasiswa.{' '}
            {resultSummary.skippedError > 0
              ? `${resultSummary.skippedError} baris bermasalah dilewati dan tidak disimpan.`
              : 'Seluruh baris valid berhasil diproses.'}
          </p>
        </SurfaceCard>
      )}

      {/* Validation Preview */}
      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Total Baris File</p>
              <p className="font-display text-2xl font-bold text-[#202A35] tabular-nums mt-1">
                {formatNumberId(report.totalRows)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Valid Data Baru</p>
              <p className="font-display text-2xl font-bold text-[#146B4A] tabular-nums mt-1">
                {formatNumberId(report.validNewCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Valid Pembaruan NPM</p>
              <p className="font-display text-2xl font-bold text-[#0D3A2B] tabular-nums mt-1">
                {formatNumberId(report.validUpdateCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Duplikat / Gagal Validasi</p>
              <p className="font-display text-2xl font-bold text-[#DC2626] tabular-nums mt-1">
                {formatNumberId(report.errorCount)}
              </p>
            </SurfaceCard>
          </div>

          {/* Detected Column Mapping */}
          <SurfaceCard className="p-4">
            <p className="text-xs font-semibold text-[#202A35] mb-2">
              Pemetaan Kolom Otomatis ({report.fileName})
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-[#5E6875]">
              {report.detectedColumns.map((col) => (
                <span key={col.source}>
                  <span className="font-mono text-[#202A35]">{col.source}</span> →{' '}
                  <span className="font-medium text-[#0D3A2B]">{col.target}</span>
                </span>
              ))}
            </div>
          </SurfaceCard>

          {/* Preview Actions */}
          <SurfaceCard className="overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#F7F8FA] rounded-[10px] border border-slate-200/70 w-fit">
                {[
                  { id: 'all' as const, label: `Semua (${report.totalRows})` },
                  {
                    id: 'valid' as const,
                    label: `Valid (${report.validNewCount + report.validUpdateCount})`,
                  },
                  { id: 'error' as const, label: `Error (${report.errorCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreviewFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[8px] cursor-pointer ${
                      previewFilter === f.id
                        ? 'bg-white text-[#202A35] shadow-xs'
                        : 'text-[#5E6875]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {report.errorCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadValidationErrorsExcel(report)}
                  >
                    <Download className="w-3.5 h-3.5 text-red-600" />
                    <span>Download Laporan Kesalahan</span>
                  </Button>
                )}

                <Button
                  type="button"
                  disabled={
                    importing || report.validNewCount + report.validUpdateCount === 0
                  }
                  onClick={() => void handleCommitImport()}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {importing && progress
                      ? `Mengimpor ${progress.done}/${progress.total}...`
                      : `Konfirmasi Import (${report.validNewCount + report.validUpdateCount} Data)`}
                  </span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-left border-collapse min-w-[820px]">
                <thead className="sticky top-0 bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                  <tr>
                    <th className="px-3.5 py-2.5">Baris</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">NPM</th>
                    <th className="px-3.5 py-2.5">Nama</th>
                    <th className="px-3.5 py-2.5">Prodi</th>
                    <th className="px-3.5 py-2.5">Angkatan / Kelas</th>
                    <th className="px-3.5 py-2.5">Keterangan Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPreviewRows.slice(0, 200).map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.status === 'error' ? 'bg-red-50/40' : 'hover:bg-slate-50/70'}
                    >
                      <td className="px-3.5 py-2.5 font-mono tabular-nums text-[#5E6875]">
                        #{row.rowNumber}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {row.status === 'valid_new' && (
                          <span className="inline-flex items-center gap-1 font-medium text-[#146B4A]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Baru
                          </span>
                        )}
                        {row.status === 'valid_update' && (
                          <span className="inline-flex items-center gap-1 font-medium text-[#0D3A2B]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Update
                          </span>
                        )}
                        {row.status === 'error' && (
                          <span className="inline-flex items-center gap-1 font-medium text-[#DC2626]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Gagal
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono tabular-nums">
                        {row.data?.npm || String(row.raw.npm || row.raw.NPM || '—')}
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-[#202A35]">
                        {row.data?.nama || String(row.raw.nama || row.raw.Nama || '—')}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#475569]">
                        {row.data?.prodi || String(row.raw.prodi || row.raw.Prodi || '—')}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#475569]">
                        {row.data
                          ? `${row.data.angkatan} · ${row.data.kelas}`
                          : '—'}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#475569]">
                        {row.status === 'error' ? (
                          <span className="text-[#DC2626]">{row.errors.join('; ')}</span>
                        ) : (
                          <span>
                            {row.data?.asal_sekolah ?? 'Sekolah: NULL'} ·{' '}
                            {row.data?.kecamatan ?? 'Kec: NULL'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredPreviewRows.length > 200 && (
              <div className="px-4 py-2.5 bg-[#F7F8FA] border-t border-slate-200 text-xs text-[#5E6875]">
                Menampilkan 200 baris pertama di pratinjau. Seluruh{' '}
                {filteredPreviewRows.length} baris akan tetap diproses saat konfirmasi.
              </div>
            )}
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
