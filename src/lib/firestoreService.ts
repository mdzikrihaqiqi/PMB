import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  ActivityLog,
  ActivityType,
  ImportMode,
  ImportValidatedRow,
  Student,
  StudentContact,
  StudentHistory,
  SystemSettings,
  UserInvite,
  UserProfile,
  UserRole,
} from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { DEFAULT_SYSTEM_SETTINGS, emailToSafeId } from './utils';

const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'alfanwira@gmail.com';

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

export async function syncUserProfileOnLogin(user: User): Promise<UserProfile> {
  const email = (user.email || '').trim();
  const profileRef = doc(db, 'profiles', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(profileRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}`);
  }

  const displayName = (user.displayName || email.split('@')[0] || 'Pengguna').slice(0, 120);
  const avatarUrl = user.photoURL ? user.photoURL.slice(0, 500) : null;

  if (existingSnap.exists()) {
    const data = existingSnap.data();
    const isBootstrapAdmin =
      email.toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL && user.emailVerified;
    const resolvedExistingRole: UserRole = isBootstrapAdmin
      ? 'SUPER_ADMIN'
      : (data.role as UserRole);

    if (isBootstrapAdmin && (data.role !== 'SUPER_ADMIN' || !data.is_active)) {
      try {
        await updateDoc(profileRef, {
          role: 'SUPER_ADMIN',
          is_active: true,
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${user.uid}`);
      }
    }

    const effectiveActive = isBootstrapAdmin ? true : Boolean(data.is_active);
    if (effectiveActive) {
      try {
        await updateDoc(profileRef, {
          full_name: data.full_name || displayName,
          avatar_url: avatarUrl,
          last_login_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${user.uid}`);
      }
    }

    const profile: UserProfile = {
      uid: user.uid,
      full_name: data.full_name || displayName,
      email: data.email || email,
      role: resolvedExistingRole,
      is_active: isBootstrapAdmin ? true : Boolean(data.is_active),
      avatar_url: avatarUrl,
      created_at: toDate(data.created_at),
      updated_at: new Date(),
      last_login_at: new Date(),
    };

    if (profile.is_active) {
      await logActivity(profile, 'LOGIN', `Login sistem sebagai ${profile.role}`, profile.email);
    }
    return profile;
  }

  let resolvedRole: UserRole = 'VIEWER';
  if (email.toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL && user.emailVerified) {
    resolvedRole = 'SUPER_ADMIN';
  } else if (email) {
    const inviteRef = doc(db, 'user_invites', emailToSafeId(email));
    try {
      const inviteSnap = await getDoc(inviteRef);
      if (inviteSnap.exists()) {
        const inviteRole = inviteSnap.data().role as UserRole;
        if (['SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER'].includes(inviteRole)) {
          resolvedRole = inviteRole;
        }
      }
    } catch {
      // No invite found or not readable; fallback to least-privilege VIEWER
      resolvedRole = 'VIEWER';
    }
  }

  try {
    await setDoc(profileRef, {
      uid: user.uid,
      full_name: displayName,
      email,
      role: resolvedRole,
      is_active: true,
      avatar_url: avatarUrl,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      last_login_at: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `profiles/${user.uid}`);
  }

  const createdProfile: UserProfile = {
    uid: user.uid,
    full_name: displayName,
    email,
    role: resolvedRole,
    is_active: true,
    avatar_url: avatarUrl,
    created_at: new Date(),
    updated_at: new Date(),
    last_login_at: new Date(),
  };

  await logActivity(
    createdProfile,
    'LOGIN',
    `Registrasi sesi pertama & login sebagai ${resolvedRole}`,
    email
  );
  return createdProfile;
}

export async function logActivity(
  actor: Pick<UserProfile, 'uid' | 'full_name' | 'email' | 'role'>,
  activityType: ActivityType,
  description: string,
  targetEntity?: string | null
): Promise<void> {
  const logRef = doc(collection(db, 'activity_logs'));
  try {
    await setDoc(logRef, {
      user_id: actor.uid,
      user_name: (actor.full_name || 'Pengguna').slice(0, 120),
      user_email: (actor.email || '').slice(0, 160),
      user_role: actor.role,
      activity_type: activityType,
      description: description.slice(0, 500),
      target_entity: targetEntity ? targetEntity.slice(0, 160) : null,
      created_at: serverTimestamp(),
    });
  } catch (error) {
    console.error('Gagal mencatat log aktivitas:', error);
  }
}

export function subscribeStudents(
  onData: (students: Student[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'students'),
    where('faculty_code', '==', 'FEBI_UNSUR')
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Student[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          faculty_code: 'FEBI_UNSUR',
          npm: data.npm,
          nama: data.nama,
          prodi: data.prodi,
          angkatan: Number(data.angkatan),
          kelas: data.kelas,
          asal_sekolah: data.asal_sekolah ?? null,
          kecamatan: data.kecamatan ?? null,
          has_phone: Boolean(data.has_phone),
          created_by: data.created_by,
          updated_by: data.updated_by,
          created_at: toDate(data.created_at),
          updated_at: toDate(data.updated_at),
        };
      });
      list.sort((a, b) => a.npm.localeCompare(b.npm, 'id'));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'students');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeStudentContacts(
  enabled: boolean,
  onData: (contactsByNpm: Record<string, string | null>) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!enabled) {
    onData({});
    return () => {};
  }
  const q = query(
    collection(db, 'student_contacts'),
    where('faculty_code', '==', 'FEBI_UNSUR')
  );
  return onSnapshot(
    q,
    (snap) => {
      const map: Record<string, string | null> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        map[data.npm || d.id] = data.no_telp ?? null;
      });
      onData(map);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'student_contacts');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export interface StudentPayload {
  npm: string;
  nama: string;
  prodi: string;
  angkatan: number;
  kelas: string;
  asal_sekolah: string | null;
  kecamatan: string | null;
  no_telp: string | null;
}

export async function createStudent(
  payload: StudentPayload,
  actor: UserProfile
): Promise<void> {
  const npm = payload.npm.trim();
  const studentRef = doc(db, 'students', npm);
  const existing = await getDoc(studentRef);
  if (existing.exists()) {
    throw new Error(`NPM ${npm} sudah terdaftar di database.`);
  }

  const batch = writeBatch(db);
  const hasPhone = Boolean(payload.no_telp && payload.no_telp.trim());

  batch.set(studentRef, {
    faculty_code: 'FEBI_UNSUR',
    npm,
    nama: payload.nama.trim(),
    prodi: payload.prodi.trim(),
    angkatan: Math.trunc(payload.angkatan),
    kelas: payload.kelas.trim(),
    asal_sekolah: payload.asal_sekolah?.trim() || null,
    kecamatan: payload.kecamatan?.trim() || null,
    has_phone: hasPhone,
    created_by: actor.uid,
    updated_by: actor.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const contactRef = doc(db, 'student_contacts', npm);
  batch.set(contactRef, {
    faculty_code: 'FEBI_UNSUR',
    npm,
    no_telp: payload.no_telp?.trim() || null,
    updated_by: actor.uid,
    updated_at: serverTimestamp(),
  });

  const historyRef = doc(collection(db, 'student_history'));
  batch.set(historyRef, {
    student_id: npm,
    npm,
    action: 'CREATE',
    changed_fields: 'Semua field awal',
    summary: `Menambahkan mahasiswa ${payload.nama.trim()} (${npm})`,
    actor_uid: actor.uid,
    actor_name: actor.full_name,
    created_at: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'activity_logs'));
  batch.set(logRef, {
    user_id: actor.uid,
    user_name: actor.full_name,
    user_email: actor.email,
    user_role: actor.role,
    activity_type: 'CREATE_STUDENT',
    description: `Menambahkan data mahasiswa ${payload.nama.trim()} (${npm})`,
    target_entity: npm,
    created_at: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${npm}`);
  }
}

export async function updateStudent(
  npm: string,
  prev: Student & { no_telp?: string | null },
  payload: Omit<StudentPayload, 'npm'>,
  actor: UserProfile
): Promise<void> {
  const studentRef = doc(db, 'students', npm);
  const contactRef = doc(db, 'student_contacts', npm);
  const batch = writeBatch(db);

  const normalizedPhone = payload.no_telp?.trim() || null;
  const hasPhone = Boolean(normalizedPhone);

  const changedFields: string[] = [];
  if (prev.nama !== payload.nama.trim()) changedFields.push('Nama');
  if (prev.prodi !== payload.prodi.trim()) changedFields.push('Program Studi');
  if (prev.angkatan !== Math.trunc(payload.angkatan)) changedFields.push('Angkatan');
  if (prev.kelas !== payload.kelas.trim()) changedFields.push('Kelas');
  if ((prev.asal_sekolah || null) !== (payload.asal_sekolah?.trim() || null))
    changedFields.push('Asal Sekolah');
  if ((prev.kecamatan || null) !== (payload.kecamatan?.trim() || null))
    changedFields.push('Kecamatan');
  if ((prev.no_telp || null) !== normalizedPhone) changedFields.push('No. Telepon');

  batch.update(studentRef, {
    nama: payload.nama.trim(),
    prodi: payload.prodi.trim(),
    angkatan: Math.trunc(payload.angkatan),
    kelas: payload.kelas.trim(),
    asal_sekolah: payload.asal_sekolah?.trim() || null,
    kecamatan: payload.kecamatan?.trim() || null,
    has_phone: hasPhone,
    updated_by: actor.uid,
    updated_at: serverTimestamp(),
  });

  const existingContact = await getDoc(contactRef);
  if (existingContact.exists()) {
    batch.update(contactRef, {
      no_telp: normalizedPhone,
      updated_by: actor.uid,
      updated_at: serverTimestamp(),
    });
  } else {
    batch.set(contactRef, {
      faculty_code: 'FEBI_UNSUR',
      npm,
      no_telp: normalizedPhone,
      updated_by: actor.uid,
      updated_at: serverTimestamp(),
    });
  }

  const fieldsSummary = changedFields.length > 0 ? changedFields.join(', ') : 'Pembaruan profil';
  const historyRef = doc(collection(db, 'student_history'));
  batch.set(historyRef, {
    student_id: npm,
    npm,
    action: 'UPDATE',
    changed_fields: fieldsSummary.slice(0, 500),
    summary: `Memperbarui ${fieldsSummary} untuk ${payload.nama.trim()}`,
    actor_uid: actor.uid,
    actor_name: actor.full_name,
    created_at: serverTimestamp(),
  });

  const logRef = doc(collection(db, 'activity_logs'));
  batch.set(logRef, {
    user_id: actor.uid,
    user_name: actor.full_name,
    user_email: actor.email,
    user_role: actor.role,
    activity_type: 'UPDATE_STUDENT',
    description: `Memperbarui data mahasiswa ${payload.nama.trim()} (${npm}) — ${fieldsSummary}`,
    target_entity: npm,
    created_at: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${npm}`);
  }
}

export async function deleteStudent(
  npm: string,
  nama: string,
  actor: UserProfile
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'students', npm));
  batch.delete(doc(db, 'student_contacts', npm));

  const logRef = doc(collection(db, 'activity_logs'));
  batch.set(logRef, {
    user_id: actor.uid,
    user_name: actor.full_name,
    user_email: actor.email,
    user_role: actor.role,
    activity_type: 'DELETE_STUDENT',
    description: `Menghapus data mahasiswa ${nama} (${npm})`,
    target_entity: npm,
    created_at: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${npm}`);
  }
}

export async function bulkDeleteStudents(
  items: Array<{ npm: string; nama: string }>,
  actor: UserProfile
): Promise<void> {
  const CHUNK_SIZE = 200; // 200 * 2 deletes = 400 ops (< 500 limit)
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      batch.delete(doc(db, 'students', item.npm));
      batch.delete(doc(db, 'student_contacts', item.npm));
    });
    if (i === 0) {
      const logRef = doc(collection(db, 'activity_logs'));
      batch.set(logRef, {
        user_id: actor.uid,
        user_name: actor.full_name,
        user_email: actor.email,
        user_role: actor.role,
        activity_type: 'BULK_DELETE_STUDENT',
        description: `Menghapus massal ${items.length} data mahasiswa`,
        target_entity: items
          .slice(0, 5)
          .map((x) => x.npm)
          .join(', '),
        created_at: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students/bulk');
    }
  }
}

