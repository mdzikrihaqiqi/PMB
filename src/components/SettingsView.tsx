import React, { useEffect, useState } from 'react';
import { Database, Download, FileSpreadsheet, Save, Shield, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  permissions,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type NavTab,
  type StudentWithContact,
  type SystemSettings,
  type UserProfile,
} from '../types';
import {
  exportDatabaseBackupJson,
  exportStudentsToExcel,
} from '../lib/excelUtils';
import { logActivity, saveSystemSettings } from '../lib/firestoreService';
import { Button, SurfaceCard } from './ui/Primitives';

interface SettingsViewProps {
  profile: UserProfile;
  settings: SystemSettings;
  students: StudentWithContact[];
  onNavigate: (tab: NavTab) => void;
}

export function SettingsView({
  profile,
  settings,
  students,
  onNavigate,
}: SettingsViewProps) {
  const canEdit = permissions.canEditSettings(profile.role);
  const canBackup = permissions.canViewAuditLogs(profile.role);

  const [facultyName, setFacultyName] = useState(settings.faculty_name);
  const [universityName, setUniversityName] = useState(settings.university_name);
  const [appName, setAppName] = useState(settings.app_name);
  const [appShortName, setAppShortName] = useState(settings.app_short_name);
  const [address, setAddress] = useState(settings.address);
  const [maxImportMb, setMaxImportMb] = useState(settings.max_import_mb);
  const [allowUpsert, setAllowUpsert] = useState(settings.allow_upsert_by_npm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFacultyName(settings.faculty_name);
    setUniversityName(settings.university_name);
    setAppName(settings.app_name);
    setAppShortName(settings.app_short_name);
    setAddress(settings.address);
    setMaxImportMb(settings.max_import_mb);
    setAllowUpsert(settings.allow_upsert_by_npm);
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      await saveSystemSettings(
        {
          faculty_name: facultyName,
          university_name: universityName,
          app_name: appName,
          app_short_name: appShortName,
          address,
          max_import_mb: maxImportMb,
          allow_upsert_by_npm: allowUpsert,
        },
        profile
      );
      toast.success('Pengaturan identitas & konfigurasi sistem berhasil disimpan.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupJson = async () => {
    exportDatabaseBackupJson(students, settings);
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Mengunduh backup JSON database (${students.length} mahasiswa)`,
      'Backup JSON'
    );
    toast.success('Backup JSON berhasil diunduh.');
  };

  const handleBackupExcel = async () => {
    const filename = `BACKUP_MAHASISWA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportStudentsToExcel(
      students,
      permissions.canViewPhone(profile.role),
      filename,
      'Backup Penuh Database'
    );
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Mengunduh backup Excel penuh (${students.length} mahasiswa)`,
      filename
    );
    toast.success('Backup Excel berhasil diunduh.');
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Account Summary */}
      <SurfaceCard className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[12px] bg-[#0D3A2B]/8 text-[#0D3A2B] flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-[#202A35]">
              {profile.full_name}
            </h2>
            <p className="text-xs text-[#5E6875] mt-0.5">
              {profile.email} · Peran: <strong className="text-[#0D3A2B]">{ROLE_LABELS[profile.role]}</strong>
            </p>
            <p className="text-[11px] text-[#5E6875] mt-1">
              {ROLE_DESCRIPTIONS[profile.role]}
            </p>
          </div>
        </div>
        {permissions.canViewUsers(profile.role) && (
          <Button type="button" variant="outline" onClick={() => onNavigate('users')}>
            <Shield className="w-4 h-4" />
            <span>Kelola Pengguna</span>
          </Button>
        )}
      </SurfaceCard>

      {/* Faculty Identity & Import Settings */}
      <SurfaceCard className="p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/80">
            <div>
              <h3 className="font-display text-sm font-bold text-[#202A35]">
                Identitas Fakultas & Parameter Import Excel
              </h3>
              <p className="text-xs text-[#5E6875] mt-0.5">
                {canEdit
                  ? 'Perubahan identitas diterapkan langsung pada kop laporan PDF dan navigasi.'
                  : 'Hanya Super Admin yang dapat mengubah konfigurasi sistem.'}
              </p>
            </div>
            <img
              src="/src/assets/images/febi_unsur_emblem_1794985241331.jpg"
              alt="Logo Fakultas"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-[9px] border border-slate-200 p-1 object-contain"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Nama Fakultas
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Nama Universitas
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Nama Aplikasi Lengkap
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Nama Singkat Sidebar
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={appShortName}
                onChange={(e) => setAppShortName(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Alamat Kampus (Untuk Kop Laporan PDF)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Batas Maksimal Upload Excel (MB)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                disabled={!canEdit}
                value={maxImportMb}
                onChange={(e) => setMaxImportMb(Number(e.target.value))}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-50"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2.5 text-xs font-medium text-[#202A35] cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={allowUpsert}
                  onChange={(e) => setAllowUpsert(e.target.checked)}
                  className="w-4 h-4 accent-[#0D3A2B]"
                />
                <span>Izinkan pembaruan data berdasarkan NPM saat Import Excel</span>
              </label>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button type="submit" disabled={saving}>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
              </Button>
            </div>
          )}
        </form>
      </SurfaceCard>

      {/* Backup & Data Recovery (No sensitive DB credentials exposed) */}
      {canBackup && (
        <SurfaceCard className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[#0D3A2B]/8 text-[#0D3A2B] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-[#202A35]">
                Backup & Pemulihan Data
              </h3>
              <p className="text-xs text-[#5E6875] mt-0.5 leading-relaxed">
                Unduh arsip data mahasiswa secara aman dalam format JSON atau Excel. Untuk
                pemulihan data dari arsip Excel, gunakan modul Import Excel dengan mode
                pembaruan NPM.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="button" variant="outline" onClick={() => void handleBackupExcel()}>
              <FileSpreadsheet className="w-4 h-4 text-[#146B4A]" />
              <span>Download Backup Excel</span>
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleBackupJson()}>
              <Download className="w-4 h-4" />
              <span>Download Backup JSON</span>
            </Button>
            {permissions.canImportExcel(profile.role) && (
              <Button type="button" onClick={() => onNavigate('import')}>
                <span>Buka Modul Pemulihan / Import</span>
              </Button>
            )}
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
