# Security Specification — Sistem Informasi Data Mahasiswa FEBI UNSUR

## Data Invariants
1. **Unique Student Primary Key**: Every student document in `/students/{studentId}` uses the validated `npm` as its document ID and enforces `incoming().npm == studentId`.
2. **PII Phone Isolation**: Student phone numbers (`no_telp`) are stored exclusively in `/student_contacts/{studentId}`, completely denied to `VIEWER` roles and unauthenticated callers.
3. **Zero Privilege Escalation**: Self-registration on `/profiles/{userId}` can only assign `SUPER_ADMIN` to the verified runtime bootstrap email (`alfanwira@gmail.com`) or a role explicitly matched in `/user_invites/{inviteId}`. All other accounts default to `VIEWER` and cannot mutate their own `role` or `is_active` fields.
4. **Immutable Audit Trail**: `/activity_logs/{logId}` and `/student_history/{historyId}` are strictly append-only (`update` and `delete` are denied for all users) and enforce `request.time` server timestamps.
5. **Email Verification Gate**: All writes and sensitive reads require `request.auth.token.email_verified == true`.

## Dirty Dozen Adversarial Payloads (Blocked by `firestore.rules`)
1. **Unauthenticated Student Read**: `GET /students/4120124001` without `request.auth` -> `PERMISSION_DENIED`.
2. **Viewer Phone Scraping**: `LIST /student_contacts` authenticated as `VIEWER` -> `PERMISSION_DENIED`.
3. **Self-Promotion to Super Admin**: `UPDATE /profiles/{uid}` by `OPERATOR` setting `{ role: "SUPER_ADMIN" }` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: `CREATE /students/4120124001` including unallowed field `{ is_verified_override: true }` -> `PERMISSION_DENIED`.
5. **Timestamp Forgery**: `CREATE /activity_logs/log1` with client-backdated `created_at` instead of `request.time` -> `PERMISSION_DENIED`.
6. **Actor Impersonation**: `CREATE /activity_logs/log1` with `user_id` differing from `request.auth.uid` -> `PERMISSION_DENIED`.
7. **Audit Log Tampering**: `DELETE /activity_logs/log1` even by `SUPER_ADMIN` -> `PERMISSION_DENIED`.
8. **Operator Deleting Students**: `DELETE /students/4120124001` authenticated as `OPERATOR` -> `PERMISSION_DENIED` (only `ADMIN` or `SUPER_ADMIN`).
9. **ID Poisoning**: `CREATE /students/../../../etc/passwd` or 200-char doc ID -> `PERMISSION_DENIED` via `isValidId()`.
10. **NPM Mismatch**: `CREATE /students/4120124001` with body `{ npm: "9999999" }` -> `PERMISSION_DENIED`.
11. **Unverified Email Spoof**: `CREATE /profiles/{uid}` with `email: "alfanwira@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
12. **Non-SuperAdmin Settings Override**: `UPDATE /system_settings/identity` by `ADMIN` -> `PERMISSION_DENIED`.
