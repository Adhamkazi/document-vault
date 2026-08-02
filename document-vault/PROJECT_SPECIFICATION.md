# DocumentVault (EzDocs) - Project Specification & Architecture

## 1. Executive Summary & Objective

**EzDocs / DocumentVault** is a local-first React Native (Expo SDK 54) mobile application that lets families securely store, organize, and manage critical personal documents (e.g., Aadhar Card, PAN Card, Passports, Driving Licenses, Insurance policies).

The application provides a **Master Admin** who registers the household vault, adds **Family Members** as profiles, and shares per-profile folders on **Google Drive**. Documents are stored locally (SQLite + app storage) and auto-synced to the family member's Drive folder. Automated **expiry reminders** are scheduled as local notifications.

---

## 2. Key Features & Business Requirements

### 🔐 2.1. Authentication & Access
* **Master Admin Registration:** The first user to register creates the household vault and becomes the Master Admin.
* **Email/Password Login:** Credentials are verified with a **SHA-256 hash** (`expo-crypto`, versioned `v1` prefix + an app pepper) — see `src/utils/password.ts`. No plaintext or bcryptjs.
* **Google Sign-In:** Users can also authenticate with their Google account.
* **Secure Storage:** Session tokens (user id + active profile id) are persisted locally using `Expo SecureStore`.
* **Per-User Accounts:** Each user has their own account. The owner creates family member profiles; members log in with their own account but can switch to view/manage the owner's profile context.

### 👤 2.2. Family Member & Profile Management
* **Add Family Member:** The Master Admin creates family profiles with full name, email, phone (and optional address/pin/avatar).
* **Active Profile Switching:** Any logged-in user can switch the active profile context (header dropdown or Family Members screen).
* **Cross-User Switching:** A family member can switch to the owner's profile (and vice-versa). Switching persists the active profile id locally.
* **Admin-Only Actions:** Edit / Delete / Grant-Drive options are gated by the **logged-in user's** ownership (`getOwnerProfile(user.id)`), *not* the active profile — preventing a family member from gaining admin controls after switching to the owner's profile.

### 📄 2.3. Document Upload & Metadata
* **Upload Form:**
  1. **Document Type:** Dropdown selector (e.g., Aadhar Card, PAN Card, Passport, Driving License, Marksheet, Insurance).
  2. **Document ID / Number:** String input (e.g., PAN `ISJPM1312N`, Aadhar `1234-5678-9012`).
  3. **Issue Date:** Optional date selector.
  4. **Expiry Date:** Optional date selector (drives expiry reminders).
  5. **File Source:** Camera capture or pick from Gallery/Device storage.
  6. **Save:** Stores the file locally and uploads it to the active profile's Drive folder.
* **Viewer:** Open documents (PDF/image) from the All Documents screen; supports edit, share, and delete.

### ☁️ 2.4. Google Drive Storage Hierarchy
Documents uploaded by a user are automatically synced to a shared **per-profile** folder under a root vault folder:

```text
EzDocs (root vault folder)
└── [Profile Name] (e.g. "Prince")
    ├── aadhar.pdf
    └── insurance.jpg
```

The vault **root** is shared read-only with family members; each member's **own folder** is shared with writer permission so they can only upload to their own profile folder.

### 🔄 2.5. Sync & Backup Model
* **Auto-Upload:** Every saved document is pushed to the active profile's Drive folder (`googleDriveFileId` stored). If Drive fails (offline / no token), the document is saved locally with a silent fallback.
* **Recovery Sync:** `syncAndRecoverFromDrive()` walks the vault and uploads any documents missing on Drive. It runs in the background on profile switch and on demand via **Sync Now** in Settings.
* **Export Backup:** Settings → Content & Data → **Export backup** writes the current vault's document metadata to a JSON file and shares it via the system share sheet. *(Future: bundle the JSON with the actual files into a ZIP for full backup/restore.)*

### ⏰ 2.6. Expiry Reminders (Core Feature)
* Local notifications are scheduled at **90 / 60 / 30 / 7 / 1** days before each document's expiry date.
* Reminders are **always-on by default** (no toggle) — this is the primary reason the app exists. Schedule is stored in `notification_settings`.

### ⚙️ 2.7. Settings Screen
1. **Cloud Integration:** Master Admin can connect/disconnect the master Google Drive. Family members who are not signed into Google get a **Connect Google Account** action so they can sync.
2. **Storage & Sync:** Shows document count, stored size, and last-synced time, plus a **Sync Now** button.
3. **Account & Vault:** Logged-in account (avatar/initial, name, email), role badge (Master Admin / Family Member), and the active vault.
4. **Content & Data:** **Export backup** (JSON metadata).
5. **About:** App name + version, Privacy Policy / Terms / Contact links (currently dummy `ezdocs.example.com` placeholders, to be replaced at official publish).

