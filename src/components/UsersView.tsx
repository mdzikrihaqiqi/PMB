import React, { useState } from 'react';
import { Pencil, Plus, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  permissions,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type UserInvite,
  type UserProfile,
  type UserRole,
} from '../types';
import {
  createOrUpdateUserInvite,
  deleteUserInvite,
  updateUserRoleAndStatus,
} from '../lib/firestoreService';
import { formatDateTimeId } from '../lib/utils';
import { Button, ConfirmDialog, Modal, Skeleton, SurfaceCard } from './ui/Primitives';

interface UsersViewProps {
  currentProfile: UserProfile;
  profiles: UserProfile[];
  invites: UserInvite[];
  loading: boolean;
}

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'];

export function UsersView({
  currentProfile,
  profiles,
  invites,
  loading,
}: UsersViewProps) {
  const canManage = permissions.canManageUsers(currentProfile.role);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('OPERATOR');
  const [savingInvite, setSavingInvite] = useState(false);

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('VIEWER');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteInviteTarget, setDeleteInviteTarget] = useState<UserInvite | null>(null);

  const handleSaveInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) {
      toast.error('Email dan nama lengkap wajib diisi.');
      return;
    }
    setSavingInvite(true);
    try {
      await createOrUpdateUserInvite(inviteEmail, inviteName, inviteRole, currentProfile);
      toast.success(`Undangan peran ${ROLE_LABELS[inviteRole]} disimpan untuk ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('OPERATOR');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan undangan.');
    } finally {
      setSavingInvite(false);
    }
  };

  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.full_name);
    setEditRole(u.role);
    setEditActive(u.is_active);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await updateUserRoleAndStatus(
        editingUser.uid,
        editingUser.email,
        {
          full_name: editName,
          role: editRole,
          is_active: editActive,
        },
        currentProfile
      );
      toast.success(`Hak akses ${editingUser.email} diperbarui.`);
      setEditingUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui hak akses.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteInvite = async () => {
    if (!deleteInviteTarget) return;
    try {
      await deleteUserInvite(deleteInviteTarget.id, deleteInviteTarget.email, currentProfile);
      toast.success('Undangan peran dihapus.');
      setDeleteInviteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus undangan.');
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-5">
      {/* Role Reference Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {ALL_ROLES.map((role) => (
          <SurfaceCard key={role} className="p-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0D3A2B]" />
              <p className="font-display text-xs font-bold text-[#202A35]">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <p className="text-xs text-[#5E6875] leading-relaxed">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </SurfaceCard>
        ))}
      </div>

      {/* Active Users Table */}
      <SurfaceCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-bold text-[#202A35]">
              Daftar Pengguna Terdaftar ({profiles.length})
            </h2>
            <p className="text-xs text-[#5E6875] mt-0.5">
              Validasi peran diterapkan secara ketat di database dan kontrol antarmuka.
            </p>
          </div>

          {canManage && (
            <Button type="button" onClick={() => setInviteModalOpen(true)}>
              <UserPlus className="w-4 h-4" />
              <span>Tetapkan Akses Email</span>
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                <th className="px-4 py-3">Nama Pengguna</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Peran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Login Terakhir</th>
                {canManage && <th className="px-4 py-3">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {profiles.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-[#202A35]">
                    {u.full_name}
                    {u.uid === currentProfile.uid && (
                      <span className="ml-2 text-[11px] text-[#0D3A2B] font-semibold">
                        (Anda)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{u.email}</td>
                  <td className="px-4 py-3 font-semibold text-[#0D3A2B]">
                    {ROLE_LABELS[u.role]}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.is_active
                          ? 'text-[#146B4A] font-medium'
                          : 'text-[#DC2626] font-medium'
                      }
                    >
                      {u.is_active ? 'Aktif' : 'Dinonaktifkan'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#5E6875]">
                    {formatDateTimeId(u.last_login_at)}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditUser(u)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Ubah Role</span>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      {/* Pre-assigned Role Invites (Super Admin) */}
      {canManage && (
        <SurfaceCard className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80">
            <h3 className="font-display text-sm font-semibold text-[#202A35]">
              Pra-Registrasi Hak Akses Email ({invites.length})
            </h3>
            <p className="text-xs text-[#5E6875] mt-0.5">
              Pengguna baru yang masuk dengan email Google di bawah ini otomatis menerima peran yang ditetapkan.
            </p>
          </div>
          {invites.length === 0 ? (
            <div className="p-6 text-xs text-[#5E6875]">
              Belum ada pra-registrasi email. Klik &ldquo;Tetapkan Akses Email&rdquo; untuk mendaftarkan Admin atau Operator baru.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F8FA] border-b border-slate-200 text-[11px] font-semibold text-[#5E6875]">
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Nama</th>
                    <th className="px-4 py-2.5">Peran Ditetapkan</th>
                    <th className="px-4 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-2.5 font-medium text-[#202A35]">{inv.email}</td>
                      <td className="px-4 py-2.5 text-[#475569]">{inv.full_name}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#0D3A2B]">
                        {ROLE_LABELS[inv.role]}
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setDeleteInviteTarget(inv)}
                          className="text-red-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      )}

      {/* Invite Modal */}
      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Tetapkan Hak Akses Email Baru"
        subtitle="Pengguna akan otomatis mendapat peran ini saat login dengan Google."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Alamat Email Google
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nama@unsur.ac.id atau gmail.com"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Nama staf / pejabat"
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Peran Sistem
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px]"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={savingInvite}>
              <Plus className="w-4 h-4" />
              <span>{savingInvite ? 'Menyimpan...' : 'Simpan Akses'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={`Edit Hak Akses · ${editingUser?.email || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEditUser} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202A35] mb-1.5">
              Peran
            </label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-[10px]"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2.5 text-xs font-medium text-[#202A35] cursor-pointer">
            <input
              type="checkbox"
              checked={editActive}
              disabled={editingUser?.uid === currentProfile.uid}
              onChange={(e) => setEditActive(e.target.checked)}
              className="w-4 h-4 accent-[#0D3A2B]"
            />
            <span>Akun Aktif (dapat mengakses sistem)</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingUser(null)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteInviteTarget)}
        onClose={() => setDeleteInviteTarget(null)}
        onConfirm={handleDeleteInvite}
        title="Hapus Pra-Registrasi Email"
        description={`Hapus penetapan akses untuk ${deleteInviteTarget?.email}?`}
      />
    </div>
  );
}
