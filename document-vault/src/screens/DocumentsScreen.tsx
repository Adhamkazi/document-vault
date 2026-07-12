import { Alert, StyleSheet, View } from "react-native";
import FolderCard from "@/src/components/FolderCard";
import FloatingButton from "@/src/components/FloatingButton";
import CreateFolderModal from "@/src/components/CreateFolderModal";
import type { Folder } from "@/src/types/folder";
import { useEffect, useState } from "react";
import {
  createFolder,
  getFolders,
  folderExists
} from "@/src/database/folderRepository";
import { router } from "expo-router";


export default function DocumentsScreen() {
const [folders, setFolders] = useState<Folder[]>([]);
const [modalVisible, setModalVisible] = useState(false);

useEffect(() => {
setFolders(getFolders());
}, []);


  return (
    <View style={styles.container}>
      {folders.map((folder) => (
        <FolderCard
            key={folder.id}
            name={folder.name}
            onPress={() =>
                router.push({
                pathname: "/folder",
                params: {
                    id: folder.id,
                    name: folder.name,
                },
                })
            }
            />
      ))}
      <FloatingButton
        onPress={() => setModalVisible(true)}
      />
      <CreateFolderModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={(folderName) => {
        const name = folderName.trim();
        if (!name) {
            Alert.alert("Error", "Folder name cannot be empty.");
            return;
        }
        if (folderExists(name)) {
            Alert.alert("Folder Exists", "A folder with this name already exists.");
            return;
        }
        const newFolder = {
            id: Date.now().toString(),
            name,
        };
        createFolder(newFolder.id, newFolder.name);
        setFolders(getFolders());
        }}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    padding: 20,
  },
});