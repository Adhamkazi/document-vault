import uuid from "react-native-uuid";

import { createProfile, deleteProfile, updateProfile } from "@/src/database/profileRepository";
import { getCurrentUserId } from "@/src/utils/authStorage";
import { deleteDocumentsByProfileId } from "../database/documentRepository";

type AddFamilyInput = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type AddFamilyResult = {
  success: boolean;
  message?: string;
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

    createProfile({
      id: uuid.v4() as string,
      userId,

      name: data.name.trim(),

      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,

      pin: null,
      avatar: null,

      isOwner: 0,

      createdAt: Date.now(),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

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
  }
): Promise<AddFamilyResult> {
  try {
 updateProfile({
        id: data.id,
        name: data.name.trim(),
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
      });

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

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
    console.error(error);

    return {
      success: false,
      message: "Unable to delete profile.",
    };
  }
}