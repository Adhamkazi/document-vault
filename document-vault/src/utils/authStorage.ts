import * as SecureStore from "expo-secure-store";

const USER_ID_KEY = "userId";
const PROFILE_ID_KEY = "profileId";

export async function saveUserSession(
  userId: string,
  profileId: string
) {
  await SecureStore.setItemAsync(USER_ID_KEY, userId);
  await SecureStore.setItemAsync(PROFILE_ID_KEY, profileId);
}

export async function getUserSession() {
  const userId = await SecureStore.getItemAsync(USER_ID_KEY);
  const profileId = await SecureStore.getItemAsync(PROFILE_ID_KEY);
  if (userId && profileId) {
    return { userId, profileId };
  }
  return null;
}


export async function getCurrentUserId() {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function getCurrentProfileId() {
  return SecureStore.getItemAsync(PROFILE_ID_KEY);
}

export async function setCurrentProfileId(
  profileId: string
) {
  await SecureStore.setItemAsync(
    PROFILE_ID_KEY,
    profileId
  );
}


export async function clearUserSession() {
  await SecureStore.deleteItemAsync(USER_ID_KEY);
  await SecureStore.deleteItemAsync(PROFILE_ID_KEY);
}

export async function clearSession() {
  await clearUserSession();
}