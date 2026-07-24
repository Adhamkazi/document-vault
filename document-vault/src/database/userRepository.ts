import { db } from "./database";
import type { User } from "@/src/types/user";


export function initializeUsersTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      googleDriveFolderId TEXT,
      createdAt INTEGER NOT NULL
    );
  `);
}


export function createUser(user: User) {
  db.runSync(
    `
    INSERT INTO users
    (
      id,
      email,
      passwordHash,
      googleDriveFolderId,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      user.id,
      user.email,
      user.passwordHash,
      user.googleDriveFolderId ?? null,
      user.createdAt,
    ]
  );
}

export function getUserByEmail(
  email: string
): User | null {
  return (
    db.getFirstSync<User>(
      `
      SELECT *
      FROM users
      WHERE email = ?
      `,
      [email]
    ) ?? null
  );
}

export function getUserById(
  id: string
): User | null {
  return (
    db.getFirstSync<User>(
      `
      SELECT *
      FROM users
      WHERE id = ?
      `,
      [id]
    ) ?? null
  );
}

export function emailExists(
  email: string
): boolean {
  const result = db.getFirstSync<{
    total: number;
  }>(
    `
    SELECT COUNT(*) AS total
    FROM users
    WHERE email = ?
    `,
    [email]
  );

  return (result?.total ?? 0) > 0;
}