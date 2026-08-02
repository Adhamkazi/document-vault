import uuid from "react-native-uuid";

import { createProfile, deleteProfile, getProfileById, getProfilesByUserId, updateProfile } from "@/src/database/profileRepository";
import { getCurrentUserId, getCurrentProfileId } from "@/src/utils/authStorage";
import { deleteDocumentsByProfileId } from "../database/documentRepository";
import { setupAndShareFamilyProfile } from "./profileService";

type AddFamilyInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  grantDriveAccess?: boolean;
};

type AddFamilyResult = {
  success: boolean;
  message?: string;
  driveShared?: boolean;
};

export async function addFamilyMember(
  data: AddFamilyInput
): Promise<AddFamilyResult> {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        message: "User session not found.",
      };
    }

    // Retrieve current active/owner profile to obtain the admin's email
    const currentProfileId = await getCurrentProfileId();
    let currentUserEmail: string | null = null;

    if (currentProfileId) {
      const activeProfile = getProfileById(currentProfileId);
      currentUserEmail = activeProfile?.vaultOwnerEmail ?? null;
    }

    // Fallback: look up owner profile by userId if current profile email wasn't found
    if (!currentUserEmail) {
      const ownerProfile = getProfilesByUserId(userId).find((p) => p.isOwner === 1);
     currentUserEmail = ownerProfile?.vaultOwnerEmail ?? null;
    }

    const profileId = uuid.v4() as string;
    const cleanName = data.name.trim();
    const cleanEmail = data.email?.trim() || null;
    createProfile({
      id: profileId,
      userId,

      name: cleanName,

      email: cleanEmail,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,

      pin: null,
      avatar: null,

      role: "FAMILY_MEMBER",
      vaultOwnerEmail: currentUserEmail,
      sharedFolderId: null,

      isOwner: 0,

      createdAt: Date.now(),
    });

    let driveShared = false;

    // 2. Grant Drive access ONLY if explicitly toggled on by Admin
    if (data.grantDriveAccess && cleanEmail) {
      driveShared = await setupAndShareFamilyProfile({
        profileId,
        profileName: cleanName,
        gmailAddress: cleanEmail,
        role: "writer",
      });
    }

    return {
      success: true,
      driveShared,
    };
  } catch (error) {
    console.error("Error adding family member:", error);

    return {
      success: false,
      message: "Unable to create family member.",
    };
  }
}

export async function updateFamilyMember(
  data: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    grantDriveAccess?: boolean;
  }
): Promise<AddFamilyResult> {
  try {
    const cleanName = data.name.trim();
    const cleanEmail = data.email?.trim() || null;

    updateProfile({
      id: data.id,
      name: cleanName,
      email: cleanEmail,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
    });

    let driveShared = false;

    // 2. Grant access if explicitly toggled on during update
    if (data.grantDriveAccess && cleanEmail) {
      driveShared = await setupAndShareFamilyProfile({
        profileId: data.id,
        profileName: cleanName,
        gmailAddress: cleanEmail,
        role: "writer",
      });
    }

    return {
      success: true,
      driveShared,
    };
  } catch (error) {
    console.error("Error updating family member:", error);
    return {
      success: false,
      message: "Unable to update family member.",
    };
  }
}

export async function removeFamilyMember(
  profileId: string
) {
  try {
    deleteDocumentsByProfileId(profileId);
    deleteProfile(profileId);
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting family member:", error);

    return {
      success: false,
      message: "Unable to delete profile.",
    };
  }
}