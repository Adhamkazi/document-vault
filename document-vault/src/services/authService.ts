
import { hashPassword } from "@/src/utils/password";
import uuid from "react-native-uuid";

import { createUser, emailExists } from "@/src/database/userRepository";
import { createProfile } from "@/src/database/profileRepository";
import { createAppSettings } from "@/src/database/appSettingsRepository";
import { saveUserSession } from "@/src/utils/authStorage";
import { createNotificationSettings } from "@/src/database/notificationRepository";


type RegisterInput = {
  fullName: string;
  email: string;
  phone?: string;
  address? : string;
  password: string;
};

type RegisterResult = {
  success: boolean;
  message?: string;
};

export async function registerUser(
  data: RegisterInput
): Promise<RegisterResult> {
  try {
    // Check if email already exists
    if (emailExists(data.email)) {
      return {
        success: false,
        message: "Email already registered.",
      };
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Generate IDs
    const userId = uuid.v4() as string;
    const profileId = uuid.v4() as string;
    const settingsId = uuid.v4() as string;

    const now = Date.now();

    // Create User
      createUser({
        id: userId,
        email: data.email,
        passwordHash,
        googleDriveFolderId: null,
        createdAt: now,
      });

    // Create Master Profile
    createProfile({
      id: profileId,
      userId :userId,
      name: data.fullName,
      email: data.email,
      phone: data.phone ?? null,
      address : data.address ?? null,
      pin: null,
      avatar: null,
      isOwner: 1,
      createdAt: now,
    });

    // Create App Settings
    createAppSettings({
      id: settingsId,
      userId,
      biometricEnabled: 0,
      defaultProfileId: profileId,
      createdAt: now,
      updatedAt: null,
    });

     // Create App Document Expiry Notification
    createNotificationSettings({
      id: settingsId,
      userId: userId,
      notify90: 1,
      notify60: 1,
      notify30: 1,
      notify7: 1,
      notify1: 1,
      emailNotification: 1,
      pushNotification: 1,
    });

    // Save Session
    await saveUserSession(
      userId,
      profileId,
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error("Register Error:", error);

    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}