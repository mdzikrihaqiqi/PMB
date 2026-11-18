import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react';
import {
  permissions,
  ROLE_LABELS,
  type ActivityLog,
  type NavTab,
  type SystemSettings,
  type UserProfile,
} from '../types';
import { cn, formatDateTimeId } from '../lib/utils';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
}

interface LayoutProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  profile: UserProfile;
  settings: SystemSettings;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  onGlobalSearchSubmit: () => void;
  onLogout: () => Promise<void>;
  incompleteCount: number;
  totalStudents: number;
  recentLogs: ActivityLog[];
  children: React.ReactNode;
}

const TAB_TITLES: Record<NavTab, { title: string; breadcrumb: string }> = {
  dashboard: { title: 'Dashboard Utama', breadcrumb: 'Ringkasan Eksekutif' },
  students: { title: 'Manajemen Data Mahasiswa', breadcrumb: 'Direktori Mahasiswa' },
  'student-detail': { title: 'Detail Mahasiswa', breadcrumb: 'Direktori Mahasiswa / Profil' },
  analytics: { title: 'Analisis Data Mahasiswa', breadcrumb: 'Analitik Akademik' },
  import: { title: 'Import Data Excel', breadcrumb: 'Integrasi Data / Import Excel' },
  reports: { title: 'Export & Laporan Resmi', breadcrumb: 'Pelaporan Institusi' },
  'audit-logs': { title: 'Log Aktivitas Sistem', breadcrumb: 'Keamanan / Audit Log' },
  users: { title: 'Manajemen Pengguna & Hak Akses', breadcrumb: 'Administrasi / Pengguna' },
  settings: { title: 'Pengaturan Sistem', breadcrumb: 'Administrasi / Konfigurasi' },
};

