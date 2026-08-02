import { verifyPassword } from "@/src/utils/password";
import { getUserByEmail } from "@/src/database/userRepository";
import { getOwnerProfile } from "@/src/database/profileRepository";
import { saveUserSession } from "@/src/utils/authStorage";
import { db } from '@/src/database/database';


export type UserRole = 'MASTER_ADMIN' | 'FAMILY_MEMBER';


export interface VaultOption {
  vaultOwnerEmail: string;
  role: UserRole;
  profileId: string;
  isOwner: boolean;
}

export interface PostSignInResult {
  email: string;
  needsOnboarding: boolean;
  availableVaults: VaultOption[];
  activeVault?: VaultOption;
}

type LoginInput = {
  email: string;
  password: string;
};

type LoginResult = {
  success: boolean;
  message?: string;
  userId?: string;
  profileId?: string;
};



export async function loginUser(
  data: LoginInput
): Promise<LoginResult> {
  try {
    // Find user
    const user = getUserByEmail(data.email);

    if (!user) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // Verify password
    const validPassword = await verifyPassword(
      data.password,
      user.passwordHash
    );

    if (!validPassword) {
      return {
        success: false,
        message: "Invalid email or password.",
      };
    }

    // Load owner profile
    const ownerProfile = getOwnerProfile(user.id);

    if (!ownerProfile) {
      return {
        success: false,
        message: "Owner profile not found.",
      };
    }

    // Save session
    await saveUserSession(
      user.id,
      ownerProfile.id
    );

    return {
      success: true,
      userId: user.id,
      profileId: ownerProfile.id,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Unable to login.",
    };
  }
}



export async function handleGooglePostSignIn(
  signedInEmail: string,
  userId: string
): Promise<PostSignInResult> {
  const normalizedEmail = signedInEmail.trim().toLowerCase();

  // 1. Fetch all profile contexts this user participates in — by email first,
  //    then fall back to profiles already synced under their userId. The
  //    userId fallback catches family members whose email was stored as null.
  let existingProfiles = db.getAllSync<any>(
    `SELECT * FROM profiles WHERE LOWER(TRIM(email)) = ?`,
    [normalizedEmail]
  );

  if (!existingProfiles || existingProfiles.length === 0) {
    existingProfiles = db.getAllSync<any>(
      `SELECT * FROM profiles WHERE userId = ?`,
      [userId]
    );
  }

  // If user already belongs to one or more vaults, populate available options
  if (existingProfiles && existingProfiles.length > 0) {

    for (const profile of existingProfiles) {
      if (profile.userId !== userId) {
        try {
          db.runSync(
            `UPDATE profiles SET userId = ? WHERE id = ?`,
            [userId, profile.id]
          );
        } catch (e) {
          console.warn(`Failed to align userId for profile ${profile.id}:`, e);
        }
      }
    }

    const availableVaults: VaultOption[] = existingProfiles.map((p) => ({
      vaultOwnerEmail: p.vaultOwnerEmail || p.email,
      role: (p.role || (p.isOwner ? 'MASTER_ADMIN' : 'FAMILY_MEMBER')) as UserRole,
      profileId: p.id,
      isOwner: Boolean(p.isOwner),
    }));

    return {
      email: normalizedEmail,
      needsOnboarding: false,
      availableVaults,
      activeVault: availableVaults.find((v) => v.isOwner) || availableVaults[0],
    };
  }
  return {
    email: normalizedEmail,
    needsOnboarding: true,
    availableVaults: [],
  };
}