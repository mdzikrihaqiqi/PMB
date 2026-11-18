import React, { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';
import { ROLE_LABELS, type ActivityLog, type ActivityType } from '../types';
import { formatDateTimeId } from '../lib/utils';
import { EmptyState, Skeleton, SurfaceCard } from './ui/Primitives';

interface AuditLogsViewProps {
  logs: ActivityLog[];
  loading: boolean;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  CREATE_STUDENT: 'Tambah Mahasiswa',
  UPDATE_STUDENT: 'Edit Mahasiswa',
  DELETE_STUDENT: 'Hapus Mahasiswa',
  BULK_DELETE_STUDENT: 'Hapus Massal',
  IMPORT_EXCEL: 'Import Excel',
  EXPORT_DATA: 'Export / Cetak',
  USER_MANAGEMENT: 'Manajemen Pengguna',
  SYSTEM_SETTINGS: 'Konfigurasi Sistem',
};

export function AuditLogsView({ logs, loading }: AuditLogsViewProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (typeFilter !== 'ALL' && l.activity_type !== typeFilter) return false;
      if (q) {
        const hit =
          l.user_name.toLowerCase().includes(q) ||
          l.user_email.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.target_entity || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [logs, search, typeFilter]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#89929E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pengguna, aktivitas, atau target data..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[10px] focus:outline-none focus:bg-white focus:border-[#0D3A2B]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter Jenis Aktivitas"
          className="h-10 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35]"
        >
          <option value="ALL">Semua Jenis Aktivitas</option>
          {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((k) => (
            <option key={k} value={k}>
              {ACTIVITY_LABELS[k]}
            </option>
          ))}
        </select>
      </SurfaceCard>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Belum Ada Log Aktivitas"
          description="Seluruh aktivitas login, CRUD mahasiswa, import Excel, export laporan, dan perubahan konfigurasi akan tercatat di sini."
        />
      ) : (
        <SurfaceCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Jenis Aktivitas</th>
                  <th className="px-4 py-3">Deskripsi Aktivitas</th>
                  <th className="px-4 py-3">Data Terdampak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono tabular-nums text-[#5E6875] whitespace-nowrap">
                      {formatDateTimeId(log.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-[#202A35]">{log.user_name}</p>
                      <p className="text-[11px] text-[#5E6875]">
                        {ROLE_LABELS[log.user_role]} · {log.user_email}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-[#0D3A2B]">
                      {ACTIVITY_LABELS[log.activity_type] || log.activity_type}
                    </td>
                    <td className="px-4 py-3 text-[#202A35] max-w-md">{log.description}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#5E6875] whitespace-nowrap">
                      {log.target_entity ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}
