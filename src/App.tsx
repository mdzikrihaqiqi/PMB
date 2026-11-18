import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { Toaster, toast } from 'sonner';
import {
  permissions,
  type ActivityLog,
  type NavTab,
  type Student,
  type StudentWithContact,
  type SystemSettings,
  type UserInvite,
  type UserProfile,
} from './types';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  bulkDeleteStudents,
  createStudent,
  deleteStudent,
  logActivity,
  subscribeActivityLogs,
  subscribeProfiles,
  subscribeStudentContacts,
  subscribeStudents,
  subscribeSystemSettings,
  subscribeUserInvites,
  syncUserProfileOnLogin,
  updateStudent,
} from './lib/firestoreService';
import { computeStudentCompleteness, DEFAULT_SYSTEM_SETTINGS } from './lib/utils';
import { ErrorBoundary, Skeleton } from './components/ui/Primitives';
import { LoginView } from './components/LoginView';
import { Layout } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { StudentDetailView } from './components/StudentDetailView';
import { StudentFormModal, type StudentFormValues } from './components/StudentFormModal';
import { AnalyticsView } from './components/AnalyticsView';
import { ImportExcelView } from './components/ImportExcelView';
import { ReportsView } from './components/ReportsView';
import { AuditLogsView } from './components/AuditLogsView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';

