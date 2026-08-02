# EzDocs — Family Vault Login Fix

A document of the bug, the root cause, the fix, and the goal achieved for the
"family member incorrectly becomes a vault owner" problem.

---

## 1. The Product Goal

**EzDocs** is a family document vault. One user is the **Master Admin** who owns a
shared `EzDocs/` Google Drive root. Inside it, each family member has **their own
profile folder**. The intended model:

- **Master Admin** creates the vault, adds family members, and can upload to any member's folder.
- **Family members** log in with **their own Google account**.
- Every member gets **`reader` access to the vault root** → they can *view* everyone's documents.
- Each member gets **`writer` access only to their own folder** → they can *upload* only there.
- A family member logging in must **connect to their existing shared profile**, see the
  family's documents, and **never become a vault owner**.

> **Goal:** exactly **one owner** per family vault; every member correctly recognized and
> scoped; no duplicate profiles or vaults — even after an app reinstall.

---

## 2. The Bug

When a family member (e.g. `princeadham67@gmail.com`) logged in, the app **failed to
recognize them**, fell through into the *admin flow*, and **created a new `MASTER_ADMIN`
vault owner** for them.

Symptoms in the logs:

```
FAMILY PROFILE FOUND null
REACHED ADMIN FLOW princeadham67@gmail.com
OWNER PROFILE AFTER UPSERT { ... role: "MASTER_ADMIN", vaultOwnerEmail: "princeadham67@gmail.com", isOwner: 1 }
```

Resulting broken state:

- **Multiple vault owners** existed (`kaziadham95@gmail.com` **and** `princeadham67@gmail.com`).
- The family relationship was broken — Prince got his **own separate EzDocs vault**.
- Duplicate / unrecoverable profiles appeared.

---

## 3. Root Cause

Two compounding defects:

1. **Wrong folder was shared as writer and stored as the upload target.**
   `setupAndShareFamilyProfile` granted `writer` on the **vault root** and stored
   `sharedFolderId = rootVaultId`. Consequences:
   - A member's uploads targeted the vault root, not their own folder.
   - On login, Drive's `sharedWithMe` returned the root folder, which has **no `parents`**,
     so the recovery loop skipped it: `if (!sharedFolder.parents?.length) continue;`.

2. **Family identity relied on `email`, which was `null`.**
   Family profiles created by the admin carried `email = null` and belonged to the
   **admin's `userId`**. So every lookup failed:
   - by **email** → null email, no match;
   - by **userId** → it was the admin's userId, not the member's;
   - by **Drive shared folder** → the shared folder was the root (no parent), so it was skipped.

   With no family match, the user fell into the admin flow and became a new owner.

---

## 4. What Was Fixed (Step by Step)

| Step | File | Change |
|------|------|--------|
| **1** | `src/services/profileService.ts` | `setupAndShareFamilyProfile`: grant **`reader`** on the vault root (view all), grant **`writer`** on the member's **own folder** (upload own only), store `sharedFolderId = <own folder>` (not the root). |
| **2** | `src/services/driveSyncService.ts` | `syncAndRecoverFromDrive`: added a **family-member guard** that returns before the admin flow, plus a defensive check that **refuses to create a `MASTER_ADMIN`** for someone who is already a `FAMILY_MEMBER`. |
| **3** | `src/context/AuthContext.tsx` | Removed the dead `familyProfile` null-email lookup; identity is now resolved inside `syncAndRecoverFromDrive`. |
| **4** | `src/services/loginUser.ts` | `handleGooglePostSignIn`: fall back to matching by **`userId`** so a member whose email was null is still recognized. |
| **5** | `src/database/cleanUpFunctions.ts` | `cleanupDuplicateProfiles`: removes spurious owner profiles and backfills a member's email. |
| **6** | `src/services/driveSyncService.ts` | Added **`sharedFolderId` → local `FAMILY_MEMBER` profile matching** in the `sharedWithMe` loop (covers fresh installs / null email); reassigns `userId`, backfills `email`, and returns before the admin flow. |

### How the recognition now works (family member login)

1. `syncAndRecoverFromDrive` tries to resolve the active profile by id, email, then `sharedFolderId`.
2. If a local `FAMILY_MEMBER` profile is found → sync **only that profile's folder** and return.
3. Otherwise, query Drive `sharedWithMe`; if a folder matches a local family profile's
   `sharedFolderId` → reassign ownership + backfill email, recover, return.
4. The admin flow is **only** reached by a genuine vault owner.

---

## 5. The Achievement / Result

- **Exactly one `MASTER_ADMIN`** owner per family vault.
- Family members log in → land directly on their dashboard (**no onboarding**), recognized
  as `FAMILY_MEMBER` with `isOwner = 0`.
- Members **view all** family documents (root = reader) but **upload only to their own folder**.
- Master Admin can upload to any member's folder.
- **No duplicate profiles**; **no spurious second vault** is created.
- Data is **recoverable after reinstall** via the `sharedFolderId` matching.

---

## 6. How to Verify

See the full manual test flow in the conversation. Quick pass criteria:

- [ ] Admin login → recognized as `MASTER_ADMIN`, sees family members.
- [ ] Adding a member grants **reader on root** + **writer on the member's own folder**.
- [ ] Member login → `FAMILY_MEMBER`, no onboarding, **no `MASTER_ADMIN` created**, no
      `REACHED ADMIN FLOW` in logs.
- [ ] Member sees all documents, uploads only to their own folder.
- [ ] Reinstall → member's profile + documents recovered, still exactly one owner.

---

## 7. Files Touched

- `src/services/profileService.ts`
- `src/services/driveSyncService.ts`
- `src/context/AuthContext.tsx`
- `src/services/loginUser.ts`
- `src/database/cleanUpFunctions.ts`
- `app/index.tsx` (pre-existing type error fix: `getUserId` → `getCurrentUserId`)
- `src/services/authService.ts` (pre-existing type error fix: missing `role`/`sharedFolderId`)