### 🎨 2.8. UI/UX Design System
A minimal light theme (white cards, light borders, soft shadows, blue `#2563EB` accents) applied across Login, Dashboard & Header, All Documents, Family Members, Add Document, and the Expiring Documents card.

---

## 3. Project Directory Structure

```text
document-vault/
├── app/                        # Expo Router (File-based Routing)
│   ├── (auth)/                 # Authentication route group
│   │   ├── _layout.tsx         # Auth layout configuration
│   │   ├── login.tsx           # Login screen (email/password + Google)
│   │   └── register.tsx        # Registration screen (Master Admin creation)
│   ├── (tabs)/                 # Main application tab navigation group
│   │   ├── _layout.tsx         # Bottom tab bar configuration
│   │   ├── dashboard.tsx       # Main dashboard screen
│   │   └── settings.tsx        # Settings screen (cloud, storage, account, about)
│   ├── _layout.tsx             # Root layout with database initialization & auth provider
│   ├── index.tsx               # Initial route handler / splash redirect
│   ├── modal.tsx               # Reusable modal container
│   └── viewer.tsx              # Document preview / PDF viewer route
│
├── src/                        # Core Application Source Code
│   ├── components/             # Reusable UI Components
│   │   ├── Dashboard/          # DashboardHeader, ExpiringDocumentsCard
│   │   ├── documents/          # DocumentCard, DocumentActionSheet, EmptyDocuments, FileSourceActionSheet
│   │   ├── Family/             # FamilyMemberCard, FamilyActionSheet
│   │   ├── ActionSheet.tsx     # Generic bottom action sheet
│   │   └── FloatingButton.tsx
│   ├── context/
│   │   └── AuthContext.tsx     # Auth state, profile switching, onboarding
│   ├── database/               # Local SQLite Layer (expo-sqlite)
│   │   ├── database.ts         # SQLite db instance
│   │   ├── migrations.ts       # Table initialization
│   │   ├── userRepository.ts   # CRUD for Users
│   │   ├── profileRepository.ts# CRUD for Family Profiles
│   │   ├── documentTypeRepository.ts # Document categories
│   │   ├── documentRepository.ts     # Document records & metadata
│   │   ├── notificationRepository.ts # Expiry reminder settings
│   │   ├── appSettingsRepository.ts  # App settings (incl. lastSyncedAt)
│   │   └── cleanUpFunctions.ts # Cleanup helpers
│   ├── screens/                # Screen view layouts (Dashboard, AllDocuments, FamilyMembers, AddFamily, UploadDocument, Viewer)
│   ├── services/               # Business Logic
│   │   ├── authService.ts      # Registration & password hashing
│   │   ├── loginUser.ts        # Login + Google post-sign-in + roles
│   │   ├── onboardingService.ts# Vault create/join onboarding
│   │   ├── profileService.ts   # Active profile, setup & share family profile
│   │   ├── addFamilyService.ts # Add/remove family members
│   │   ├── documentService.ts  # Create/update documents + reminders
│   │   ├── dashboardService.ts # Dashboard aggregates & expiry list
│   │   ├── notificationService.ts # Local expiry notification scheduling
│   │   └── driveSyncService.ts # Google Drive folders, upload, sync & recover
│   ├── types/                  # TypeScript Interfaces (user, profile, document, documentType, appSettings)
│   ├── utils/                  # Helpers
│   │   ├── authStorage.ts      # SecureStore session persistence
│   │   ├── password.ts         # SHA-256 versioned hashing
│   │   ├── filePicker.ts       # DocumentPicker wrapper
│   │   ├── fileStorage.ts      # Local file storage (expo-file-system)
│   │   ├── camera.ts           # Camera capture
│   │   ├── dateUtils.ts        # Expiry status labels & colors
│   │   ├── toast.ts            # Toast messages
│   │   └── formatDate.ts       # Date formatting
│   └── constants/
│       └── colors.ts           # Color palette
│
├── AGENTS.md                   # Project developer notes & guidelines
├── app.json                    # Expo project configuration (SDK 54)
└── package.json                # Dependencies & npm scripts
```

---

## 4. Data Models & Database Schemas

### `users` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `email` | TEXT | UNIQUE, NOT NULL | Account email |
| `passwordHash` | TEXT | NOT NULL | Versioned SHA-256 hash (e.g. `v1:<hex>`) |
| `authProvider` | TEXT | DEFAULT 'LOCAL' | `LOCAL` or `GOOGLE` |
| `googleDriveFolderId` | TEXT | NULLABLE | Root vault folder on Drive |
| `createdAt` | INTEGER | NOT NULL | Epoch ms timestamp |

