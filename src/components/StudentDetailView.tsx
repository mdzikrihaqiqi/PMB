import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Lock,
  Pencil,
  Printer,
  Trash2,
} from 'lucide-react';
import {
  permissions,
  type StudentHistory,
  type StudentWithContact,
  type SystemSettings,
  type UserProfile,
} from '../types';
import { fetchStudentHistory } from '../lib/firestoreService';
import {
  computeStudentCompleteness,
  formatDateLongId,
  formatDateTimeId,
} from '../lib/utils';
import { Button, ConfirmDialog, Skeleton, SurfaceCard } from './ui/Primitives';

interface StudentDetailViewProps {
  student: StudentWithContact;
  profile: UserProfile;
  settings: SystemSettings;
  onBack: () => void;
  onEdit: (student: StudentWithContact) => void;
  onDelete: (student: StudentWithContact) => Promise<void>;
}

export function StudentDetailView({
  student,
  profile,
  settings,
  onBack,
  onEdit,
  onDelete,
}: StudentDetailViewProps) {
  const [history, setHistory] = useState<StudentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canPhone = permissions.canViewPhone(profile.role);
  const canEdit = permissions.canCreateOrEditStudent(profile.role);
  const canDelete = permissions.canDeleteStudent(profile.role);
  const completeness = computeStudentCompleteness(student);

  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    setLoadingHistory(true);
    fetchStudentHistory(student.npm)
      .then((items) => {
        if (active) setHistory(items);
      })
      .catch((err) => {
        console.error('Gagal memuat riwayat mahasiswa:', err);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [student.npm, student.updated_at, canEdit]);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(student);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Print Letterhead */}
      <div className="print-only pb-4 mb-4 border-b-2 border-black text-center">
        <p className="text-sm font-bold uppercase">{settings.faculty_name}</p>
        <p className="text-base font-bold uppercase">{settings.university_name}</p>
        <p className="text-xs mt-0.5">{settings.address}</p>
        <p className="text-sm font-semibold mt-3 uppercase">
          Biodata Resmi Mahasiswa · Dicetak {formatDateLongId(new Date())}
        </p>
      </div>

      {/* Action Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            <span>Cetak Profil</span>
          </Button>
          {canEdit && (
            <Button type="button" variant="secondary" onClick={() => onEdit(student)}>
              <Pencil className="w-4 h-4" />
              <span>Edit Data</span>
            </Button>
          )}
          {canDelete && (
            <Button type="button" variant="danger" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="w-4 h-4" />
              <span>Hapus</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Profile Card */}
      <SurfaceCard className="p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
          <div>
            <p className="font-mono text-xs font-semibold text-[#0D3A2B] tabular-nums">
              NPM {student.npm}
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#202A35] mt-1">
              {student.nama}
            </h2>
            <p className="text-sm text-[#5E6875] mt-1">
              {student.prodi} · Angkatan {student.angkatan} · Kelas {student.kelas}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs text-[#5E6875]">Kelengkapan Profil</p>
            <p className="font-display text-2xl font-bold text-[#0D3A2B] tabular-nums">
              {completeness}%
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
          <FieldRow label="Nomor Pokok Mahasiswa (NPM)" value={student.npm} mono />
          <FieldRow label="Nama Lengkap" value={student.nama} />
          <FieldRow label="Program Studi" value={student.prodi} />
          <FieldRow label="Tahun Angkatan" value={String(student.angkatan)} mono />
          <FieldRow label="Kelas" value={student.kelas} />
          <FieldRow
            label="Asal Sekolah"
            value={student.asal_sekolah ?? 'Tidak tersedia (NULL)'}
            muted={!student.asal_sekolah}
          />
          <FieldRow
            label="Kecamatan"
            value={student.kecamatan ?? 'Tidak tersedia (NULL)'}
            muted={!student.kecamatan}
          />
          <div>
            <dt className="text-xs font-medium text-[#5E6875] mb-1">Nomor Telepon</dt>
            <dd className="text-sm font-medium text-[#202A35]">
              {canPhone ? (
                <span className="font-mono tabular-nums">
                  {student.no_telp ?? (
                    <span className="text-[#89929E] italic font-sans font-normal">
                      Tidak tersedia (NULL)
                    </span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-[#5E6875]">
                  <Lock className="w-3.5 h-3.5" />
                  Disembunyikan — hak akses Viewer tidak diizinkan melihat kontak pribadi
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#5E6875]">
          <span>Dibuat: {formatDateTimeId(student.created_at)}</span>
          <span>Terakhir diperbarui: {formatDateTimeId(student.updated_at)}</span>
        </div>
      </SurfaceCard>

      {/* Change History (Staff+) */}
      {canEdit && (
        <SurfaceCard className="no-print p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0D3A2B]" />
            <h3 className="font-display text-sm font-semibold text-[#202A35]">
              Riwayat Perubahan Data
            </h3>
          </div>

          {loadingHistory ? (
            <div className="space-y-2.5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-[#5E6875]">
              Belum ada catatan riwayat perubahan tambahan untuk mahasiswa ini.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#202A35]">{h.summary}</p>
                    <p className="text-[11px] text-[#5E6875] mt-0.5">
                      {h.action} · Field: {h.changed_fields} · Oleh {h.actor_name}
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#5E6875] tabular-nums shrink-0">
                    {formatDateTimeId(h.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Data Mahasiswa"
        description={`Apakah Anda yakin ingin menghapus ${student.nama} (${student.npm}) secara permanen?`}
        confirmLabel="Hapus Permanen"
        loading={deleting}
      />
    </div>
  );
}

function FieldRow({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#5E6875] mb-1">{label}</dt>
      <dd
        className={
          muted
            ? 'text-sm text-[#89929E] italic'
            : mono
            ? 'text-sm font-mono font-medium text-[#202A35] tabular-nums'
            : 'text-sm font-medium text-[#202A35]'
        }
      >
        {value}
      </dd>
    </div>
  );
}
