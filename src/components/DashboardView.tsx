import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  MapPin,
  Plus,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  permissions,
  ROLE_LABELS,
  type NavTab,
  type Student,
  type UserRole,
} from '../types';
import {
  computeOverallCompleteness,
  formatNumberId,
  formatPercent,
} from '../lib/utils';
import { Button, EmptyState, Skeleton, SurfaceCard } from './ui/Primitives';

interface DashboardViewProps {
  students: Student[];
  loading: boolean;
  userRole: UserRole;
  userEmail: string;
  onNavigate: (tab: NavTab) => void;
  onOpenAddStudent: () => void;
}

const CHART_COLORS = ['#0D3A2B', '#146B4A', '#F4B400', '#334155', '#0F766E', '#64748B'];

export function DashboardView({
  students,
  loading,
  userRole,
  userEmail,
  onNavigate,
  onOpenAddStudent,
}: DashboardViewProps) {
  const [filterAngkatan, setFilterAngkatan] = useState<string>('ALL');
  const [filterProdi, setFilterProdi] = useState<string>('ALL');
  const [filterKelas, setFilterKelas] = useState<string>('ALL');

  const angkatanOptions = useMemo(() => {
    const set = new Set<number>(students.map((s) => s.angkatan));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  const prodiOptions = useMemo(() => {
    const set = new Set<string>(students.map((s) => s.prodi));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [students]);

  const kelasOptions = useMemo(() => {
    const set = new Set<string>(students.map((s) => s.kelas));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (filterAngkatan !== 'ALL' && String(s.angkatan) !== filterAngkatan) return false;
      if (filterProdi !== 'ALL' && s.prodi !== filterProdi) return false;
      if (filterKelas !== 'ALL' && s.kelas !== filterKelas) return false;
      return true;
    });
  }, [students, filterAngkatan, filterProdi, filterKelas]);

  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const count2024 = filteredStudents.filter((s) => s.angkatan === 2024).length;
    const count2025 = filteredStudents.filter((s) => s.angkatan === 2025).length;
    const count2026 = filteredStudents.filter((s) => s.angkatan === 2026).length;

    const prodiSet = new Set(filteredStudents.map((s) => s.prodi));
    const sekolahSet = new Set(
      filteredStudents.map((s) => s.asal_sekolah).filter((v): v is string => Boolean(v))
    );
    const kecamatanSet = new Set(
      filteredStudents.map((s) => s.kecamatan).filter((v): v is string => Boolean(v))
    );

    const completeness = computeOverallCompleteness(filteredStudents);

    const delta2025 =
      count2024 > 0 ? Math.round(((count2025 - count2024) / count2024) * 1000) / 10 : null;
    const delta2026 =
      count2025 > 0 ? Math.round(((count2026 - count2025) / count2025) * 1000) / 10 : null;

    return {
      total,
      count2024,
      count2025,
      count2026,
      totalProdi: prodiSet.size,
      totalSekolah: sekolahSet.size,
      totalKecamatan: kecamatanSet.size,
      completeness,
      delta2025,
      delta2026,
    };
  }, [filteredStudents]);

  // 1. Mahasiswa per Angkatan
  const angkatanChartData = useMemo(() => {
    const counts = new Map<number, number>();
    filteredStudents.forEach((s) => {
      counts.set(s.angkatan, (counts.get(s.angkatan) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([angkatan, jumlah]) => ({
        angkatan: String(angkatan),
        jumlah,
      }));
  }, [filteredStudents]);

  // 2. Mahasiswa per Prodi
  const prodiChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredStudents.forEach((s) => {
      counts.set(s.prodi, (counts.get(s.prodi) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([prodi, jumlah]) => ({ prodi, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [filteredStudents]);

  // 3. Mahasiswa per Kelas
  const kelasChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredStudents.forEach((s) => {
      counts.set(s.kelas, (counts.get(s.kelas) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([kelas, jumlah]) => ({ kelas, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 12);
  }, [filteredStudents]);

  // 4. Top 10 Asal Sekolah
  const schoolChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredStudents.forEach((s) => {
      if (s.asal_sekolah) {
        counts.set(s.asal_sekolah, (counts.get(s.asal_sekolah) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([sekolah, jumlah]) => ({ sekolah, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);
  }, [filteredStudents]);

  // 5. Top 10 Kecamatan
  const kecamatanChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredStudents.forEach((s) => {
      if (s.kecamatan) {
        counts.set(s.kecamatan, (counts.get(s.kecamatan) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([kecamatan, jumlah]) => ({ kecamatan, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);
  }, [filteredStudents]);

  // 6. Perbandingan Antarangkatan & Prodi
  const crossComparison = useMemo(() => {
    const years = Array.from(new Set(filteredStudents.map((s) => s.angkatan))).sort(
      (a, b) => a - b
    );
    const prodis = Array.from(new Set(filteredStudents.map((s) => s.prodi))).sort((a, b) =>
      a.localeCompare(b, 'id')
    );

    const rows = prodis.map((prodi) => {
      const entry: Record<string, string | number> = { prodi };
      years.forEach((yr) => {
        entry[String(yr)] = filteredStudents.filter(
          (s) => s.prodi === prodi && s.angkatan === yr
        ).length;
      });
      return entry;
    });
    return { years: years.map(String), rows };
  }, [filteredStudents]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    const canImport = permissions.canImportExcel(userRole);
    return (
      <EmptyState
        icon={GraduationCap}
        title="Belum Ada Data Mahasiswa di Database"
        description={
          canImport
            ? 'Sistem siap digunakan. Klik tombol "Import Excel 2024–2026" di bawah atau menu Import Excel di sidebar kiri untuk mengunggah DATA MAHASISWA 2024-2026.xlsx.'
            : `Anda masuk sebagai ${userEmail} (${ROLE_LABELS[userRole]}). Menu Import Excel hanya tersedia untuk Admin & Super Admin. Hubungi Super Admin untuk meningkatkan hak akses akun Anda.`
        }
        action={
          canImport ? (
            <Button type="button" onClick={() => onNavigate('import')}>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel 2024–2026</span>
            </Button>
          ) : undefined
        }
        secondaryAction={
          permissions.canCreateOrEditStudent(userRole) ? (
            <Button type="button" variant="outline" onClick={onOpenAddStudent}>
              <Plus className="w-4 h-4" />
              <span>Tambah Mahasiswa</span>
            </Button>
          ) : undefined
        }
      />
    );
  }

  const hasActiveFilter =
    filterAngkatan !== 'ALL' || filterProdi !== 'ALL' || filterKelas !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <SurfaceCard className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-[#202A35]">
              Filter Analitik Dashboard
            </h2>
            <p className="text-xs text-[#5E6875] mt-0.5">
              Seluruh statistik dan grafik dihitung langsung dari data aktual database.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex items-center gap-2.5">
            <select
              value={filterAngkatan}
              onChange={(e) => setFilterAngkatan(e.target.value)}
              aria-label="Filter Angkatan"
              className="h-10 px-3 text-xs font-medium bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
            >
              <option value="ALL">Semua Angkatan</option>
              {angkatanOptions.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Angkatan {yr}
                </option>
              ))}
            </select>

            <select
              value={filterProdi}
              onChange={(e) => setFilterProdi(e.target.value)}
              aria-label="Filter Program Studi"
              className="h-10 px-3 text-xs font-medium bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
            >
              <option value="ALL">Semua Program Studi</option>
              {prodiOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              aria-label="Filter Kelas"
              className="h-10 px-3 text-xs font-medium bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
            >
              <option value="ALL">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            {hasActiveFilter && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterAngkatan('ALL');
                  setFilterProdi('ALL');
                  setFilterKelas('ALL');
                }}
                className="h-10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </SurfaceCard>

      {/* 8 KPI Cards (2 cols on mobile, 4 cols on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total Mahasiswa"
          value={formatNumberId(stats.total)}
          subtitle={
            hasActiveFilter
              ? `Dari ${formatNumberId(students.length)} total mahasiswa`
              : 'Seluruh angkatan aktif'
          }
          icon={Users}
        />
        <KpiCard
          title="Angkatan 2024"
          value={formatNumberId(stats.count2024)}
          subtitle={`${formatPercent(stats.count2024, stats.total)} dari total terpilih`}
          icon={Calendar}
        />
        <KpiCard
          title="Angkatan 2025"
          value={formatNumberId(stats.count2025)}
          subtitle={`${formatPercent(stats.count2025, stats.total)} dari total terpilih`}
          delta={stats.delta2025}
          deltaLabel="vs 2024"
          icon={Calendar}
        />
        <KpiCard
          title="Angkatan 2026"
          value={formatNumberId(stats.count2026)}
          subtitle={`${formatPercent(stats.count2026, stats.total)} dari total terpilih`}
          delta={stats.delta2026}
          deltaLabel="vs 2025"
          icon={Calendar}
        />
        <KpiCard
          title="Program Studi"
          value={formatNumberId(stats.totalProdi)}
          subtitle="Prodi terdata di FEBI"
          icon={BookOpen}
        />
        <KpiCard
          title="Asal Sekolah"
          value={formatNumberId(stats.totalSekolah)}
          subtitle="Sekolah asal unik terdata"
          icon={Building2}
        />
        <KpiCard
          title="Total Kecamatan"
          value={formatNumberId(stats.totalKecamatan)}
          subtitle="Sebaran wilayah asal"
          icon={MapPin}
        />
        <KpiCard
          title="Kelengkapan Data"
          value={`${stats.completeness}%`}
          subtitle="Rata-rata pengisian 8 atribut"
          icon={CheckCircle2}
        />
      </div>

      {/* 6 Interactive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* 1. Grafik Angkatan */}
        <ChartCard
          title="Jumlah Mahasiswa Berdasarkan Angkatan"
          subtitle="Distribusi populasi mahasiswa per tahun masuk"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={angkatanChartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="angkatan" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="jumlah" name="Mahasiswa" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {angkatanChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 2. Grafik Program Studi */}
        <ChartCard
          title="Mahasiswa Berdasarkan Program Studi"
          subtitle="Sebaran mahasiswa antarprogram studi FEBI UNSUR"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={prodiChartData}
                layout="vertical"
                margin={{ top: 6, right: 16, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="prodi"
                  width={150}
                  tick={{ fontSize: 11, fill: '#202A35' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="jumlah" name="Mahasiswa" fill="#0D3A2B" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 3. Grafik Kelas */}
        <ChartCard
          title="Mahasiswa Berdasarkan Kelas"
          subtitle="Distribusi jumlah mahasiswa per kelompok kelas (maks. 12 teratas)"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kelasChartData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="kelas" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="jumlah" name="Mahasiswa" fill="#146B4A" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 6. Grafik Perbandingan Antarangkatan & Prodi */}
        <ChartCard
          title="Perbandingan Antarangkatan dan Program Studi"
          subtitle="Tren penerimaan mahasiswa setiap prodi lintas angkatan"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crossComparison.rows} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="prodi"
                  tick={{ fontSize: 10, fill: '#475569' }}
                  interval={0}
                  tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                />
                <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {crossComparison.years.map((yr, idx) => (
                  <Bar
                    key={yr}
                    dataKey={yr}
                    name={`Angkatan ${yr}`}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* 4. Grafik Asal Sekolah Terbanyak */}
        <ChartCard
          title="10 Asal Sekolah Terbanyak"
          subtitle="Sekolah dengan kontribusi mahasiswa terbanyak (tidak termasuk nilai kosong)"
        >
          {schoolChartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-[#5E6875]">
              Belum ada data asal sekolah pada filter saat ini.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={schoolChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="sekolah"
                    width={155}
                    tick={{ fontSize: 11, fill: '#202A35' }}
                    tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="jumlah" name="Mahasiswa" fill="#0D3A2B" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* 5. Grafik Persebaran Kecamatan */}
        <ChartCard
          title="Persebaran Mahasiswa Berdasarkan Kecamatan"
          subtitle="10 kecamatan dengan jumlah mahasiswa terbanyak"
        >
          {kecamatanChartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-[#5E6875]">
              Belum ada data kecamatan pada filter saat ini.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kecamatanChartData}
                  layout="vertical"
                  margin={{ top: 6, right: 16, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="kecamatan"
                    width={140}
                    tick={{ fontSize: 11, fill: '#202A35' }}
                    tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="jumlah" name="Mahasiswa" fill="#146B4A" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  deltaLabel,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  delta?: number | null;
  deltaLabel?: string;
}) {
  return (
    <SurfaceCard className="p-4 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[#5E6875] leading-snug">{title}</p>
        <div className="w-8 h-8 rounded-[9px] bg-[#0D3A2B]/6 text-[#0D3A2B] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <p className="font-display text-2xl sm:text-[26px] font-bold text-[#202A35] tabular-nums tracking-tight">
          {value}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-[#5E6875]">
          <span>{subtitle}</span>
          {delta !== null && delta !== undefined && (
            <span
              className={
                delta >= 0
                  ? 'inline-flex items-center gap-0.5 font-medium text-[#146B4A] tabular-nums'
                  : 'inline-flex items-center gap-0.5 font-medium text-[#DC2626] tabular-nums'
              }
            >
              {delta >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {delta >= 0 ? `+${delta}%` : `${delta}%`} {deltaLabel}
            </span>
          )}
        </div>
      </div>
    </SurfaceCard>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard className="p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-display text-sm font-semibold text-[#202A35]">{title}</h3>
        <p className="text-xs text-[#5E6875] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </SurfaceCard>
  );
}
