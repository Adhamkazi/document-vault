import { db } from "./database";

export function initializeNotificationsTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS notification_settings (

      id TEXT PRIMARY KEY NOT NULL,

      userId TEXT NOT NULL UNIQUE,

      notify90 INTEGER NOT NULL DEFAULT 1,

      notify60 INTEGER NOT NULL DEFAULT 1,

      notify30 INTEGER NOT NULL DEFAULT 1,

      notify7 INTEGER NOT NULL DEFAULT 1,

      notify1 INTEGER NOT NULL DEFAULT 1,

      emailNotification INTEGER NOT NULL DEFAULT 1,

      pushNotification INTEGER NOT NULL DEFAULT 1,

      FOREIGN KEY(userId)
      REFERENCES users(id)

    );
  `);
}


export type NotificationSettings = {
  id: string;
  userId: string;

  notify90: number;
  notify60: number;
  notify30: number;
  notify7: number;
  notify1: number;

  emailNotification: number;
  pushNotification: number;
};

export function createNotificationSettings(
  settings: NotificationSettings
) {
  db.runSync(
    `
    INSERT INTO notification_settings (
      id,
      userId,
      notify90,
      notify60,
      notify30,
      notify7,
      notify1,
      emailNotification,
      pushNotification
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      settings.id,
      settings.userId,
      settings.notify90,
      settings.notify60,
      settings.notify30,
      settings.notify7,
      settings.notify1,
      settings.emailNotification,
      settings.pushNotification,
    ]
  );
}

export function getNotificationSettings(
  userId: string
): NotificationSettings | null {
  return (
    db.getFirstSync<NotificationSettings>(
      `
      SELECT *
      FROM notification_settings
      WHERE userId = ?
      `,
      [userId]
    ) ?? null
  );
}

export function updateNotificationSettings(
  settings: NotificationSettings
) {
  db.runSync(
    `
    UPDATE notification_settings
    SET
      notify90 = ?,
      notify60 = ?,
      notify30 = ?,
      notify7 = ?,
      notify1 = ?,
      emailNotification = ?,
      pushNotification = ?
    WHERE userId = ?
    `,
    [
      settings.notify90,
      settings.notify60,
      settings.notify30,
      settings.notify7,
      settings.notify1,
      settings.emailNotification,
      settings.pushNotification,
      settings.userId,
    ]
  );
}

