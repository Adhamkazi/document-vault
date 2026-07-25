import { verifyPassword } from "@/src/utils/password";
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
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: "Unable to login.",
    };
  }
}