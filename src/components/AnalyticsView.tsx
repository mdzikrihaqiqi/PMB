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
import { BarChart3, Building2, Calendar, GraduationCap, MapPin, RotateCcw } from 'lucide-react';
import type { Student } from '../types';
import { classifySchoolType, formatNumberId, formatPercent } from '../lib/utils';
import { Button, EmptyState, SurfaceCard } from './ui/Primitives';

interface AnalyticsViewProps {
  students: Student[];
}

type AnalyticsSubTab = 'prodi' | 'angkatan' | 'sekolah' | 'kecamatan';

const PALETTE = ['#0D3A2B', '#146B4A', '#F4B400', '#334155', '#0F766E'];

export function AnalyticsView({ students }: AnalyticsViewProps) {
  const [subTab, setSubTab] = useState<AnalyticsSubTab>('prodi');
  const [filterAngkatan, setFilterAngkatan] = useState<string>('ALL');
  const [filterProdi, setFilterProdi] = useState<string>('ALL');

  const angkatanOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.angkatan))).sort((a, b) => a - b),
    [students]
  );

  const prodiOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.prodi))).sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filterAngkatan !== 'ALL' && String(s.angkatan) !== filterAngkatan) return false;
      if (filterProdi !== 'ALL' && s.prodi !== filterProdi) return false;
      return true;
    });
  }, [students, filterAngkatan, filterProdi]);

  const years = useMemo(
    () => Array.from(new Set(filtered.map((s) => s.angkatan))).sort((a, b) => a - b),
    [filtered]
  );

  // 1. Analisis Program Studi
  const prodiAnalysis = useMemo(() => {
    const map = new Map<
      string,
      {
        prodi: string;
        total: number;
        byYear: Record<number, number>;
        classes: Map<string, number>;
      }
    >();

    filtered.forEach((s) => {
      if (!map.has(s.prodi)) {
        map.set(s.prodi, {
          prodi: s.prodi,
          total: 0,
          byYear: {},
          classes: new Map(),
        });
      }
      const entry = map.get(s.prodi)!;
      entry.total += 1;
      entry.byYear[s.angkatan] = (entry.byYear[s.angkatan] || 0) + 1;
      entry.classes.set(s.kelas, (entry.classes.get(s.kelas) || 0) + 1);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // 2. Analisis Angkatan
  const angkatanAnalysis = useMemo(() => {
    const map = new Map<
      number,
      {
        angkatan: number;
        total: number;
        byProdi: Map<string, number>;
        byKelas: Map<string, number>;
      }
    >();

    filtered.forEach((s) => {
      if (!map.has(s.angkatan)) {
        map.set(s.angkatan, {
          angkatan: s.angkatan,
          total: 0,
          byProdi: new Map(),
          byKelas: new Map(),
        });
      }
      const entry = map.get(s.angkatan)!;
      entry.total += 1;
      entry.byProdi.set(s.prodi, (entry.byProdi.get(s.prodi) || 0) + 1);
      entry.byKelas.set(s.kelas, (entry.byKelas.get(s.kelas) || 0) + 1);
    });

    return Array.from(map.values()).sort((a, b) => a.angkatan - b.angkatan);
  }, [filtered]);

  // 3. Analisis Asal Sekolah
  const schoolAnalysis = useMemo(() => {
    const schoolCounts = new Map<string, { total: number; byProdi: Map<string, number> }>();
    const categoryCounts = new Map<string, number>([
      ['SMA', 0],
      ['SMK', 0],
      ['MA', 0],
      ['Lainnya', 0],
    ]);
    let nullCount = 0;

    filtered.forEach((s) => {
      if (!s.asal_sekolah) {
        nullCount += 1;
        return;
      }
      if (!schoolCounts.has(s.asal_sekolah)) {
        schoolCounts.set(s.asal_sekolah, { total: 0, byProdi: new Map() });
      }
      const entry = schoolCounts.get(s.asal_sekolah)!;
      entry.total += 1;
      entry.byProdi.set(s.prodi, (entry.byProdi.get(s.prodi) || 0) + 1);

      const cat = classifySchoolType(s.asal_sekolah);
      if (cat) {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      }
    });

    const ranked = Array.from(schoolCounts.entries())
      .map(([sekolah, info]) => ({
        sekolah,
        total: info.total,
        byProdi: Array.from(info.byProdi.entries()).sort((a, b) => b[1] - a[1]),
        category: classifySchoolType(sekolah) || 'Lainnya',
      }))
      .sort((a, b) => b.total - a.total);

    const categoryRows = Array.from(categoryCounts.entries())
      .map(([kategori, jumlah]) => ({ kategori, jumlah }))
      .filter((x) => x.jumlah > 0);

    return {
      uniqueCount: ranked.length,
      topSchool: ranked[0] || null,
      top10: ranked.slice(0, 10),
      categoryRows,
      nullCount,
      filledCount: filtered.length - nullCount,
    };
  }, [filtered]);

  // 4. Analisis Kecamatan
  const kecamatanAnalysis = useMemo(() => {
    const counts = new Map<string, number>();
    let nullCount = 0;

    filtered.forEach((s) => {
      if (!s.kecamatan) {
        nullCount += 1;
        return;
      }
      counts.set(s.kecamatan, (counts.get(s.kecamatan) || 0) + 1);
    });

    const ranked = Array.from(counts.entries())
      .map(([kecamatan, total]) => ({ kecamatan, total }))
      .sort((a, b) => b.total - a.total);

    return {
      uniqueCount: ranked.length,
      topKecamatan: ranked[0] || null,
      top10: ranked.slice(0, 10),
      all: ranked,
      nullCount,
      filledCount: filtered.length - nullCount,
    };
  }, [filtered]);

  if (students.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Belum Ada Data untuk Dianalisis"
        description="Analisis Program Studi, Angkatan, Asal Sekolah, dan Kecamatan akan dihitung otomatis setelah data mahasiswa tersedia di database."
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Filters */}
      <SurfaceCard className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F8FA] rounded-[11px] border border-slate-200/70">
          {[
            { id: 'prodi' as const, label: 'Program Studi', icon: GraduationCap },
            { id: 'angkatan' as const, label: 'Angkatan', icon: Calendar },
            { id: 'sekolah' as const, label: 'Asal Sekolah', icon: Building2 },
            { id: 'kecamatan' as const, label: 'Kecamatan', icon: MapPin },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-2 text-xs font-medium rounded-[9px] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0D3A2B] text-white shadow-xs'
                    : 'text-[#5E6875] hover:text-[#202A35]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterAngkatan}
            onChange={(e) => setFilterAngkatan(e.target.value)}
            aria-label="Filter Angkatan"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35]"
          >
            <option value="ALL">Semua Angkatan</option>
            {angkatanOptions.map((y) => (
              <option key={y} value={String(y)}>
                Angkatan {y}
              </option>
            ))}
          </select>

          <select
            value={filterProdi}
            onChange={(e) => setFilterProdi(e.target.value)}
            aria-label="Filter Program Studi"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35]"
          >
            <option value="ALL">Semua Prodi</option>
            {prodiOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {(filterAngkatan !== 'ALL' || filterProdi !== 'ALL') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterAngkatan('ALL');
                setFilterProdi('ALL');
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </SurfaceCard>

      {/* TAB 1: ANALISIS PROGRAM STUDI */}
      {subTab === 'prodi' && (
        <div className="space-y-5">
          <SurfaceCard className="p-5">
            <h3 className="font-display text-sm font-semibold text-[#202A35]">
              Perbandingan Mahasiswa Per Program Studi & Angkatan
            </h3>
            <p className="text-xs text-[#5E6875] mt-0.5 mb-4">
              Total data teranalisis: {formatNumberId(filtered.length)} mahasiswa
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={prodiAnalysis.map((p) => {
                    const row: Record<string, string | number> = { prodi: p.prodi };
                    years.forEach((y) => {
                      row[String(y)] = p.byYear[y] || 0;
                    });
                    return row;
                  })}
                  margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="prodi" tick={{ fontSize: 11, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {years.map((y, idx) => (
                    <Bar
                      key={y}
                      dataKey={String(y)}
                      name={`Angkatan ${y}`}
                      fill={PALETTE[idx % PALETTE.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80">
              <h3 className="font-display text-sm font-semibold text-[#202A35]">
                Rincian Program Studi & Distribusi Kelas
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                    <th className="px-4 py-3">Program Studi</th>
                    <th className="px-4 py-3 text-right">Jumlah</th>
                    <th className="px-4 py-3 text-right">Persentase</th>
                    {years.map((y) => (
                      <th key={y} className="px-4 py-3 text-right">
                        {y}
                      </th>
                    ))}
                    <th className="px-4 py-3">Distribusi Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {prodiAnalysis.map((p) => (
                    <tr key={p.prodi} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-[#202A35]">{p.prodi}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                        {formatNumberId(p.total)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#5E6875]">
                        {formatPercent(p.total, filtered.length)}
                      </td>
                      {years.map((y) => (
                        <td key={y} className="px-4 py-3 text-right font-mono tabular-nums">
                          {formatNumberId(p.byYear[y] || 0)}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-[#5E6875]">
                        {Array.from(p.classes.entries())
                          .sort((a, b) => a[0].localeCompare(b[0]))
                          .map(([cls, cnt]) => `${cls} (${cnt})`)
                          .join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* TAB 2: ANALISIS ANGKATAN */}
      {subTab === 'angkatan' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {angkatanAnalysis.map((a) => (
              <SurfaceCard key={a.angkatan} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#5E6875]">Angkatan {a.angkatan}</p>
                  <span className="text-xs font-mono text-[#0D3A2B] font-semibold tabular-nums">
                    {formatPercent(a.total, filtered.length)}
                  </span>
                </div>
                <p className="font-display text-3xl font-bold text-[#202A35] tabular-nums">
                  {formatNumberId(a.total)}
                </p>
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <p className="font-medium text-[#202A35]">Komposisi Prodi:</p>
                  {Array.from(a.byProdi.entries())
                    .sort((x, y) => y[1] - x[1])
                    .map(([prodi, cnt]) => (
                      <div key={prodi} className="flex items-center justify-between text-[#5E6875]">
                        <span className="truncate pr-2">{prodi}</span>
                        <span className="font-mono tabular-nums text-[#202A35]">
                          {cnt} ({formatPercent(cnt, a.total)})
                        </span>
                      </div>
                    ))}
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-[#5E6875]">
                  Kelas:{' '}
                  {Array.from(a.byKelas.entries())
                    .sort((x, y) => x[0].localeCompare(y[0]))
                    .map(([k, v]) => `${k} (${v})`)
                    .join(' · ')}
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANALISIS ASAL SEKOLAH */}
      {subTab === 'sekolah' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Jumlah Sekolah Asal</p>
              <p className="font-display text-2xl font-bold text-[#202A35] mt-1 tabular-nums">
                {formatNumberId(schoolAnalysis.uniqueCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Sekolah Terbanyak</p>
              <p className="font-display text-sm font-bold text-[#0D3A2B] mt-1 truncate">
                {schoolAnalysis.topSchool ? schoolAnalysis.topSchool.sekolah : '—'}
              </p>
              <p className="text-[11px] text-[#5E6875] mt-0.5 tabular-nums">
                {schoolAnalysis.topSchool
                  ? `${schoolAnalysis.topSchool.total} mahasiswa`
                  : 'Belum ada data'}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Data Sekolah Terisi</p>
              <p className="font-display text-2xl font-bold text-[#202A35] mt-1 tabular-nums">
                {formatNumberId(schoolAnalysis.filledCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Asal Sekolah Kosong (NULL)</p>
              <p className="font-display text-2xl font-bold text-[#5E6875] mt-1 tabular-nums">
                {formatNumberId(schoolAnalysis.nullCount)}
              </p>
            </SurfaceCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SurfaceCard className="p-5">
              <h3 className="font-display text-sm font-semibold text-[#202A35]">
                Distribusi Jenis Sekolah (SMA / SMK / MA)
              </h3>
              <p className="text-xs text-[#5E6875] mt-0.5 mb-4">
                Diklasifikasikan langsung dari awalan nama sekolah yang terisi.
              </p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schoolAnalysis.categoryRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="kategori" tick={{ fontSize: 12, fill: '#202A35' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="jumlah" name="Mahasiswa" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {schoolAnalysis.categoryRows.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/80">
                <h3 className="font-display text-sm font-semibold text-[#202A35]">
                  Peringkat 10 Sekolah Asal Terbanyak
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Nama Sekolah</th>
                      <th className="px-4 py-2.5">Jenis</th>
                      <th className="px-4 py-2.5 text-right">Jumlah</th>
                      <th className="px-4 py-2.5">Prodi Dominan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {schoolAnalysis.top10.map((row, idx) => (
                      <tr key={row.sekolah} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono tabular-nums text-[#5E6875]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-[#202A35]">
                          {row.sekolah}
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6875]">{row.category}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                          {row.total}
                        </td>
                        <td className="px-4 py-2.5 text-[#5E6875]">
                          {row.byProdi[0] ? `${row.byProdi[0][0]} (${row.byProdi[0][1]})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}

      {/* TAB 4: ANALISIS KECAMATAN */}
      {subTab === 'kecamatan' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Total Kecamatan</p>
              <p className="font-display text-2xl font-bold text-[#202A35] mt-1 tabular-nums">
                {formatNumberId(kecamatanAnalysis.uniqueCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Kecamatan Terbanyak</p>
              <p className="font-display text-sm font-bold text-[#0D3A2B] mt-1 truncate">
                {kecamatanAnalysis.topKecamatan
                  ? kecamatanAnalysis.topKecamatan.kecamatan
                  : '—'}
              </p>
              <p className="text-[11px] text-[#5E6875] mt-0.5 tabular-nums">
                {kecamatanAnalysis.topKecamatan
                  ? `${kecamatanAnalysis.topKecamatan.total} mahasiswa`
                  : 'Belum ada data'}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Kecamatan Terisi</p>
              <p className="font-display text-2xl font-bold text-[#202A35] mt-1 tabular-nums">
                {formatNumberId(kecamatanAnalysis.filledCount)}
              </p>
            </SurfaceCard>
            <SurfaceCard className="p-4">
              <p className="text-xs text-[#5E6875]">Kecamatan Kosong (NULL)</p>
              <p className="font-display text-2xl font-bold text-[#5E6875] mt-1 tabular-nums">
                {formatNumberId(kecamatanAnalysis.nullCount)}
              </p>
            </SurfaceCard>
          </div>

          <SurfaceCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80">
              <h3 className="font-display text-sm font-semibold text-[#202A35]">
                Peringkat Persebaran Mahasiswa per Kecamatan
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                    <th className="px-4 py-3">Peringkat</th>
                    <th className="px-4 py-3">Kecamatan</th>
                    <th className="px-4 py-3 text-right">Jumlah Mahasiswa</th>
                    <th className="px-4 py-3 text-right">Persentase (Terisi)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {kecamatanAnalysis.all.map((row, idx) => (
                    <tr key={row.kecamatan} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-mono tabular-nums text-[#5E6875]">
                        #{idx + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#202A35]">
                        {row.kecamatan}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                        {formatNumberId(row.total)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#5E6875]">
                        {formatPercent(row.total, kecamatanAnalysis.filledCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