function MainApp() {
  const [authLoading, setAuthLoading] = useState(true);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [deactivatedMsg, setDeactivatedMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  const [students, setStudents] = useState<Student[]>([]);
  const [contactsMap, setContactsMap] = useState<Record<string, string | null>>({});
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserInvite[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [settings, setSettings] = useState<SystemSettings>({ ...DEFAULT_SYSTEM_SETTINGS });

  const [selectedStudentNpm, setSelectedStudentNpm] = useState<string | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithContact | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      try {
        const synced = await syncUserProfileOnLogin(user);
        if (!synced.is_active) {
          setDeactivatedMsg(
            'Akun Anda sedang dinonaktifkan oleh Super Admin. Hubungi administrator FEBI UNSUR.'
          );
          await signOut(auth);
          setProfile(null);
        } else {
          setDeactivatedMsg(null);
          setProfile(synced);
        }
      } catch (err) {
        console.error('Gagal menyinkronkan profil:', err);
        setLoginError(
          err instanceof Error
            ? err.message
            : 'Gagal memverifikasi profil pengguna di database.'
        );
        setProfile(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile) {
      setStudents([]);
      setContactsMap({});
      setLogs([]);
      setProfiles([]);
      setInvites([]);
      return;
    }

    setLoadingStudents(true);
    const unsubStudents = subscribeStudents(
      (list) => {
        setStudents(list);
        setLoadingStudents(false);
      },
      (err) => {
        console.error('Gagal memuat mahasiswa:', err);
        setLoadingStudents(false);
        toast.error('Gagal memuat data mahasiswa.');
      }
    );

    const canPhone = permissions.canViewPhone(profile.role);
    const unsubContacts = subscribeStudentContacts(
      canPhone,
      (map) => setContactsMap(map),
      (err) => console.error('Gagal memuat kontak:', err)
    );

    const unsubSettings = subscribeSystemSettings((s) => setSettings(s));

    const canAudit = permissions.canViewAuditLogs(profile.role);
    setLoadingLogs(canAudit);
    const unsubLogs = subscribeActivityLogs(
      canAudit,
      (list) => {
        setLogs(list);
        setLoadingLogs(false);
      },
      (err) => {
        console.error('Gagal memuat audit logs:', err);
        setLoadingLogs(false);
      }
    );

    const canViewUsers = permissions.canViewUsers(profile.role);
    const isSuper = permissions.canManageUsers(profile.role);
    setLoadingUsers(canViewUsers);
    const unsubProfiles = subscribeProfiles(
      canViewUsers,
      (list) => {
        setProfiles(list);
        setLoadingUsers(false);
      },
      (err) => {
        console.error('Gagal memuat pengguna:', err);
        setLoadingUsers(false);
      }
    );
    const unsubInvites = subscribeUserInvites(
      isSuper,
      (list) => setInvites(list),
      (err) => console.error('Gagal memuat undangan:', err)
    );

    return () => {
      unsubStudents();
      unsubContacts();
      unsubSettings();
      unsubLogs();
      unsubProfiles();
      unsubInvites();
    };
  }, [profile]);

  const studentsWithContacts: StudentWithContact[] = useMemo(() => {
    const canPhone = permissions.canViewPhone(profile?.role);
    return students.map((s) => ({
      ...s,
      no_telp: canPhone ? contactsMap[s.npm] ?? null : null,
    }));
  }, [students, contactsMap, profile?.role]);

  const existingNpms = useMemo(() => new Set(students.map((s) => s.npm)), [students]);
  const prodiSuggestions = useMemo(
    () => Array.from(new Set(students.map((s) => s.prodi))),
    [students]
  );

  const incompleteCount = useMemo(
    () => students.filter((s) => computeStudentCompleteness(s) < 100).length,
    [students]
  );

  const selectedStudent = useMemo(
    () =>
      selectedStudentNpm
        ? studentsWithContacts.find((s) => s.npm === selectedStudentNpm) || null
        : null,
    [selectedStudentNpm, studentsWithContacts]
  );

  const handleSignIn = async () => {
    setLoginError(null);
    setDeactivatedMsg(null);
    setLoginBusy(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.';
      setLoginError(msg);
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (profile) {
      await logActivity(profile, 'LOGOUT', `Logout dari sistem`, profile.email);
    }
    await signOut(auth);
    setActiveTab('dashboard');
    toast.success('Anda telah keluar dari sistem.');
  };

  const handleSaveStudent = async (values: StudentFormValues, isEdit: boolean) => {
    if (!profile) return;
    try {
      if (isEdit && editingStudent) {
        await updateStudent(
          editingStudent.npm,
          editingStudent,
          {
            nama: values.nama,
            prodi: values.prodi,
            angkatan: values.angkatan,
            kelas: values.kelas,
            asal_sekolah: values.asal_sekolah?.trim() || null,
            kecamatan: values.kecamatan?.trim() || null,
            no_telp: values.no_telp?.trim() || null,
          },
          profile
        );
        toast.success(`Data ${values.nama} (${editingStudent.npm}) diperbarui.`);
      } else {
        await createStudent(
          {
            npm: values.npm,
            nama: values.nama,
            prodi: values.prodi,
            angkatan: values.angkatan,
            kelas: values.kelas,
            asal_sekolah: values.asal_sekolah?.trim() || null,
            kecamatan: values.kecamatan?.trim() || null,
            no_telp: values.no_telp?.trim() || null,
          },
          profile
        );
        toast.success(`Mahasiswa ${values.nama} (${values.npm}) berhasil ditambahkan.`);
      }
      setStudentModalOpen(false);
      setEditingStudent(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan data mahasiswa.');
    }
  };

  const handleDeleteSingle = async (student: StudentWithContact) => {
    if (!profile) return;
    try {
      await deleteStudent(student.npm, student.nama, profile);
      toast.success(`Data ${student.nama} (${student.npm}) dihapus.`);
      if (selectedStudentNpm === student.npm) {
        setSelectedStudentNpm(null);
        setActiveTab('students');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus data mahasiswa.');
    }
  };

  const handleBulkDelete = async (items: StudentWithContact[]) => {
    if (!profile) return;
    try {
      await bulkDeleteStudents(
        items.map((x) => ({ npm: x.npm, nama: x.nama })),
        profile
      );
      toast.success(`${items.length} data mahasiswa berhasil dihapus.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus data massal.');
    }
  };

  const handleNavigate = (tab: NavTab) => {
    if (tab === 'import' && !permissions.canImportExcel(profile?.role)) {
      toast.error('Hak akses Anda tidak diizinkan membuka modul Import Excel.');
      return;
    }
    if (tab === 'audit-logs' && !permissions.canViewAuditLogs(profile?.role)) {
      toast.error('Log aktivitas hanya dapat diakses oleh Admin dan Super Admin.');
      return;
    }
    if (tab === 'users' && !permissions.canViewUsers(profile?.role)) {
      toast.error('Manajemen pengguna hanya dapat diakses oleh Administrator.');
      return;
    }
    setActiveTab(tab);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] p-6 sm:p-10 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <LoginView
        onSignIn={handleSignIn}
        loading={loginBusy}
        errorMessage={loginError}
        deactivatedMessage={deactivatedMsg}
      />
    );
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onNavigate={handleNavigate}
        profile={profile}
        settings={settings}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onGlobalSearchSubmit={() => setActiveTab('students')}
        onLogout={handleLogout}
        incompleteCount={incompleteCount}
        totalStudents={students.length}
        recentLogs={logs}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            students={students}
            loading={loadingStudents}
            userRole={profile.role}
            userEmail={profile.email}
            onNavigate={handleNavigate}
            onOpenAddStudent={() => {
              setEditingStudent(null);
              setStudentModalOpen(true);
            }}
          />
        )}

        {activeTab === 'students' && (
          <StudentsView
            students={studentsWithContacts}
            loading={loadingStudents}
            profile={profile}
            settings={settings}
            searchQuery={globalSearch}
            onSearchQueryChange={setGlobalSearch}
            onViewDetail={(s) => {
              setSelectedStudentNpm(s.npm);
              setActiveTab('student-detail');
            }}
            onOpenAdd={() => {
              setEditingStudent(null);
              setStudentModalOpen(true);
            }}
            onOpenEdit={(s) => {
              setEditingStudent(s);
              setStudentModalOpen(true);
            }}
            onDeleteSingle={handleDeleteSingle}
            onBulkDelete={handleBulkDelete}
            onNavigateImport={() => handleNavigate('import')}
          />
        )}

        {activeTab === 'student-detail' && selectedStudent && (
          <StudentDetailView
            student={selectedStudent}
            profile={profile}
            settings={settings}
            onBack={() => setActiveTab('students')}
            onEdit={(s) => {
              setEditingStudent(s);
              setStudentModalOpen(true);
            }}
            onDelete={handleDeleteSingle}
          />
        )}

        {activeTab === 'student-detail' && !selectedStudent && (
          <StudentsView
            students={studentsWithContacts}
            loading={loadingStudents}
            profile={profile}
            settings={settings}
            searchQuery={globalSearch}
            onSearchQueryChange={setGlobalSearch}
            onViewDetail={(s) => {
              setSelectedStudentNpm(s.npm);
              setActiveTab('student-detail');
            }}
            onOpenAdd={() => {
              setEditingStudent(null);
              setStudentModalOpen(true);
            }}
            onOpenEdit={(s) => {
              setEditingStudent(s);
              setStudentModalOpen(true);
            }}
            onDeleteSingle={handleDeleteSingle}
            onBulkDelete={handleBulkDelete}
            onNavigateImport={() => handleNavigate('import')}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView students={students} />}

        {activeTab === 'import' && permissions.canImportExcel(profile.role) && (
          <ImportExcelView
            existingStudents={students}
            existingContactsMap={contactsMap}
            profile={profile}
            settings={settings}
            onImportComplete={() => setActiveTab('students')}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            students={studentsWithContacts}
            profile={profile}
            settings={settings}
          />
        )}

        {activeTab === 'audit-logs' && permissions.canViewAuditLogs(profile.role) && (
          <AuditLogsView logs={logs} loading={loadingLogs} />
        )}

        {activeTab === 'users' && permissions.canViewUsers(profile.role) && (
          <UsersView
            currentProfile={profile}
            profiles={profiles}
            invites={invites}
            loading={loadingUsers}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            settings={settings}
            students={studentsWithContacts}
            onNavigate={handleNavigate}
          />
        )}
      </Layout>

      <StudentFormModal
        open={studentModalOpen}
        onClose={() => {
          setStudentModalOpen(false);
          setEditingStudent(null);
        }}
        editingStudent={editingStudent}
        existingNpms={existingNpms}
        prodiSuggestions={prodiSuggestions}
        onSubmitStudent={handleSaveStudent}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
      <Toaster position="top-right" richColors closeButton />
    </ErrorBoundary>
  );
}
