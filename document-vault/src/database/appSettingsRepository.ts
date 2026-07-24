import { db } from "./database";
import type { AppSettings } from "@/src/types/appSettings";


export function initializeAppSettingsTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (

      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL UNIQUE,
      biometricEnabled INTEGER DEFAULT 0,
      defaultProfileId TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER,


      FOREIGN KEY(userId)
      REFERENCES users(id),

      FOREIGN KEY(defaultProfileId)
      REFERENCES profiles(id)
    );
  `);
}




export function createAppSettings(
  settings: AppSettings
) {
  db.runSync(
    `
    INSERT INTO app_settings
    (
      id,
      userId,
      defaultProfileId,
      biometricEnabled,
      createdAt,
      updatedAt
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      settings.id,
      settings.userId,
      settings.defaultProfileId,
      settings.biometricEnabled,
      settings.createdAt,
      settings.updatedAt ?? null,
    ]
  );
}


export function getAppSettings(
  userId: string
): AppSettings | null {
  return (
    db.getFirstSync<AppSettings>(
      `
      SELECT *
      FROM app_settings
      WHERE userId = ?
      `,
      [userId]
    ) ?? null
  );
}


export function updateDefaultProfile(
  userId: string,
  profileId: string
) {
  db.runSync(
    `
    UPDATE app_settings
    SET
      defaultProfileId = ?,
      updatedAt = ?
    WHERE userId = ?
    `,
    [
      profileId,
      Date.now(),
      userId,
    ]
  );
}


export function setBiometricEnabled(
  userId: string,
  enabled: number
) {
  db.runSync(
    `
    UPDATE app_settings
    SET
      biometricEnabled = ?,
      updatedAt = ?
    WHERE userId = ?
    `,
    [
      enabled,
      Date.now(),
      userId,
    ]
  );
}