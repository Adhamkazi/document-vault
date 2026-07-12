import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type CreateFolderModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (folderName: string) => void;
};

export default function CreateFolderModal({
  visible,
  onClose,
  onSave,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");

  const handleSave = () => {
    if (!folderName.trim()) return;
    onSave(folderName.trim());
    setFolderName("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Create Folder</Text>

          <TextInput
            placeholder="Folder name"
            value={folderName}
            onChangeText={setFolderName}
            style={styles.input}
          />

          <View style={styles.buttons}>
            <TouchableOpacity onPress={()=> {
                setFolderName("");
                onClose()
            }}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.save}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
  },

  cancel: {
    fontSize: 16,
    color: "#666",
  },

  save: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
});