export async function importStudentsBatch(
  rows: ImportValidatedRow[],
  existingContactsMap: Record<string, string | null>,
  mode: ImportMode,
  fileName: string,
  actor: UserProfile,
  onProgress?: (processed: number, total: number) => void
): Promise<{ created: number; updated: number }> {
  const validRows = rows.filter(
    (r) => (r.status === 'valid_new' || r.status === 'valid_update') && r.data
  );

  let createdCount = 0;
  let updatedCount = 0;
  const CHUNK_SIZE = 110; // ~330 ops per batch

  for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
    const chunk = validRows.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const row of chunk) {
      if (!row.data) continue;
      const d = row.data;
      const studentRef = doc(db, 'students', d.npm);
      const contactRef = doc(db, 'student_contacts', d.npm);
      const historyRef = doc(collection(db, 'student_history'));
      const hasPhone = Boolean(d.no_telp && d.no_telp.trim());

      if (row.status === 'valid_new') {
        createdCount += 1;
        batch.set(studentRef, {
          faculty_code: 'FEBI_UNSUR',
          npm: d.npm,
          nama: d.nama,
          prodi: d.prodi,
          angkatan: Math.trunc(d.angkatan),
          kelas: d.kelas,
          asal_sekolah: d.asal_sekolah,
          kecamatan: d.kecamatan,
          has_phone: hasPhone,
          created_by: actor.uid,
          updated_by: actor.uid,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });

        batch.set(contactRef, {
          faculty_code: 'FEBI_UNSUR',
          npm: d.npm,
          no_telp: d.no_telp,
          updated_by: actor.uid,
          updated_at: serverTimestamp(),
        });

        batch.set(historyRef, {
          student_id: d.npm,
          npm: d.npm,
          action: 'IMPORT_CREATE',
          changed_fields: 'Import awal Excel',
          summary: `Diimpor dari ${fileName}`,
          actor_uid: actor.uid,
          actor_name: actor.full_name,
          created_at: serverTimestamp(),
        });
      } else if (row.status === 'valid_update' && mode === 'upsert_by_npm') {
        updatedCount += 1;
        batch.update(studentRef, {
          nama: d.nama,
          prodi: d.prodi,
          angkatan: Math.trunc(d.angkatan),
          kelas: d.kelas,
          asal_sekolah: d.asal_sekolah,
          kecamatan: d.kecamatan,
          has_phone: hasPhone,
          updated_by: actor.uid,
          updated_at: serverTimestamp(),
        });

        if (d.npm in existingContactsMap) {
          batch.update(contactRef, {
            no_telp: d.no_telp,
            updated_by: actor.uid,
            updated_at: serverTimestamp(),
          });
        } else {
          batch.set(contactRef, {
            faculty_code: 'FEBI_UNSUR',
            npm: d.npm,
            no_telp: d.no_telp,
            updated_by: actor.uid,
            updated_at: serverTimestamp(),
          });
        }

        batch.set(historyRef, {
          student_id: d.npm,
          npm: d.npm,
          action: 'IMPORT_UPDATE',
          changed_fields: 'Pembaruan massal Excel',
          summary: `Diperbarui melalui import ${fileName}`,
          actor_uid: actor.uid,
          actor_name: actor.full_name,
          created_at: serverTimestamp(),
        });
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students/import');
    }

    onProgress?.(Math.min(i + chunk.length, validRows.length), validRows.length);
  }

  await logActivity(
    actor,
    'IMPORT_EXCEL',
    `Import Excel "${fileName}" (${mode === 'upsert_by_npm' ? 'Upsert NPM' : 'Data Baru'}): ${createdCount} ditambahkan, ${updatedCount} diperbarui`,
    fileName
  );

  return { created: createdCount, updated: updatedCount };
}

