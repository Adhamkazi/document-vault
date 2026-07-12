import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";


export default function FolderScreen() {
    const { id, name } = useLocalSearchParams();
  return (
    <View style={styles.container}>
        <Text style={styles.title}>{name}</Text>
        <Text>Folder ID: {id}</Text>
        <Text>No documents yet.</Text>
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