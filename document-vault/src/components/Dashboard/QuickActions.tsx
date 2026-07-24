import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/src/constants/colors";

export default function QuickActions() {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => router.push("/modal")}
      >
        <View style={styles.left}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={Colors.primary}
            />
          </View>

          <Text style={styles.text}>
            Add Document
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.subtitle}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 34,
  },

  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
  },

  button: {
    backgroundColor: Colors.card,

    borderRadius: 18,

    paddingVertical: 18,
    paddingHorizontal: 18,

    marginBottom: 14,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,

    backgroundColor: "#EEF4FF",

    justifyContent: "center",
    alignItems: "center",
  },

  text: {
    marginLeft: 14,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
});