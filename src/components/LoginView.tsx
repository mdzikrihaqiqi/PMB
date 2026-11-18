import React, { useState } from 'react';
import { ShieldCheck, BarChart3, FileSpreadsheet, Lock } from 'lucide-react';
import { Button } from './ui/Primitives';

interface LoginViewProps {
  onSignIn: () => Promise<void>;
  loading: boolean;
  errorMessage: string | null;
  deactivatedMessage?: string | null;
}

export function LoginView({
  onSignIn,
  loading,
  errorMessage,
  deactivatedMessage,
}: LoginViewProps) {
  const [emblemError, setEmblemError] = useState(false);
  const [campusError, setCampusError] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col lg:flex-row">
      {/* Left Brand & Institutional Visual Panel */}
      <div className="lg:w-[54%] relative bg-[#0D3A2B] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden">
        {!campusError ? (
          <img
            src="/src/assets/images/febi_login_campus_1794985241925.jpg"
            alt="Gedung Fakultas Ekonomi dan Bisnis Islam Universitas Suryakancana"
            referrerPolicy="no-referrer"
            onError={() => setCampusError(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-28"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0D3A2B] via-[#0D3A2B]/85 to-[#0D3A2B]/70"
          aria-hidden="true"
        />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-[11px] bg-white p-1.5 flex items-center justify-center shadow-xs shrink-0">
            {!emblemError ? (
              <img
                src="/src/assets/images/febi_unsur_emblem_1794985241331.jpg"
                alt="Logo FEBI UNSUR"
                referrerPolicy="no-referrer"
                onError={() => setEmblemError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <ShieldCheck className="w-6 h-6 text-[#0D3A2B]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold tracking-tight text-white">
              FEBI Universitas Suryakancana
            </p>
            <p className="text-xs text-white/75">
              Fakultas Ekonomi dan Bisnis Islam
            </p>
          </div>
        </div>

        <div className="relative z-10 my-10 lg:my-0 max-w-xl">
          <p className="text-xs font-medium text-[#F4B400] tracking-wide mb-3">
            Portal Akademik & Analitik Mahasiswa
          </p>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-white [text-wrap:balance]">
            Sistem Informasi Data Mahasiswa FEBI UNSUR
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed">
            Pusat pengelolaan data mahasiswa angkatan 2024–2026 yang terstruktur,
            aman dengan kontrol akses berbasis peran, serta siap untuk analisis
            program studi, sekolah asal, dan pelaporan fakultas.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/15">
            <div className="flex items-start gap-2.5">
              <BarChart3 className="w-4 h-4 text-[#F4B400] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Analitik Aktual</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Prodi, angkatan, sekolah, dan kecamatan
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-[#F4B400] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Import & Export</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Validasi Excel & laporan PDF resmi
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#F4B400] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white">Keamanan RBAC</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Isolasi PII & audit aktivitas penuh
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/65">
          Jl. Pasir Gede Raya, Bojongherang, Cianjur · Universitas Suryakancana
        </div>
      </div>

      {/* Right Authentication Card */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-[14px] p-6 sm:p-8 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-[#202A35]">
              Masuk ke Sistem
            </h2>
            <p className="text-sm text-[#5E6875] mt-1.5 leading-relaxed">
              Gunakan akun Google resmi atau email yang telah didaftarkan oleh
              Super Admin fakultas.
            </p>
          </div>

          {deactivatedMessage && (
            <div className="mb-5 p-3.5 rounded-[11px] bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {deactivatedMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-[11px] bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {errorMessage}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            onClick={onSignIn}
            disabled={loading}
            className="w-full justify-center gap-3"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
              />
            </svg>
            <span>{loading ? 'Memverifikasi Akun...' : 'Masuk dengan Google'}</span>
          </Button>

          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-[#5E6875]">
            <p className="font-medium text-[#202A35]">Tingkat Hak Akses Sistem</p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-[10px] bg-[#F7F8FA] border border-slate-200/70">
                <p className="font-semibold text-[#0D3A2B]">Super Admin</p>
                <p className="text-[#5E6875] mt-0.5">Kontrol penuh & pengguna</p>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#F7F8FA] border border-slate-200/70">
                <p className="font-semibold text-[#146B4A]">Admin</p>
                <p className="text-[#5E6875] mt-0.5">CRUD, import, laporan, log</p>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#F7F8FA] border border-slate-200/70">
                <p className="font-semibold text-[#202A35]">Operator</p>
                <p className="text-[#5E6875] mt-0.5">Tambah & edit data</p>
              </div>
              <div className="p-2.5 rounded-[10px] bg-[#F7F8FA] border border-slate-200/70">
                <p className="font-semibold text-[#5E6875]">Viewer</p>
                <p className="text-[#5E6875] mt-0.5">Baca dashboard & prodi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
