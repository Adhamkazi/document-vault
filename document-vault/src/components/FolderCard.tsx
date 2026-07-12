import { StyleSheet, Text, TouchableOpacity } from "react-native";

type FolderCardProps = {
  name: string;
  onPress :() =>void;
};

export default function FolderCard({ name, onPress }: FolderCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <Text style={styles.icon}>📁</Text>
      <Text style={styles.name}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
  },
});