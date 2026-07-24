# DocumentVault

DocumentVault is a local-first React Native (Expo) mobile application designed for families to securely store, organize, and manage critical personal documents (e.g., Aadhar Card, PAN Card, Passports, Driving Licenses, Insurance policies).

## 📄 Documentation & Project Specification

Detailed architecture, database schemas, directory layout, requirements, and implementation steps are documented in **[PROJECT_SPECIFICATION.md](PROJECT_SPECIFICATION.md)**.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo Go or Android Emulator / iOS Simulator

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npx expo start
```

For Android emulator:
```bash
npm run android
```

For iOS simulator:
```bash
npm run ios
```

## 🛠️ Built With
- **Framework:** Expo ~54.0 / React Native 0.81
- **Router:** Expo Router ~6.0 (File-based navigation)
- **Local Database:** Expo SQLite ~16.0
- **Security:** Expo SecureStore & `bcryptjs`
- **File System:** Expo FileSystem, Expo DocumentPicker, Expo ImagePicker
