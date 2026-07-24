# DocumentVault - Project Specification & Architecture

## 1. Executive Summary & Objective

**DocumentVault** is a local-first React Native (Expo) mobile application designed for families to securely store, organize, and manage critical personal documents (e.g., Aadhar Card, PAN Card, Passports, Driving Licenses, Insurance policies).

The application provides a seamless experience where a **Master Admin** registers the household account, adds **Family Members**, and allows all family members to access the application using shared login credentials while maintaining individual profile views and automated document storage on **Google Drive**.

---

## 2. Key Features & Business Requirements

### 🔐 2.1. Authentication & Household Access
* **Master Admin Registration:** The first user to register becomes the Master Admin (e.g., *Adham Kazi*).
* **Shared Household Login:** All family members (e.g., *Ameen*, *Khurram*, *Adham*) log into the mobile application using the exact same Login ID (email) and Password.
* **Secure Storage:** Passwords are hashed using `bcryptjs` and session tokens/credentials are safely stored locally using `Expo SecureStore`.

### 👤 2.2. Family Member & Profile Management
* **Add Family Member:** The Master Admin can create family member profiles by providing:
  * Full Name
  * Email Address
  * Phone Number
* **Active Profile Switching:** Any family member logged in can easily switch the active profile context from the header/dashboard.
* **Isolated & Shared Views:** 
  * Documents uploaded under a family member's profile are organized under their profile context.
  * Switching profiles switches the active document list view accordingly.

### 📄 2.3. Document Upload & Metadata
* **Upload Form Requirements:**
  1. **Document Type:** Dropdown selector (e.g., Aadhar Card, PAN Card, Passport, Driving License, Markshet, Insurance).
  2. **Document ID / Number:** String input (e.g., PAN `ISJPM1312N`, Aadhar `1234-5678-9012`).
  3. **Issue Date:** Optional date selector.
  4. **Expiry Date:** Optional date selector (used for expiry alerts & tracking).
  5. **File / Media Picker:** Option to take a photo via Camera or select a document/file from Device Gallery/Storage.
  6. **Save Document:** Action button to store file locally and upload to cloud storage.

### ☁️ 2.4. Google Drive Storage Hierarchy
Document files uploaded by the user are automatically synced to Google Drive with the following folder structure:

```text
Google Drive Root
└── [Master Admin Name] (e.g. "Adham Kazi")
    └── [Document Type] (e.g. "Aadhar Card")
        ├── aadhar.pdf
        └── aadhar.jpg
```

### 🔄 2.5. Multi-Device Sync Architecture Options
Since SQLite is local to the device, two synchronization models exist for multi-device family usage:
* **Option A (Google Drive DB Sync - Recommended Serverless):** The `documentvault.db` SQLite database is automatically backed up to a hidden Google Drive App Data folder. When a family member logs in on a new device, the app authenticates with Google Drive and downloads the database.
* **Option B (Cloud Backend Integration):** Syncing SQLite metadata with a cloud database (e.g., Supabase or Firebase).

---

## 3. Project Directory Structure

