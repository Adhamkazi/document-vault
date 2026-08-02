import { db } from "@/src/database/database";

export function cleanupProfiles() {
  try {
    db.withTransactionSync(() => {
      // -------------------------------------------------
      // 1. Remove orphan "Master Vault Owner" profiles
      // -------------------------------------------------
      db.runSync(`
        DELETE FROM profiles
        WHERE name = 'Master Vault Owner'
        AND (email IS NULL OR email = '')
      `);

      // -------------------------------------------------
      // 2. Remove duplicate Prince profiles
      // Keep the profile that has an email address
      // -------------------------------------------------
      const princeProfiles = db.getAllSync<any>(`
        SELECT *
        FROM profiles
        WHERE LOWER(TRIM(name)) = 'prince'
        ORDER BY
          CASE WHEN email IS NOT NULL THEN 0 ELSE 1 END,
          createdAt ASC
      `);

      if (princeProfiles.length > 1) {
        const keepProfile =
          princeProfiles.find((p) => p.email)?.id
            ? princeProfiles.find((p) => p.email)
            : princeProfiles[0];

        const duplicates = princeProfiles.filter(
          (p) => p.id !== keepProfile.id
        );



        for (const duplicate of duplicates) {

          // Move documents to kept profile
          db.runSync(
            `
            UPDATE documents
            SET profileId = ?
            WHERE profileId = ?
          `,
            [keepProfile.id, duplicate.id]
          );

          // Delete duplicate profile
          db.runSync(
            `
            DELETE FROM profiles
            WHERE id = ?
          `,
            [duplicate.id]
          );
        }
      }

      // -------------------------------------------------
      // 3. Ensure only one owner profile exists
      // -------------------------------------------------
      const owners = db.getAllSync<any>(`
        SELECT *
        FROM profiles
        WHERE isOwner = 1
        ORDER BY createdAt ASC
      `);

      if (owners.length > 1) {
        const keepOwner =
          owners.find(
            (o) =>
              o.email?.toLowerCase() ===
              "kaziadham95@gmail.com"
          ) || owners[0];

        const duplicateOwners = owners.filter(
          (o) => o.id !== keepOwner.id
        );

        for (const owner of duplicateOwners) {
          db.runSync(
            `
            UPDATE documents
            SET profileId = ?
            WHERE profileId = ?
          `,
            [keepOwner.id, owner.id]
          );

          db.runSync(
            `
            DELETE FROM profiles
            WHERE id = ?
          `,
            [owner.id]
          );
        }
      }

      // -------------------------------------------------
      // 4. Ensure at most one owner per vault (vaultOwnerEmail)
      // -------------------------------------------------
      const ownerGroups = db.getAllSync<any>(`
        SELECT LOWER(TRIM(vaultOwnerEmail)) as vaultEmail, COUNT(*) as cnt
        FROM profiles
        WHERE isOwner = 1
          AND vaultOwnerEmail IS NOT NULL
          AND LOWER(TRIM(vaultOwnerEmail)) != ''
        GROUP BY LOWER(TRIM(vaultOwnerEmail))
        HAVING COUNT(*) > 1
      `);

      for (const group of ownerGroups) {
        const vaultOwners = db.getAllSync<any>(
          `
          SELECT * FROM profiles
          WHERE isOwner = 1
            AND LOWER(TRIM(vaultOwnerEmail)) = LOWER(TRIM(?))
          ORDER BY createdAt ASC
          `,
          [group.vaultEmail]
        );

        if (vaultOwners.length <= 1) continue;

        // Keep the oldest owner for this vault, remove the rest after moving docs
        const keepVaultOwner = vaultOwners[0];

        for (const dup of vaultOwners.slice(1)) {
 

          db.runSync(
            `UPDATE documents SET profileId = ? WHERE profileId = ?`,
            [keepVaultOwner.id, dup.id]
          );

          db.runSync(`DELETE FROM profiles WHERE id = ?`, [dup.id]);
        }
      }
    });
  } catch (error) {
    console.error("PROFILE CLEANUP FAILED", error);
  }
}



export function checkProfiles() {
//   const profiles = db.getAllSync(`
//     SELECT
//       id,
//       userId,
//       name,
//       email,
//       role,
//       vaultOwnerEmail,
//       sharedFolderId,
//       isOwner
//     FROM profiles
//   `);



const users = db.getAllSync(`
  SELECT id,email
  FROM users
`);

}

/**
 * Repairs a family vault after a family member erroneously entered the admin flow
 * and got promoted to a spurious MASTER_ADMIN owner of their own separate vault.
 *
 * Result: exactly one owner (the real vault admin) per family; family-member
 * profiles are kept and their emails backfilled; spurious owner profiles removed.
 */
export function cleanupDuplicateProfiles() {
  try {
    db.withTransactionSync(() => {
      // 1) The legitimate vault admins are the vaultOwnerEmail recorded on the
      //    family-member profiles. Any owner whose own vaultOwnerEmail is NOT one
      //    of these is spurious — a family member who got their own vault by accident.
      const adminEmails = db
        .getAllSync<{ vaultOwnerEmail: string }>(
          `SELECT DISTINCT LOWER(TRIM(vaultOwnerEmail)) as vaultOwnerEmail
           FROM profiles
           WHERE role = 'FAMILY_MEMBER'
             AND vaultOwnerEmail IS NOT NULL
             AND LOWER(TRIM(vaultOwnerEmail)) != ''`
        )
        .map((r) => r.vaultOwnerEmail);

      const owners = db.getAllSync<any>(
        `SELECT * FROM profiles WHERE isOwner = 1 OR role = 'MASTER_ADMIN'`
      );

      const realOwners = owners.filter((o) =>
        adminEmails.includes((o.vaultOwnerEmail || "").trim().toLowerCase())
      );
      const spuriousOwners = owners.filter((o) => !realOwners.includes(o));

      const realOwner = realOwners[0];

      for (const spurious of spuriousOwners) {


        // Move any documents the spurious owner held onto the real admin so nothing
        // is orphaned.
        if (realOwner) {
          db.runSync(
            `UPDATE documents SET profileId = ? WHERE profileId = ?`,
            [realOwner.id, spurious.id]
          );
        }

        db.runSync(`DELETE FROM profiles WHERE id = ?`, [spurious.id]);

        // Backfill the matching family member's email if it was never stored.
        // The spurious owner's email is the member's real Google account email,
        // so we assign it to a null-email family member in the real admin's vault.
        if (spurious.email && realOwner) {
          const memberToBackfill = db.getFirstSync<any>(
            `SELECT * FROM profiles
             WHERE role = 'FAMILY_MEMBER'
               AND (email IS NULL OR email = '')
               AND LOWER(TRIM(vaultOwnerEmail)) = LOWER(TRIM(?))
             ORDER BY createdAt ASC
             LIMIT 1`,
            [realOwner.vaultOwnerEmail]
          );
          if (memberToBackfill) {
            db.runSync(
              `UPDATE profiles SET email = ? WHERE id = ?`,
              [spurious.email, memberToBackfill.id]
            );
          }
        }
      }
    });
  } catch (error) {
    console.error("DUPLICATE PROFILE CLEANUP FAILED", error);
  }
}