import { Directory, File, Paths } from "expo-file-system";

export async function saveFileToAppStorage(
  sourceUri: string,
  fileName: string
) {
  // Create (or reference) the documents directory inside the app
  const documentsDir = new Directory(Paths.document, "documents");
  if (!documentsDir.exists) {
    documentsDir.create();
  }
  const uniqueName = `${Date.now()}_${fileName}`;
  // Destination file inside our app storage
  const destination = new File(documentsDir, uniqueName);
  // Source file selected by the user
  const source = new File(sourceUri);
  // Copy the file
  source.copy(destination);
  return destination.uri;
}