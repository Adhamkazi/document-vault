import * as DocumentPicker from "expo-document-picker";

export async function pickDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "image/*",
    ],
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}