import React, { useMemo, useState } from 'react';
import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  Eye,
  FileSpreadsheet,
  LayoutGrid,
  Lock,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Table as TableIcon,
  Trash2,
} from 'lucide-react';
import {
  permissions,
  type StudentWithContact,
  type SystemSettings,
  type UserProfile,
} from '../types';
import { exportStudentsToCsv, exportStudentsToExcel } from '../lib/excelUtils';
import { logActivity } from '../lib/firestoreService';
import { formatDateLongId, formatNumberId } from '../lib/utils';
import { Button, ConfirmDialog, EmptyState, Skeleton, SurfaceCard } from './ui/Primitives';

interface StudentsViewProps {
  students: StudentWithContact[];
  loading: boolean;
  profile: UserProfile;
  settings: SystemSettings;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onViewDetail: (student: StudentWithContact) => void;
  onOpenAdd: () => void;
  onOpenEdit: (student: StudentWithContact) => void;
  onDeleteSingle: (student: StudentWithContact) => Promise<void>;
  onBulkDelete: (students: StudentWithContact[]) => Promise<void>;
  onNavigateImport: () => void;
}

const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, StudentWithContact>();

export function StudentsView({
  students,
  loading,
  profile,
  settings,
  searchQuery,
  onSearchQueryChange,
  onViewDetail,
  onOpenAdd,
  onOpenEdit,
  onDeleteSingle,
  onBulkDelete,
  onNavigateImport,
}: StudentsViewProps) {
  const [filterProdi, setFilterProdi] = useState('ALL');
  const [filterAngkatan, setFilterAngkatan] = useState('ALL');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterKecamatan, setFilterKecamatan] = useState('ALL');

  const [sorting, setSorting] = useState<SortingState>([{ id: 'npm', desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [mobileMode, setMobileMode] = useState<'cards' | 'table'>('cards');

  const [deleteTarget, setDeleteTarget] = useState<StudentWithContact | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canPhone = permissions.canViewPhone(profile.role);
  const canEdit = permissions.canCreateOrEditStudent(profile.role);
  const canDelete = permissions.canDeleteStudent(profile.role);
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

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      if (filterProdi !== 'ALL' && s.prodi !== filterProdi) return false;
      if (filterAngkatan !== 'ALL' && String(s.angkatan) !== filterAngkatan) return false;
      if (filterKelas !== 'ALL' && s.kelas !== filterKelas) return false;
      if (filterKecamatan !== 'ALL' && (s.kecamatan || '') !== filterKecamatan) return false;
      if (q) {
        const hit =
          s.npm.toLowerCase().includes(q) ||
          s.nama.toLowerCase().includes(q) ||
          (s.asal_sekolah || '').toLowerCase().includes(q) ||
          (s.kecamatan || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [students, filterProdi, filterAngkatan, filterKelas, filterKecamatan, searchQuery]);

  const selectedStudents = useMemo(
    () => filteredData.filter((s) => selectedIds[s.npm]),
    [filteredData, selectedIds]
  );

  const toggleAllVisible = (checked: boolean) => {
    if (!checked) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    filteredData.forEach((s) => {
      next[s.npm] = true;
    });
    setSelectedIds(next);
  };

  const columns = useMemo(
    () =>
      columnHelper.columns([
        ...(canDelete
          ? [
              columnHelper.display({
                id: 'select',
                header: () => (
                  <input
                    type="checkbox"
                    checked={
                      filteredData.length > 0 && selectedStudents.length === filteredData.length
                    }
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                    aria-label="Pilih semua data terfilter"
                    className="w-4 h-4 accent-[#0D3A2B] rounded cursor-pointer"
                  />
                ),
                cell: ({ row }) => (
                  <input
                    type="checkbox"
                    checked={Boolean(selectedIds[row.original.npm])}
                    onChange={(e) =>
                      setSelectedIds((prev) => ({
                        ...prev,
                        [row.original.npm]: e.target.checked,
                      }))
                    }
                    aria-label={`Pilih ${row.original.nama}`}
                    className="w-4 h-4 accent-[#0D3A2B] rounded cursor-pointer"
                  />
                ),
              }),
            ]
          : []),
        columnHelper.display({
          id: 'no',
          header: 'No.',
          cell: ({ row, table: t }) => {
            const { pageIndex, pageSize } = pagination;
            const visibleRows = t.getRowModel().rows;
            const pos = visibleRows.findIndex((r) => r.id === row.id);
            return (
              <span className="font-mono text-xs text-[#5E6875] tabular-nums">
                {pageIndex * pageSize + pos + 1}
              </span>
            );
          },
        }),
        columnHelper.accessor('npm', {
          header: 'NPM',
          cell: (info) => (
            <button
              type="button"
              onClick={() => onViewDetail(info.row.original)}
              className="font-mono text-xs font-semibold text-[#0D3A2B] hover:underline tabular-nums cursor-pointer"
            >
              {info.getValue()}
            </button>
          ),
        }),
        columnHelper.accessor('nama', {
          header: 'Nama Mahasiswa',
          cell: (info) => (
            <button
              type="button"
              onClick={() => onViewDetail(info.row.original)}
              className="text-left font-medium text-[#202A35] hover:text-[#0D3A2B] cursor-pointer"
            >
              {info.getValue()}
            </button>
          ),
        }),
        columnHelper.accessor('prodi', {
          header: 'Program Studi',
          cell: (info) => <span className="text-xs text-[#202A35]">{info.getValue()}</span>,
        }),
        columnHelper.accessor('angkatan', {
          header: 'Angkatan',
          cell: (info) => (
            <span className="font-mono text-xs tabular-nums text-[#202A35]">
              {info.getValue()}
            </span>
          ),
        }),
        columnHelper.accessor('kelas', {
          header: 'Kelas',
          cell: (info) => <span className="text-xs text-[#202A35]">{info.getValue()}</span>,
        }),
        columnHelper.accessor('asal_sekolah', {
          header: 'Asal Sekolah',
          cell: (info) => (
            <span className="text-xs text-[#475569]">
              {info.getValue() ?? <span className="text-[#89929E] italic">NULL</span>}
            </span>
          ),
        }),
        columnHelper.accessor('kecamatan', {
          header: 'Kecamatan',
          cell: (info) => (
            <span className="text-xs text-[#475569]">
              {info.getValue() ?? <span className="text-[#89929E] italic">NULL</span>}
            </span>
          ),
        }),
        columnHelper.accessor('no_telp', {
          header: 'Nomor Telepon',
          cell: (info) =>
            canPhone ? (
              <span className="font-mono text-xs tabular-nums text-[#202A35]">
                {info.getValue() ?? <span className="text-[#89929E] italic">NULL</span>}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#89929E]">
                <Lock className="w-3 h-3" />
                Terbatas
              </span>
            ),
        }),
        columnHelper.display({
          id: 'actions',
          header: 'Aksi',
          cell: ({ row }) => {
            const item = row.original;
            return (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onViewDetail(item)}
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-slate-600 hover:text-[#0D3A2B] hover:bg-slate-100 cursor-pointer"
                  title="Detail Mahasiswa"
                  aria-label={`Detail ${item.nama}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onOpenEdit(item)}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-slate-600 hover:text-[#146B4A] hover:bg-slate-100 cursor-pointer"
                    title="Edit Mahasiswa"
                    aria-label={`Edit ${item.nama}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    title="Hapus Mahasiswa"
                    aria-label={`Hapus ${item.nama}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          },
        }),
      ]),
    [
      canDelete,
      canEdit,
      canPhone,
      filteredData.length,
      onOpenEdit,
      onViewDetail,
      pagination,
      selectedIds,
      selectedStudents.length,
    ]
  );

  const table = useTable({
    features,
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
  });

  const activeFilterSummary = [
    filterProdi !== 'ALL' ? `Prodi: ${filterProdi}` : null,
    filterAngkatan !== 'ALL' ? `Angkatan: ${filterAngkatan}` : null,
    filterKelas !== 'ALL' ? `Kelas: ${filterKelas}` : null,
    filterKecamatan !== 'ALL' ? `Kecamatan: ${filterKecamatan}` : null,
    searchQuery.trim() ? `Pencarian: "${searchQuery.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleExportExcel = async () => {
    const filename = `DATA_MAHASISWA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.xlsx`;
    exportStudentsToExcel(filteredData, canPhone, filename, activeFilterSummary || 'Semua Data');
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Export Excel ${filteredData.length} mahasiswa (${activeFilterSummary || 'Semua Data'})`,
      filename
    );
  };

  const handleExportCsv = async () => {
    const filename = `DATA_MAHASISWA_FEBI_UNSUR_${new Date().toISOString().slice(0, 10)}.csv`;
    exportStudentsToCsv(filteredData, canPhone, filename);
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Export CSV ${filteredData.length} mahasiswa (${activeFilterSummary || 'Semua Data'})`,
      filename
    );
  };

  const handlePrintTable = async () => {
    await logActivity(
      profile,
      'EXPORT_DATA',
      `Mencetak tabel data ${filteredData.length} mahasiswa`,
      'Print Tabel'
    );
    window.print();
  };

  const handleConfirmDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDeleteSingle(deleteTarget);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudents.length === 0) return;
    setDeleting(true);
    try {
      await onBulkDelete(selectedStudents);
      setSelectedIds({});
      setBulkConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const hasFilters =
    filterProdi !== 'ALL' ||
    filterAngkatan !== 'ALL' ||
    filterKelas !== 'ALL' ||
    filterKecamatan !== 'ALL' ||
    searchQuery.trim() !== '';

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Print Letterhead */}
      <div className="print-only pb-4 mb-4 border-b-2 border-black">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide">
            {settings.faculty_name}
          </p>
          <p className="text-base font-bold uppercase tracking-wide">
            {settings.university_name}
          </p>
          <p className="text-xs mt-1">{settings.address}</p>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-300 pt-2">
          <span>Dicetak pada: {formatDateLongId(new Date())}</span>
          <span>Filter: {activeFilterSummary || 'Semua Data'}</span>
          <span>Total: {filteredData.length} mahasiswa</span>
        </div>
      </div>

      {/* Toolbar & Actions */}
      <SurfaceCard className="no-print p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#89929E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              placeholder="Cari NPM, nama mahasiswa, sekolah, atau kecamatan..."
              className="w-full h-10 pl-9 pr-3 text-sm bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35] placeholder:text-[#89929E] focus:outline-none focus:bg-white focus:border-[#0D3A2B]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <Button type="button" onClick={onOpenAdd}>
                <Plus className="w-4 h-4" />
                <span>Tambah Mahasiswa</span>
              </Button>
            )}

            {permissions.canImportExcel(profile.role) && (
              <Button type="button" variant="secondary" onClick={onNavigateImport}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Import Excel</span>
              </Button>
            )}

            {canExport && (
              <>
                <Button type="button" variant="outline" onClick={() => void handleExportExcel()}>
                  <FileSpreadsheet className="w-4 h-4 text-[#146B4A]" />
                  <span>Excel</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleExportCsv()}>
                  <Download className="w-4 h-4" />
                  <span>CSV</span>
                </Button>
                <Button type="button" variant="outline" onClick={() => void handlePrintTable()}>
                  <Printer className="w-4 h-4" />
                  <span>Cetak</span>
                </Button>
              </>
            )}

            {/* Column Visibility Toggle */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                onClick={() => setColumnsMenuOpen((v) => !v)}
              >
                <Columns3 className="w-4 h-4" />
                <span>Kolom</span>
              </Button>
              {columnsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-[12px] shadow-lg p-3 z-30 space-y-1.5">
                  <p className="text-xs font-semibold text-[#202A35] pb-1.5 border-b border-slate-100">
                    Tampilkan Kolom
                  </p>
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.id !== 'select' && col.id !== 'actions')
                    .map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-xs text-[#202A35] py-1 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                          className="accent-[#0D3A2B]"
                        />
                        <span>
                          {typeof col.columnDef.header === 'string'
                            ? col.columnDef.header
                            : col.id.toUpperCase()}
                        </span>
                      </label>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <select
            value={filterProdi}
            onChange={(e) => {
              setFilterProdi(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            aria-label="Filter Program Studi"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
          >
            <option value="ALL">Semua Prodi</option>
            {prodiOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={filterAngkatan}
            onChange={(e) => {
              setFilterAngkatan(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            aria-label="Filter Angkatan"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
          >
            <option value="ALL">Semua Angkatan</option>
            {angkatanOptions.map((a) => (
              <option key={a} value={String(a)}>
                Angkatan {a}
              </option>
            ))}
          </select>

          <select
            value={filterKelas}
            onChange={(e) => {
              setFilterKelas(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            aria-label="Filter Kelas"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
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
            onChange={(e) => {
              setFilterKecamatan(e.target.value);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
            }}
            aria-label="Filter Kecamatan"
            className="h-9 px-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[9px] text-[#202A35] focus:outline-none focus:border-[#0D3A2B]"
          >
            <option value="ALL">Semua Kecamatan</option>
            {kecamatanOptions.map((kec) => (
              <option key={kec} value={kec}>
                {kec}
              </option>
            ))}
          </select>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterProdi('ALL');
                setFilterAngkatan('ALL');
                setFilterKelas('ALL');
                setFilterKecamatan('ALL');
                onSearchQueryChange('');
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </Button>
          )}

          {/* Mobile view switch */}
          <div className="col-span-2 sm:col-span-4 md:hidden flex items-center justify-between pt-1">
            <span className="text-xs text-[#5E6875] tabular-nums">
              {formatNumberId(filteredData.length)} mahasiswa
            </span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-[9px]">
              <button
                type="button"
                onClick={() => setMobileMode('cards')}
                className={`px-2.5 py-1 text-xs font-medium rounded-[7px] flex items-center gap-1 ${
                  mobileMode === 'cards' ? 'bg-white text-[#202A35] shadow-xs' : 'text-[#5E6875]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kartu
              </button>
              <button
                type="button"
                onClick={() => setMobileMode('table')}
                className={`px-2.5 py-1 text-xs font-medium rounded-[7px] flex items-center gap-1 ${
                  mobileMode === 'table' ? 'bg-white text-[#202A35] shadow-xs' : 'text-[#5E6875]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                Tabel
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {canDelete && selectedStudents.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-[10px] bg-red-50 border border-red-200">
            <p className="text-xs font-medium text-red-900 tabular-nums">
              {selectedStudents.length} mahasiswa dipilih untuk tindakan massal
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds({})}
              >
                Batal Pilih
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </Button>
            </div>
          </div>
        )}
      </SurfaceCard>

      {/* Empty State */}
      {filteredData.length === 0 ? (
        <EmptyState
          icon={Search}
          title={
            students.length === 0
              ? 'Belum Ada Data Mahasiswa'
              : 'Tidak Ada Data yang Cocok'
          }
          description={
            students.length === 0
              ? 'Unggah file Excel DATA MAHASISWA 2024-2026.xlsx atau tambahkan mahasiswa secara manual.'
              : 'Coba ubah kata kunci pencarian atau reset filter angkatan, prodi, kelas, dan kecamatan.'
          }
          action={
            students.length === 0 && permissions.canImportExcel(profile.role) ? (
              <Button type="button" onClick={onNavigateImport}>
                <FileSpreadsheet className="w-4 h-4" />
                <span>Import Excel</span>
              </Button>
            ) : hasFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFilterProdi('ALL');
                  setFilterAngkatan('ALL');
                  setFilterKelas('ALL');
                  setFilterKecamatan('ALL');
                  onSearchQueryChange('');
                }}
              >
                Reset Filter
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Mobile Card List */}
          {mobileMode === 'cards' && (
            <div className="md:hidden space-y-2.5 no-print">
              {table.getRowModel().rows.map((row) => {
                const s = row.original;
                return (
                  <SurfaceCard key={s.npm} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-[#0D3A2B] tabular-nums">
                          {s.npm}
                        </p>
                        <button
                          type="button"
                          onClick={() => onViewDetail(s)}
                          className="font-display text-sm font-semibold text-[#202A35] text-left hover:underline mt-0.5"
                        >
                          {s.nama}
                        </button>
                      </div>
                      {canDelete && (
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[s.npm])}
                          onChange={(e) =>
                            setSelectedIds((prev) => ({
                              ...prev,
                              [s.npm]: e.target.checked,
                            }))
                          }
                          aria-label={`Pilih ${s.nama}`}
                          className="w-5 h-5 accent-[#0D3A2B] shrink-0"
                        />
                      )}
                    </div>

                    <p className="text-xs text-[#5E6875]">
                      {s.prodi} · Angkatan {s.angkatan} · Kelas {s.kelas}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[#89929E] block text-[11px]">Asal Sekolah</span>
                        <span className="text-[#202A35]">{s.asal_sekolah ?? 'NULL'}</span>
                      </div>
                      <div>
                        <span className="text-[#89929E] block text-[11px]">Kecamatan</span>
                        <span className="text-[#202A35]">{s.kecamatan ?? 'NULL'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-mono text-[#475569]">
                        {canPhone ? s.no_telp ?? 'No. Telp: NULL' : 'No. Telp: Terbatas'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetail(s)}
                        >
                          Detail
                        </Button>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenEdit(s)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </SurfaceCard>
                );
              })}
            </div>
          )}

          {/* Enterprise Data Table (Desktop & Optional Mobile Scroll) */}
          <SurfaceCard
            className={
              mobileMode === 'cards'
                ? 'hidden md:block overflow-hidden'
                : 'block overflow-hidden'
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[920px]">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-slate-200 bg-[#F7F8FA]">
                      {hg.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const sorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            className="px-3.5 py-3 text-[11px] font-semibold text-[#5E6875] tracking-wide whitespace-nowrap select-none"
                          >
                            {header.isPlaceholder ? null : canSort ? (
                              <button
                                type="button"
                                onClick={header.column.getToggleSortingHandler()}
                                className="inline-flex items-center gap-1 hover:text-[#202A35] cursor-pointer"
                              >
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                                {sorted === 'asc' ? (
                                  <ArrowUp className="w-3 h-3 text-[#0D3A2B]" />
                                ) : sorted === 'desc' ? (
                                  <ArrowDown className="w-3 h-3 text-[#0D3A2B]" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-40" />
                                )}
                              </button>
                            ) : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {row.getAllCells().map((cell) => {
                        if (!cell.column.getIsVisible()) return null;
                        return (
                          <td
                            key={cell.id}
                            className="px-3.5 py-2.5 text-sm align-middle whitespace-nowrap"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="no-print px-4 py-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-3 text-xs text-[#5E6875]">
                <span className="tabular-nums">
                  Menampilkan{' '}
                  <strong>{pagination.pageIndex * pagination.pageSize + 1}</strong>–
                  <strong>
                    {Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      filteredData.length
                    )}
                  </strong>{' '}
                  dari <strong>{formatNumberId(filteredData.length)}</strong> mahasiswa
                </span>

                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
                  }
                  aria-label="Jumlah baris per halaman"
                  className="h-8 px-2 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[8px] text-[#202A35]"
                >
                  {[10, 25, 50, 100].map((sz) => (
                    <option key={sz} value={sz}>
                      {sz} / hal
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  Awal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Sebelumnya
                </Button>
                <span className="px-2.5 text-xs font-medium text-[#202A35] tabular-nums">
                  Hal {pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Berikutnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  Akhir
                </Button>
              </div>
            </div>
          </SurfaceCard>
        </>
      )}

      {/* Confirm Single Delete */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteSingle}
        title="Konfirmasi Hapus Mahasiswa"
        description={
          deleteTarget
            ? `Apakah Anda yakin ingin menghapus data ${deleteTarget.nama} (NPM ${deleteTarget.npm})? Tindakan ini bersifat permanen dan tercatat di log audit.`
            : ''
        }
        confirmLabel="Hapus Permanen"
        loading={deleting}
      />

      {/* Confirm Bulk Delete */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Konfirmasi Hapus Massal"
        description={`Anda akan menghapus ${selectedStudents.length} data mahasiswa terpilih secara permanen dari database. Lanjutkan?`}
        confirmLabel={`Hapus ${selectedStudents.length} Data`}
        loading={deleting}
      />
    </div>
  );
}