### `profiles` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `userId` | TEXT | FK → `users.id` | Owning user |
| `name` | TEXT | NOT NULL | Family member full name |
| `email` | TEXT | NULLABLE | Contact / Gmail address |
| `phone` | TEXT | NULLABLE | Contact phone |
| `address` | TEXT | NULLABLE | Address |
| `pin` | TEXT | NULLABLE | Optional PIN |
| `avatar` | TEXT | NULLABLE | Avatar (optional) |
| `role` | TEXT | DEFAULT 'FAMILY_MEMBER' | `MASTER_ADMIN` / `FAMILY_MEMBER` |
| `vaultOwnerEmail` | TEXT | NOT NULL | Email of the vault owner |
| `sharedFolderId` | TEXT | NULLABLE | Member's Drive folder id |
| `isOwner` | INTEGER | DEFAULT 0 | `1` = vault owner |
| `createdAt` | INTEGER | NOT NULL | Epoch ms |

### `documents` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `profileId` | TEXT | FK → `profiles.id` | Owning profile |
| `notificationIds` | TEXT | NULLABLE | Scheduled reminder ids |
| `documentTypeId` | TEXT | FK → `document_types.id` | Category |
| `title` | TEXT | NOT NULL | Document title |
| `displayName` | TEXT | NULLABLE | Display name |
| `documentNumber` | TEXT | NULLABLE | e.g. PAN / Aadhar # |
| `issueDate` | TEXT | NULLABLE | YYYY-MM-DD |
| `expiryDate` | TEXT | NULLABLE | YYYY-MM-DD |
| `fileName` | TEXT | NOT NULL | Stored file name |
| `fileUri` | TEXT | NOT NULL | Local file URI |
| `mimeType` | TEXT | NOT NULL | e.g. `application/pdf`, `image/jpeg` |
| `fileSize` | INTEGER | NULLABLE | Bytes |
| `googleDriveFileId` | TEXT | NULLABLE | Drive file id |
| `notes` | TEXT | NULLABLE | Notes |
| `createdAt` | INTEGER | NOT NULL | Epoch ms |
| `updatedAt` | INTEGER | NULLABLE | Epoch ms |

### `notification_settings` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT PK | Unique id |
| `userId` | TEXT UNIQUE | Belongs to user |
| `notify90` / `notify60` / `notify30` / `notify7` / `notify1` | INTEGER DEFAULT 1 | Reminder-day toggles (default on) |
| `emailNotification` | INTEGER DEFAULT 1 | Email notification flag |
| `pushNotification` | INTEGER DEFAULT 1 | Push/local notification flag |

### `app_settings` Table
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | TEXT PK | Unique id |
| `userId` | TEXT UNIQUE | Belongs to user |
| `biometricEnabled` | INTEGER DEFAULT 0 | Biometric flag |
| `defaultProfileId` | TEXT NULLABLE | Default profile |
| `googleDriveBackupFileId` | TEXT NULLABLE | Drive backup file |
| `lastSyncedAt` | INTEGER NULLABLE | Last successful sync time |
| `createdAt` / `updatedAt` | INTEGER | Timestamps |

---

## 5. Development Roadmap & Implementation Status

- [x] **Database & Authentication Core**
  - SQLite schema & migrations (users, profiles, documents, document_types, notification_settings, app_settings).
  - Registration & Login (`authService`, `loginUser`), SHA-256 versioned password hashing.
  - Google Sign-In integration; SecureStore session persistence.
- [x] **Family & Profile Management**
  - Profile context / active profile switching (including cross-user switching).
  - Add / remove family members; admin-gated Edit/Delete/Grant actions.
  - Onboarding (create or join vault).
- [x] **Document Management**
  - Upload form (type, number, issue/expiry dates, camera/gallery picker).
  - Local file storage + auto-upload to per-profile Drive folder.
  - Document viewer with edit / share / delete.
- [x] **Dashboard & Expiry Reminders**
  - Dashboard with quick actions, document counts, and an Expiring Documents card.
  - Local expiry notifications at 90/60/30/7/1 days (always-on default).
- [x] **Settings & Sync**
  - Cloud Integration (connect/disconnect; member connect-own-Google).
  - Storage & Sync card (count, size, last-synced, Sync Now).
  - Account & Vault, Export backup (JSON), and About cards.
- [ ] **Future / Post-Publish**
  - **ZIP backup** export (JSON + actual files) for full backup/restore.
  - Replace dummy Privacy / Terms / Contact links with real URLs.
  - *(Declined for now: PIN/app-lock, clear-vault-data, reminder toggles.)*