```text
document-vault/
├── app/                        # Expo Router (File-based Routing)
│   ├── (auth)/                 # Authentication route group
│   │   ├── _layout.tsx         # Auth layout header configuration
│   │   ├── login.tsx           # Login screen
│   │   └── register.tsx        # Registration screen (Master Admin creation)
│   ├── (tabs)/                 # Main application tab navigation group
│   │   ├── _layout.tsx         # Bottom tab bar configuration
│   │   └── dashboard.tsx       # Main dashboard screen
│   ├── _layout.tsx             # Root layout with database initialization & themes
│   ├── index.tsx               # Initial route handler / splash redirect
│   ├── modal.tsx               # Reusable modal container
│   └── viewer.tsx              # Document preview / PDF viewer route
│
├── src/                        # Core Application Source Code
│   ├── database/               # Local SQLite Database Layer
│   │   ├── database.ts         # SQLite db instance connection
│   │   ├── migrations.ts       # DDL schema definitions & migrations
│   │   ├── userRepository.ts   # Database CRUD for Users
│   │   ├── profileRepository.ts# Database CRUD for Family Profiles
│   │   ├── documentTypeRepository.ts # CRUD for document categories
│   │   ├── documentRepository.ts     # CRUD for document records & metadata
│   │   ├── notificationRepository.ts # Expiry reminders repository
│   │   └── appSettingsRepository.ts  # Local app configurations
│   │
│   ├── services/               # Business Logic & Auth Services
│   │   ├── authService.ts      # Account registration & password hashing
│   │   └── loginUser.ts        # User authentication & session handling
│   │
│   ├── types/                  # TypeScript Interfaces & Models
│   │   ├── user.ts             # User model definition
│   │   ├── profile.ts          # Profile model definition
│   │   ├── document.ts         # Document model definition
│   │   ├── documentType.ts     # DocumentType model definition
│   │   ├── folder.ts           # Folder structure model
│   │   └── appSettings.ts      # Settings interface
│   │
│   ├── utils/                  # Helper Utilities & Pickers
│   │   ├── authStorage.ts      # SecureStore session token persistence
│   │   ├── filePicker.ts       # DocumentPicker & ImagePicker wrapper
│   │   ├── fileStorage.ts      # Local file system storage helper
│   │   ├── formatDate.ts       # Date parsing & formatting utilities
│   │   └── openDocument.ts     # Platform document intent viewer
│   │
│   ├── components/             # Reusable UI Components
│   ├── screens/                # Screen view layouts
│   └── theme/                  # Color palette, spacing, and typography
│
├── AGENTS.md                   # Project developer notes & guidelines
├── app.json                    # Expo project configuration
└── package.json                # Project dependencies & npm scripts
```

---

## 4. Data Models & Database Schemas

### `User` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `email` | TEXT | UNIQUE, NOT NULL | Household Login Email |
| `passwordHash`| TEXT | NOT NULL | Bcrypt hashed password |
| `createdAt` | TEXT | NOT NULL | ISO Timestamp |

### `Profile` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `userId` | TEXT | FOREIGN KEY | Belongs to `User.id` |
| `name` | TEXT | NOT NULL | Family member full name |
| `email` | TEXT | NULLABLE | Family member contact email |
| `phone` | TEXT | NULLABLE | Family member contact phone |
| `role` | TEXT | NOT NULL | `MASTER_ADMIN` or `FAMILY_MEMBER` |
| `createdAt` | TEXT | NOT NULL | ISO Timestamp |

### `Document` Table
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique UUID |
| `profileId` | TEXT | FOREIGN KEY | Belongs to active `Profile.id` |
| `documentTypeId`| TEXT | FOREIGN KEY | References `DocumentType.id` |
| `documentNumber`| TEXT | NULLABLE | Document ID (e.g. PAN, Aadhar #) |
| `issueDate` | TEXT | NULLABLE | YYYY-MM-DD |
| `expiryDate` | TEXT | NULLABLE | YYYY-MM-DD |
| `localFilePath`| TEXT | NOT NULL | Relative path on local device storage |
| `driveFileId` | TEXT | NULLABLE | Google Drive file ID |
| `createdAt` | TEXT | NOT NULL | ISO Timestamp |

---

## 5. Development Roadmap & Implementation Steps

- [x] **Phase 1: Database & Authentication Core**
  - Set up Expo SQLite schema & migrations.
  - Implement Master Admin Registration & Login services (`authService`, `loginUser`).
  - Configure `bcryptjs` with Expo compatibility fallback.
- [ ] **Phase 2: Profile Switcher & Family Management**
  - Create active profile context state.
  - Build "Add Family Member" screen/modal and database bindings.
  - Implement Header Profile Switcher component.
- [ ] **Phase 3: Document Upload UI & Storage**
  - Implement Document Upload form (Type dropdown, Document ID, Issue/Expiry dates).
  - Integrate Expo Document Picker & Expo ImagePicker (Camera/Gallery).
  - Persist document files in Expo FileSystem.
- [ ] **Phase 4: Dashboard & Expiry Notifications**
  - Build Dashboard screen listing recent documents, expiry alerts, and quick actions.
  - Implement document viewer screen with PDF and image rendering.
- [ ] **Phase 5: Google Drive API & Multi-Device Sync**
  - Integrate Google OAuth 2.0 authentication.
  - Implement automated file uploading into structured Drive folders (`Master Admin / Document Type / file`).
  - Implement SQLite database backup/sync via Google Drive.
