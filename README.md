# Sistem Informasi Data Mahasiswa FEBI UNSUR

Aplikasi manajemen data mahasiswa, analitik akademik, import/export Excel, pelaporan resmi PDF, dan audit keamanan berbasis peran untuk **Fakultas Ekonomi dan Bisnis Islam — Universitas Suryakancana**.

## Fitur Utama

1. **Dashboard Utama & KPI Aktual**
   - 8 kartu statistik terhitung langsung dari database: Total Mahasiswa, Angkatan 2024, Angkatan 2025, Angkatan 2026, Total Program Studi, Total Asal Sekolah, Total Kecamatan, dan Kelengkapan Data Mahasiswa.
   - 6 grafik interaktif (Recharts) dengan filter dinamis berdasarkan Angkatan, Program Studi, dan Kelas.
2. **Manajemen Data Mahasiswa (CRUD + TanStack Table)**
   - Pencarian NPM/Nama, multi-filter (Prodi, Angkatan, Kelas, Kecamatan), sorting semua kolom, pagination, pengatur visibilitas kolom, bulk delete, serta mode kartu responsif untuk perangkat mobile.
   - Validasi formulir Zod + React Hook Form dengan proteksi NPM duplikat.
3. **Detail Mahasiswa & Riwayat Perubahan**
   - Profil lengkap mahasiswa, persentase kelengkapan data, cetak profil resmi, serta riwayat perubahan rekaman.
4. **Analisis Data Mahasiswa**
   - Analisis Program Studi, Analisis Angkatan (2024–2026), Analisis Asal Sekolah (termasuk klasifikasi SMA/SMK/MA dari nama sekolah), dan Analisis Kecamatan.
5. **Import Data Excel (`DATA MAHASISWA 2024-2026.xlsx`)**
   - Drag-and-drop file `.xlsx`/`.xls`/`.csv`, template Excel siap unduh, pemetaan kolom otomatis (`no`, `npm`, `nama`, `kelas`, `prodi`, `angkatan`, `asal sekolah`, `kecamatan`, `No telp`), validasi format & deteksi duplikat NPM, laporan kesalahan unduhan, serta opsi Tambah Baru Saja atau Upsert NPM.
6. **Laporan Resmi PDF, Excel & CSV**
   - Kop resmi **FAKULTAS EKONOMI DAN BISNIS ISLAM — UNIVERSITAS SURYAKANCANA**, tanggal pembuatan, dan parameter filter aktif.
7. **Keamanan, RBAC & Audit Log**
   - Peran: `SUPER_ADMIN`, `ADMIN`, `OPERATOR`, `VIEWER`.
   - Nomor telepon mahasiswa terisolasi di koleksi terpisah (`student_contacts`) dan diblokir pada tingkat Security Rules untuk peran `VIEWER`.
   - Log aktivitas mencatat login, logout, CRUD, import, export, manajemen pengguna, dan pengaturan sistem.

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

## Build Production & Deployment

```bash
npm run build
```

Untuk deployment ke Vercel, pastikan konfigurasi build command `npm run build` dan output directory `dist`. File referensi migrasi PostgreSQL/Supabase tersedia di `supabase/migrations/001_init.sql`.
