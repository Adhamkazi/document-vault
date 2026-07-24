import { setCurrentProfileId } from "@/src/utils/authStorage";
import { getProfileById } from "@/src/database/profileRepository";

type Result = {
  success: boolean;
  message?: string;
};

export async function switchProfile(
  profileId: string
): Promise<Result> {
  const profile = getProfileById(profileId);

  if (!profile) {
    return {
      success: false,
      message: "Profile not found.",
    };
  }

  await setCurrentProfileId(profileId);

  return {
    success: true,
  };
}