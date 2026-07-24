import bcrypt from "bcryptjs";

bcrypt.setRandomFallback((len) => {
  const buf = [];
  for (let i = 0; i < len; i++) {
    buf.push(Math.floor(Math.random() * 256));
  }
  return buf;
});

import { getUserByEmail } from "@/src/database/userRepository";
import { getOwnerProfile } from "@/src/database/profileRepository";
import { saveUserSession } from "@/src/utils/authStorage";

type LoginInput = {
  email: string;
  password: string;
};

type LoginResult = {
  success: boolean;
  message?: string;
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
    const validPassword = await bcrypt.compare(
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
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Unable to login.",
    };
  }
}