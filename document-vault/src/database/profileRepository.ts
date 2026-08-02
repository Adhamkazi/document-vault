import { db } from "./database";
import { Profile } from "@/src/types/profile";


export function initializeProfilesTable() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      pin TEXT,
      avatar TEXT,
      role TEXT DEFAULT 'FAMILY_MEMBER',
      vaultOwnerEmail TEXT NOT NULL,
      sharedFolderId TEXT,
      isOwner INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(userId)
      REFERENCES users(id),
      UNIQUE(userId, name)
    );
  `);
}


export function createProfile(profile: Profile) {
  db.runSync(
    `
    INSERT INTO profiles
    (
      id,
      userId,
      name,
      email,
      phone,
      address,
      pin,
      avatar,
      role,
      vaultOwnerEmail,
      sharedFolderId,
      isOwner,
      createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      profile.id,
      profile.userId,
      profile.name,
      profile.email ?? null,
      profile.phone ?? null,
      profile.address ?? null,
      profile.pin ?? null,
      profile.avatar ?? null,
      profile.role ?? 'FAMILY_MEMBER',
      profile.vaultOwnerEmail ?? "",
      profile.sharedFolderId ?? null,
      profile.isOwner,
      profile.createdAt,
    ]
  );
}


export function getProfilesByUserId(
  userId: string
): Profile[] {
  return db.getAllSync<Profile>(
    `
    SELECT *
    FROM profiles
    WHERE userId = ?
    ORDER BY isOwner DESC, name ASC
    `,
    [userId]
  );
}


export function getProfileById(
  id: string
): Profile | null {
  return (
    db.getFirstSync<Profile>(
      `
      SELECT *
      FROM profiles
      WHERE id = ?
      `,
      [id]
    ) ?? null
  );
}



export function updateProfile(data: {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}) {
  db.runSync(
    `
    UPDATE profiles
    SET
      name = ?,
      email = ?,
      phone = ?,
      address = ?
    WHERE id = ?
    `,
    [
      data.name,
      data.email,
      data.phone,
      data.address,
      data.id,
    ]
  );
}


export function deleteProfile(
  id: string
) {
  db.runSync(
    `
    DELETE FROM profiles
    WHERE id = ?
    `,
    [id]
  );
}


export function getOwnerProfile(
  userId: string
) {
  return db.getFirstSync<Profile>(
    `
    SELECT *
    FROM profiles
    WHERE userId = ?
      AND isOwner = 1
    LIMIT 1
    `,
    [userId]
  );
}


export function getProfilesByVaultOwnerEmail(
  ownerEmail: string
) {
  return db.getAllSync<Profile>(
    `
      SELECT *
      FROM profiles
      WHERE LOWER(TRIM(vaultOwnerEmail)) = LOWER(TRIM(?))
         OR LOWER(TRIM(email)) = LOWER(TRIM(?))
      ORDER BY isOwner DESC, name ASC
    `,
    [ownerEmail, ownerEmail]
  );
}