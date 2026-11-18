-- ============================================================================
-- Migration SQL Referensi (Supabase PostgreSQL)
-- Sistem Informasi Data Mahasiswa FEBI UNSUR
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles & RBAC
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER')) DEFAULT 'VIEWER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Students
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  npm TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  prodi TEXT NOT NULL,
  angkatan INTEGER NOT NULL CHECK (angkatan BETWEEN 2018 AND 2035),
  asal_sekolah TEXT NULL,
  kecamatan TEXT NULL,
  no_telp TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_npm ON public.students (npm);
CREATE INDEX IF NOT EXISTS idx_students_nama ON public.students (nama);
CREATE INDEX IF NOT EXISTS idx_students_prodi ON public.students (prodi);
CREATE INDEX IF NOT EXISTS idx_students_angkatan ON public.students (angkatan);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students (kelas);
CREATE INDEX IF NOT EXISTS idx_students_kecamatan ON public.students (kecamatan);

-- 3. Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- 4. System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Helper role check
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies
CREATE POLICY "Users can read own profile or admin reads all"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "Super Admin manages profiles"
  ON public.profiles FOR ALL
  USING (public.get_my_role() = 'SUPER_ADMIN');

CREATE POLICY "Authenticated active users can view students"
  ON public.students FOR SELECT
  USING (public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'));

CREATE POLICY "Staff can insert and update students"
  ON public.students FOR INSERT
  WITH CHECK (public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR'));

CREATE POLICY "Staff can update students"
  ON public.students FOR UPDATE
  USING (public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN', 'OPERATOR'));

CREATE POLICY "Admins can delete students"
  ON public.students FOR DELETE
  USING (public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "Admins read activity logs"
  ON public.activity_logs FOR SELECT
  USING (public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN'));

CREATE POLICY "Active users insert own logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users read settings"
  ON public.system_settings FOR SELECT
  USING (public.get_my_role() IS NOT NULL);

CREATE POLICY "Super Admin updates settings"
  ON public.system_settings FOR ALL
  USING (public.get_my_role() = 'SUPER_ADMIN');
