import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import FloatingButton from "@/src/components/FloatingButton";
import type { Document } from "@/src/types/document";
import {
  getDocumentsByFolder,
} from "@/src/database/documentRepository";
import DocumentCard from "@/src/components/DocumentCard";
import { pickDocument } from "@/src/utils/filePicker";
import { createDocument } from "@/src/database/documentRepository";
import { router } from "expo-router";
import { saveFileToAppStorage } from "@/src/utils/fileStorage";

export default function FolderScreen() {
  const { id, name } = useLocalSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
  if (typeof id === "string") {
      setDocuments(getDocumentsByFolder(id));
    }
  }, [id]);

  const handleAddDocument = async () => {
  if (typeof id !== "string") return;

  const file = await pickDocument();
  if(!file){
    return;
  }
  const savedUri = await saveFileToAppStorage(
    file.uri,
    file.name
  );
  if (!file) return;
  const documentType: "image" | "pdf" =
  file.mimeType?.includes("pdf") ? "pdf" : "image";
  const newDocument = {
    id: Date.now().toString(),
    folderId: id,
    name: file.name,
    fileUri: savedUri,
    type: documentType,
  };
  createDocument(newDocument);
  setDocuments(getDocumentsByFolder(id));
};
  return (
    <View style={styles.container}>
        <Text style={styles.title}>{name}</Text>
        <Text>Folder ID: {id}</Text>
        {documents.map((document) => (
        <DocumentCard
            key={document.id}
            name={document.name}
            onPress={() =>
              router.push({
                pathname: "/viewer",
                params: {
                  name: document.name,
                  uri: document.fileUri,
                  type: document.type,
                },
              })
            }
          />
        ))} 
        <FloatingButton
          onPress={handleAddDocument}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
});