import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { StudentWithContact } from '../types';
import { Button, Modal } from './ui/Primitives';

const studentSchema = z.object({
  npm: z
    .string()
    .trim()
    .min(4, 'NPM minimal 4 karakter')
    .max(32, 'NPM maksimal 32 karakter')
    .regex(/^[a-zA-Z0-9_-]+$/, 'NPM hanya boleh berisi huruf, angka, tanda hubung, atau garis bawah'),
  nama: z
    .string()
    .trim()
    .min(1, 'Nama mahasiswa wajib diisi')
    .max(150, 'Nama maksimal 150 karakter'),
  prodi: z
    .string()
    .trim()
    .min(1, 'Program studi wajib diisi')
    .max(100, 'Program studi maksimal 100 karakter'),
  angkatan: z.coerce
    .number()
    .int('Angkatan harus berupa tahun bulat')
    .min(2018, 'Angkatan minimal 2018')
    .max(2035, 'Angkatan maksimal 2035'),
  kelas: z
    .string()
    .trim()
    .min(1, 'Kelas wajib diisi')
    .max(40, 'Kelas maksimal 40 karakter'),
  asal_sekolah: z.string().max(150, 'Asal sekolah maksimal 150 karakter').optional(),
  kecamatan: z.string().max(100, 'Kecamatan maksimal 100 karakter').optional(),
  no_telp: z.string().max(32, 'Nomor telepon maksimal 32 karakter').optional(),
});

export type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  editingStudent: StudentWithContact | null;
  existingNpms: Set<string>;
  prodiSuggestions: string[];
  onSubmitStudent: (values: StudentFormValues, isEdit: boolean) => Promise<void>;
}

const DEFAULT_PRODIS = [
  'Ekonomi Syariah',
  'Perbankan Syariah',
  'Manajemen Bisnis Syariah',
  'Akuntansi Syariah',
];

export function StudentFormModal({
  open,
  onClose,
  editingStudent,
  existingNpms,
  prodiSuggestions,
  onSubmitStudent,
}: StudentFormModalProps) {
  const isEdit = Boolean(editingStudent);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as never,
    defaultValues: {
      npm: '',
      nama: '',
      prodi: 'Ekonomi Syariah',
      angkatan: 2025,
      kelas: 'A',
      asal_sekolah: '',
      kecamatan: '',
      no_telp: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (editingStudent) {
        reset({
          npm: editingStudent.npm,
          nama: editingStudent.nama,
          prodi: editingStudent.prodi,
          angkatan: editingStudent.angkatan,
          kelas: editingStudent.kelas,
          asal_sekolah: editingStudent.asal_sekolah ?? '',
          kecamatan: editingStudent.kecamatan ?? '',
          no_telp: editingStudent.no_telp ?? '',
        });
      } else {
        reset({
          npm: '',
          nama: '',
          prodi: prodiSuggestions[0] || 'Ekonomi Syariah',
          angkatan: 2025,
          kelas: 'A',
          asal_sekolah: '',
          kecamatan: '',
          no_telp: '',
        });
      }
    }
  }, [open, editingStudent, prodiSuggestions, reset]);

  const mergedProdis = Array.from(new Set([...DEFAULT_PRODIS, ...prodiSuggestions])).sort((a, b) =>
    a.localeCompare(b, 'id')
  );

  const onValidSubmit = async (values: StudentFormValues) => {
    if (!isEdit && existingNpms.has(values.npm.trim())) {
      setError('npm', {
        type: 'manual',
        message: `NPM ${values.npm.trim()} sudah terdaftar. NPM tidak boleh duplikat.`,
      });
      return;
    }
    await onSubmitStudent(values, isEdit);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Mahasiswa · ${editingStudent?.npm}` : 'Tambah Mahasiswa Baru'}
      subtitle="Field opsional dapat dikosongkan dan akan tersimpan sebagai NULL."
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onValidSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              NPM <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register('npm')}
              disabled={isEdit}
              placeholder="Contoh: 4120124001"
              className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-200 rounded-[10px] disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#0D3A2B]"
            />
            {errors.npm && (
              <p className="text-xs text-red-600 mt-1">{errors.npm.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Nama Lengkap <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              {...register('nama')}
              placeholder="Nama sesuai ijazah/PDDIKTI"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
            />
            {errors.nama && (
              <p className="text-xs text-red-600 mt-1">{errors.nama.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Program Studi <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              list="febi-prodi-list"
              {...register('prodi')}
              placeholder="Pilih atau ketik program studi"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
            />
            <datalist id="febi-prodi-list">
              {mergedProdis.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            {errors.prodi && (
              <p className="text-xs text-red-600 mt-1">{errors.prodi.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Angkatan <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                {...register('angkatan')}
                min={2018}
                max={2035}
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
              />
              {errors.angkatan && (
                <p className="text-xs text-red-600 mt-1">{errors.angkatan.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202A35] mb-1.5">
                Kelas <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                {...register('kelas')}
                placeholder="Misal: A / NR"
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
              />
              {errors.kelas && (
                <p className="text-xs text-red-600 mt-1">{errors.kelas.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Asal Sekolah
            </label>
            <input
              type="text"
              {...register('asal_sekolah')}
              placeholder="Contoh: SMAN 1 Cianjur (opsional)"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
            />
            {errors.asal_sekolah && (
              <p className="text-xs text-red-600 mt-1">{errors.asal_sekolah.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Kecamatan
            </label>
            <input
              type="text"
              {...register('kecamatan')}
              placeholder="Contoh: Cianjur / Karangtengah"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
            />
            {errors.kecamatan && (
              <p className="text-xs text-red-600 mt-1">{errors.kecamatan.message}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              {...register('no_telp')}
              placeholder="Contoh: 0812xxxxxxxx (opsional, terlindungi RBAC)"
              className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#0D3A2B]"
            />
            {errors.no_telp && (
              <p className="text-xs text-red-600 mt-1">{errors.no_telp.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Mahasiswa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
