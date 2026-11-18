export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface UserProfile {
  uid: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  last_login_at?: Date | null;
}

export interface UserInvite {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_by: string;
  created_at?: Date | null;
}

export interface Student {
  id: string;
  faculty_code: 'FEBI_UNSUR';
  npm: string;
  nama: string;
  prodi: string;
  angkatan: number;
  kelas: string;
  asal_sekolah: string | null;
  kecamatan: string | null;
  has_phone: boolean;
  created_by: string;
  updated_by: string;
  created_at?: Date | null;
  updated_at?: Date | null;
}

export interface StudentContact {
  id: string;
  faculty_code: 'FEBI_UNSUR';
  npm: string;
  no_telp: string | null;
  updated_by: string;
  updated_at?: Date | null;
}

export interface StudentWithContact extends Student {
  no_telp: string | null;
}

export type StudentHistoryAction = 'CREATE' | 'UPDATE' | 'IMPORT_CREATE' | 'IMPORT_UPDATE';

export interface StudentHistory {
  id: string;
  student_id: string;
  npm: string;
  action: StudentHistoryAction;
  changed_fields: string;
  summary: string;
  actor_uid: string;
  actor_name: string;
  created_at?: Date | null;
}

export type ActivityType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_STUDENT'
  | 'UPDATE_STUDENT'
  | 'DELETE_STUDENT'
  | 'BULK_DELETE_STUDENT'
  | 'IMPORT_EXCEL'
  | 'EXPORT_DATA'
  | 'USER_MANAGEMENT'
  | 'SYSTEM_SETTINGS';

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: UserRole;
  activity_type: ActivityType;
  description: string;
  target_entity?: string | null;
  created_at?: Date | null;
}

export interface SystemSettings {
  faculty_code: 'FEBI_UNSUR';
  setting_key: string;
  faculty_name: string;
  university_name: string;
  app_name: string;
  app_short_name: string;
  address: string;
  max_import_mb: number;
  allow_upsert_by_npm: boolean;
  updated_by?: string;
  updated_at?: Date | null;
}

export interface StudentFilters {
  search: string;
  prodi: string;
  angkatan: string;
  kelas: string;
  kecamatan: string;
}

export type ImportMode = 'insert_only' | 'upsert_by_npm';

export interface ImportRowInput {
  rowNumber: number;
  no: string | null;
  npm: string;
  nama: string;
  kelas: string;
  prodi: string;
  angkatan: number | null;
  asal_sekolah: string | null;
  kecamatan: string | null;
  no_telp: string | null;
}

export interface ImportValidatedRow {
  rowNumber: number;
  status: 'valid_new' | 'valid_update' | 'error';
  errors: string[];
  data: {
    npm: string;
    nama: string;
    kelas: string;
    prodi: string;
    angkatan: number;
    asal_sekolah: string | null;
    kecamatan: string | null;
    no_telp: string | null;
  } | null;
  raw: Record<string, unknown>;
}

export interface ImportValidationReport {
  fileName: string;
  totalRows: number;
  validNewCount: number;
  validUpdateCount: number;
  errorCount: number;
  detectedColumns: { source: string; target: string }[];
  rows: ImportValidatedRow[];
}

export type NavTab =
  | 'dashboard'
  | 'students'
  | 'student-detail'
  | 'analytics'
  | 'import'
  | 'reports'
  | 'audit-logs'
  | 'users'
  | 'settings';

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Akses penuh ke seluruh fitur, manajemen pengguna, hak akses, data mahasiswa, dan konfigurasi sistem.',
  ADMIN: 'Melihat, menambah, mengedit, menghapus data mahasiswa, import/export Excel, laporan, dan audit log.',
  OPERATOR: 'Melihat, menambah, dan mengedit data mahasiswa serta kontak sesuai hak akses operasional.',
  VIEWER: 'Hanya melihat dashboard, statistik, dan direktori akademik tanpa akses nomor telepon atau perubahan data.',
};

export const permissions = {
  canViewPhone: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATOR',
  canCreateOrEditStudent: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATOR',
  canDeleteStudent: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN',
  canImportExcel: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN',
  canExportData: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATOR',
  canViewAuditLogs: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN',
  canManageUsers: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN',
  canViewUsers: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN' || role === 'ADMIN',
  canEditSettings: (role?: UserRole | null) =>
    role === 'SUPER_ADMIN',
};
