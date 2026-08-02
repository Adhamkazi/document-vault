import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { getCurrentUserId } from "@/src/utils/authStorage";
import { getNotificationSettings } from "@/src/database/notificationRepository";


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {

  // if (!Device.isDevice) {
  //   return false;
  // }

if (!Device.isDevice) {
  console.log("Running on emulator");
}

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
 
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } =
      await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function scheduleDocumentExpiryNotification({
  title,
  displayName,
  profileName,
  expiryDate,
}: {
  title: string;
  displayName?: string | null;
  profileName?: string | null;
  expiryDate?: string | null;
}) {
  if (!expiryDate) {
    return [];
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    return [];
  }

  const settings = getNotificationSettings(userId);

  if (!settings || settings.pushNotification === 0) {
    return [];
  }

  const reminderDays: number[] = [];

  if (settings.notify90) reminderDays.push(90);
  if (settings.notify60) reminderDays.push(60);
  if (settings.notify30) reminderDays.push(30);
  if (settings.notify7) reminderDays.push(7);
  if (settings.notify1) reminderDays.push(1);

  const expiry = new Date(expiryDate);
  const now = new Date();

  const ids: string[] = [];

  for (const days of reminderDays) {
    const trigger = new Date(expiry);
    trigger.setDate(trigger.getDate() - days);

    if (trigger <= now) {
      continue;
    }

    const formattedDate = expiry.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Document Expiring Soon",
        body: `${profileName}'s ${displayName ?? title} expires in ${days} day${
        days > 1 ? "s" : ""
      }.\nExpiry: ${formattedDate}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    ids.push(id);
  }
  return ids;
}

export async function cancelDocumentNotification(
  notificationIds?: string |null
) {
  if (!notificationIds) {
    return;
  }
  try {
    const ids: string[] = JSON.parse(notificationIds);
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (error) {
    console.log("❌ Failed to cancel notifications", error);
  }
}