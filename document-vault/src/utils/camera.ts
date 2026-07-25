import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export async function captureDocument() {
  const permission =
    await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Camera Permission",
      "Camera permission is required to capture documents."
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}