export async function fetchStudentHistory(npm: string): Promise<StudentHistory[]> {
  try {
    const q = query(
      collection(db, 'student_history'),
      where('student_id', '==', npm)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        student_id: data.student_id,
        npm: data.npm,
        action: data.action,
        changed_fields: data.changed_fields,
        summary: data.summary,
        actor_uid: data.actor_uid,
        actor_name: data.actor_name,
        created_at: toDate(data.created_at),
      } as StudentHistory;
    });
    return items.sort(
      (a, b) => (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `student_history/${npm}`);
  }
}

export function subscribeActivityLogs(
  enabled: boolean,
  onData: (logs: ActivityLog[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!enabled) {
    onData([]);
    return () => {};
  }
  const q = query(
    collection(db, 'activity_logs'),
    orderBy('created_at', 'desc'),
    limit(250)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: ActivityLog[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: data.user_id,
          user_name: data.user_name,
          user_email: data.user_email,
          user_role: data.user_role,
          activity_type: data.activity_type,
          description: data.description,
          target_entity: data.target_entity ?? null,
          created_at: toDate(data.created_at),
        };
      });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeProfiles(
  enabled: boolean,
  onData: (profiles: UserProfile[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!enabled) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'profiles'),
    (snap) => {
      const list: UserProfile[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: data.uid || d.id,
          full_name: data.full_name,
          email: data.email,
          role: data.role as UserRole,
          is_active: Boolean(data.is_active),
          avatar_url: data.avatar_url ?? null,
          created_at: toDate(data.created_at),
          updated_at: toDate(data.updated_at),
          last_login_at: toDate(data.last_login_at),
        };
      });
      list.sort((a, b) => a.full_name.localeCompare(b.full_name, 'id'));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeUserInvites(
  enabled: boolean,
  onData: (invites: UserInvite[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  if (!enabled) {
    onData([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, 'user_invites'),
    (snap) => {
      const list: UserInvite[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role as UserRole,
          created_by: data.created_by,
          created_at: toDate(data.created_at),
        };
      });
      list.sort((a, b) => a.email.localeCompare(b.email));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'user_invites');
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function createOrUpdateUserInvite(
  email: string,
  fullName: string,
  role: UserRole,
  actor: UserProfile
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const inviteId = emailToSafeId(normalizedEmail);
  const ref = doc(db, 'user_invites', inviteId);
  const existing = await getDoc(ref);

  try {
    if (existing.exists()) {
      await updateDoc(ref, {
        full_name: fullName.trim(),
        role,
      });
    } else {
      await setDoc(ref, {
        email: normalizedEmail,
        full_name: fullName.trim(),
        role,
        created_by: actor.uid,
        created_at: serverTimestamp(),
      });
    }
    await logActivity(
      actor,
      'USER_MANAGEMENT',
      `Menetapkan undangan peran ${role} untuk ${normalizedEmail}`,
      normalizedEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_invites/${inviteId}`);
  }
}

export async function deleteUserInvite(
  inviteId: string,
  email: string,
  actor: UserProfile
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'user_invites', inviteId));
    await logActivity(
      actor,
      'USER_MANAGEMENT',
      `Menghapus undangan akses untuk ${email}`,
      email
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `user_invites/${inviteId}`);
  }
}

export async function updateUserRoleAndStatus(
  targetUid: string,
  targetEmail: string,
  updates: { full_name: string; role: UserRole; is_active: boolean },
  actor: UserProfile
): Promise<void> {
  try {
    await updateDoc(doc(db, 'profiles', targetUid), {
      full_name: updates.full_name.trim(),
      role: updates.role,
      is_active: updates.is_active,
      updated_at: serverTimestamp(),
    });
    await logActivity(
      actor,
      'USER_MANAGEMENT',
      `Mengubah peran ${targetEmail} menjadi ${updates.role} (${updates.is_active ? 'Aktif' : 'Nonaktif'})`,
      targetEmail
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `profiles/${targetUid}`);
  }
}

export function subscribeSystemSettings(
  onData: (settings: SystemSettings) => void
): Unsubscribe {
  const q = query(
    collection(db, 'system_settings'),
    where('faculty_code', '==', 'FEBI_UNSUR')
  );
  return onSnapshot(
    q,
    (snap) => {
      const identityDoc = snap.docs.find((d) => d.id === 'identity');
      if (!identityDoc) {
        onData({ ...DEFAULT_SYSTEM_SETTINGS });
        return;
      }
      const data = identityDoc.data();
      onData({
        faculty_code: 'FEBI_UNSUR',
        setting_key: 'identity',
        faculty_name: data.faculty_name || DEFAULT_SYSTEM_SETTINGS.faculty_name,
        university_name: data.university_name || DEFAULT_SYSTEM_SETTINGS.university_name,
        app_name: data.app_name || DEFAULT_SYSTEM_SETTINGS.app_name,
        app_short_name: data.app_short_name || DEFAULT_SYSTEM_SETTINGS.app_short_name,
        address: data.address || DEFAULT_SYSTEM_SETTINGS.address,
        max_import_mb: Number(data.max_import_mb || DEFAULT_SYSTEM_SETTINGS.max_import_mb),
        allow_upsert_by_npm:
          typeof data.allow_upsert_by_npm === 'boolean'
            ? data.allow_upsert_by_npm
            : DEFAULT_SYSTEM_SETTINGS.allow_upsert_by_npm,
        updated_by: data.updated_by,
        updated_at: toDate(data.updated_at),
      });
    },
    () => {
      onData({ ...DEFAULT_SYSTEM_SETTINGS });
    }
  );
}

export async function saveSystemSettings(
  settings: Omit<SystemSettings, 'faculty_code' | 'setting_key' | 'updated_by' | 'updated_at'>,
  actor: UserProfile
): Promise<void> {
  const ref = doc(db, 'system_settings', 'identity');
  try {
    const snap = await getDoc(ref);
    const payload = {
      faculty_code: 'FEBI_UNSUR' as const,
      setting_key: 'identity',
      faculty_name: settings.faculty_name.trim(),
      university_name: settings.university_name.trim(),
      app_name: settings.app_name.trim(),
      app_short_name: settings.app_short_name.trim(),
      address: settings.address.trim(),
      max_import_mb: Math.trunc(settings.max_import_mb),
      allow_upsert_by_npm: Boolean(settings.allow_upsert_by_npm),
      updated_by: actor.uid,
      updated_at: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, {
        faculty_name: payload.faculty_name,
        university_name: payload.university_name,
        app_name: payload.app_name,
        app_short_name: payload.app_short_name,
        address: payload.address,
        max_import_mb: payload.max_import_mb,
        allow_upsert_by_npm: payload.allow_upsert_by_npm,
        updated_by: actor.uid,
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }

    await logActivity(
      actor,
      'SYSTEM_SETTINGS',
      `Memperbarui identitas fakultas & konfigurasi sistem (${payload.app_short_name})`,
      'identity'
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system_settings/identity');
  }
}