export function Layout({
  activeTab,
  onNavigate,
  profile,
  settings,
  globalSearch,
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  onLogout,
  incompleteCount,
  totalStudents,
  recentLogs,
  children,
}: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [emblemError, setEmblemError] = useState(false);

  const navItems: NavItem[] = (
    [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        visible: true,
      },
      {
        id: 'students',
        label: 'Data Mahasiswa',
        icon: GraduationCap,
        visible: true,
      },
      {
        id: 'analytics',
        label: 'Analisis Data',
        icon: BarChart3,
        visible: true,
      },
      {
        id: 'import',
        label: 'Import Excel',
        icon: FileSpreadsheet,
        visible: permissions.canImportExcel(profile.role),
      },
      {
        id: 'reports',
        label: 'Laporan & Export',
        icon: FileText,
        visible: true,
      },
      {
        id: 'audit-logs',
        label: 'Log Aktivitas',
        icon: Activity,
        visible: permissions.canViewAuditLogs(profile.role),
      },
      {
        id: 'users',
        label: 'Pengguna & Role',
        icon: Users,
        visible: permissions.canViewUsers(profile.role),
      },
      {
        id: 'settings',
        label: 'Pengaturan',
        icon: Settings,
        visible: true,
      },
    ] satisfies NavItem[]
  ).filter((item) => item.visible);

  const currentInfo = TAB_TITLES[activeTab] || TAB_TITLES.dashboard;

  const isTabActive = (id: NavTab) => {
    if (id === 'students' && activeTab === 'student-detail') return true;
    return activeTab === id;
  };

  const handleSelectTab = (id: NavTab) => {
    onNavigate(id);
    setMobileDrawerOpen(false);
    setNotifOpen(false);
    setProfileMenuOpen(false);
  };

  const initials = profile.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#202A35] flex">
      {/* Desktop & Tablet Sidebar */}
      <aside
        className={cn(
          'no-print hidden md:flex flex-col bg-white border-r border-slate-200/90 sticky top-0 h-screen shrink-0 transition-all duration-200 z-30',
          sidebarCollapsed ? 'w-[76px]' : 'w-[256px]'
        )}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80">
          <button
            type="button"
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-3 min-w-0 cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-[10px] bg-[#0D3A2B]/6 border border-slate-200/80 p-1 flex items-center justify-center shrink-0">
              {!emblemError ? (
                <img
                  src="/src/assets/images/febi_unsur_emblem_1794985241331.jpg"
                  alt="Logo FEBI UNSUR"
                  referrerPolicy="no-referrer"
                  onError={() => setEmblemError(true)}
                  className="w-full h-full object-contain rounded-[6px]"
                />
              ) : (
                <Shield className="w-5 h-5 text-[#0D3A2B]" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-[#0D3A2B] truncate">
                  {settings.app_short_name}
                </p>
                <p className="text-[11px] text-[#5E6875] truncate">
                  {settings.university_name}
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="w-7 h-7 rounded-[8px] flex items-center justify-center text-slate-500 hover:text-[#202A35] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navigasi Utama">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-sm font-medium transition-colors cursor-pointer whitespace-nowrap',
                  active
                    ? 'bg-[#0D3A2B] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#202A35] hover:bg-slate-100/80',
                  sidebarCollapsed && 'justify-center px-0'
                )}
              >
                <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-[#F4B400]' : '')} />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200/80">
          {!sidebarCollapsed ? (
            <div className="px-3 py-2.5 rounded-[11px] bg-[#F7F8FA] border border-slate-200/70">
              <p className="text-xs font-semibold text-[#202A35] truncate">
                {profile.full_name}
              </p>
              <p className="text-[11px] text-[#5E6875] mt-0.5 truncate">
                {ROLE_LABELS[profile.role]} · {profile.email}
              </p>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-[10px] bg-[#0D3A2B]/10 text-[#0D3A2B] font-semibold text-xs flex items-center justify-center"
              title={`${profile.full_name} (${ROLE_LABELS[profile.role]})`}
            >
              {initials}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#202A35]/40 backdrop-blur-[1px]"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-white h-full flex flex-col shadow-xl z-10">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-[9px] bg-[#0D3A2B]/6 p-1 flex items-center justify-center shrink-0">
                  {!emblemError ? (
                    <img
                      src="/src/assets/images/febi_unsur_emblem_1794985241331.jpg"
                      alt="Logo FEBI UNSUR"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Shield className="w-4 h-4 text-[#0D3A2B]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-[#0D3A2B] truncate">
                    {settings.app_short_name}
                  </p>
                  <p className="text-[11px] text-[#5E6875] truncate">
                    FEBI Universitas Suryakancana
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="Tutup menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3.5 py-3 rounded-[11px] text-sm font-medium transition-colors',
                      active
                        ? 'bg-[#0D3A2B] text-white'
                        : 'text-[#475569] hover:bg-slate-100'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 shrink-0', active ? 'text-[#F4B400]' : '')} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 space-y-3">
              <div>
                <p className="text-xs font-semibold text-[#202A35]">{profile.full_name}</p>
                <p className="text-[11px] text-[#5E6875]">
                  {ROLE_LABELS[profile.role]} · {profile.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void onLogout()}
                className="w-full h-11 rounded-[11px] border border-slate-200 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sistem</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 md:pb-0">
        {/* Top Header */}
        <header className="no-print sticky top-0 z-20 h-14 sm:h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden w-10 h-10 -ml-1 rounded-[10px] flex items-center justify-center text-[#202A35] hover:bg-slate-100 shrink-0"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#5E6875]">
                <span>Beranda</span>
                <span aria-hidden="true">/</span>
                <span className="truncate">{currentInfo.breadcrumb}</span>
              </div>
              <h1 className="font-display text-sm sm:text-base font-bold text-[#202A35] truncate">
                {currentInfo.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Global Search (Desktop & Tablet) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onGlobalSearchSubmit();
              }}
              className="hidden lg:flex items-center relative w-56 xl:w-72"
            >
              <Search className="w-4 h-4 text-[#89929E] absolute left-3 pointer-events-none" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => onGlobalSearchChange(e.target.value)}
                placeholder="Cari NPM atau nama mahasiswa..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-[#F7F8FA] border border-slate-200 rounded-[10px] text-[#202A35] placeholder:text-[#89929E] focus:outline-none focus:bg-white focus:border-[#0D3A2B]"
              />
            </form>

            {/* Quick Import Excel CTA */}
            {permissions.canImportExcel(profile.role) && activeTab !== 'import' && (
              <button
                type="button"
                onClick={() => handleSelectTab('import')}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-[#0D3A2B] text-white text-xs font-medium hover:bg-[#146B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#F4B400]" />
                <span>Import Excel</span>
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileMenuOpen(false);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-[#202A35] relative cursor-pointer"
                aria-label="Notifikasi sistem"
              >
                <Bell className="w-4 h-4" />
                {(incompleteCount > 0 || totalStudents === 0) && (
                  <span className="sr-only">Ada informasi penting</span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-[14px] shadow-lg p-4 z-40">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <p className="font-display text-xs font-semibold text-[#202A35]">
                      Ringkasan Status Data
                    </p>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#5E6875] hover:text-[#202A35]"
                    >
                      Tutup
                    </button>
                  </div>
                  <div className="mt-3 space-y-2.5 text-xs">
                    {totalStudents === 0 ? (
                      <div className="p-3 rounded-[10px] bg-amber-50 border border-amber-200/80 text-amber-900">
                        Database mahasiswa masih kosong. Silakan unggah file Excel
                        DATA MAHASISWA 2024-2026 untuk memulai.
                      </div>
                    ) : (
                      <div className="p-3 rounded-[10px] bg-[#F7F8FA] border border-slate-200/80 text-[#202A35]">
                        Tercatat <strong className="tabular-nums">{totalStudents}</strong>{' '}
                        mahasiswa di sistem.{' '}
                        {incompleteCount > 0
                          ? `${incompleteCount} profil memiliki field opsional kosong (sekolah/kecamatan/telepon).`
                          : 'Seluruh profil mahasiswa terisi lengkap.'}
                      </div>
                    )}

                    {permissions.canViewAuditLogs(profile.role) && recentLogs.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <p className="text-[11px] font-medium text-[#5E6875]">
                          Aktivitas Terbaru
                        </p>
                        {recentLogs.slice(0, 3).map((log) => (
                          <div key={log.id} className="text-[11px] text-[#475569]">
                            <p className="font-medium text-[#202A35] truncate">
                              {log.description}
                            </p>
                            <p className="text-[#89929E]">
                              {log.user_name} · {formatDateTimeId(log.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="h-9 sm:h-10 pl-1.5 pr-2.5 rounded-[10px] border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-[7px] object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-[7px] bg-[#0D3A2B] text-white text-[11px] font-semibold flex items-center justify-center">
                    {initials}
                  </span>
                )}
                <span className="hidden sm:inline text-xs font-medium text-[#202A35] max-w-[120px] truncate">
                  {profile.full_name}
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-[14px] shadow-lg p-3 z-40">
                  <div className="px-2 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-[#202A35] truncate">
                      {profile.full_name}
                    </p>
                    <p className="text-[11px] text-[#5E6875] truncate">{profile.email}</p>
                    <p className="text-[11px] font-medium text-[#0D3A2B] mt-1">
                      Peran: {ROLE_LABELS[profile.role]}
                    </p>
                  </div>
                  <div className="pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('settings')}
                      className="w-full px-2.5 py-2 rounded-[9px] text-xs font-medium text-[#202A35] hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#5E6875]" />
                      <span>Pengaturan Sistem</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onLogout()}
                      className="w-full px-2.5 py-2 rounded-[9px] text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="no-print md:hidden fixed bottom-0 inset-x-0 h-14 bg-white/95 backdrop-blur-xs border-t border-slate-200 flex items-center justify-around px-1 z-30"
        aria-label="Navigasi Cepat Mobile"
      >
        {[
          { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students' as NavTab, label: 'Mahasiswa', icon: GraduationCap },
          { id: 'analytics' as NavTab, label: 'Analisis', icon: BarChart3 },
          {
            id: (permissions.canImportExcel(profile.role) ? 'import' : 'reports') as NavTab,
            label: permissions.canImportExcel(profile.role) ? 'Import' : 'Laporan',
            icon: permissions.canImportExcel(profile.role) ? FileSpreadsheet : FileText,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = isTabActive(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-11 rounded-[10px] text-[11px] font-medium',
                active ? 'text-[#0D3A2B]' : 'text-[#64748B]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-11 rounded-[10px] text-[11px] font-medium text-[#64748B]"
        >
          <Menu className="w-4 h-4" />
          <span>Lainnya</span>
        </button>
      </nav>
    </div>
  );
}
