import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DashboardHeader from "@/src/components/Dashboard/DashboardHeader";
import FloatingButton from "@/src/components/FloatingButton";
import { Colors } from "@/src/constants/colors";
import { getDashboardData } from "@/src/services/dashboardService";
import ExpiringDocumentsCard from "../components/Dashboard/ExpiringDocumentsCard";
import {DashboardData} from "@/src/services/dashboardService"


export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
const [dashboard, setDashboard] = useState<DashboardData>({
    totalDocuments: 0,
    totalProfiles: 0,
    expiringDocuments: [],
    currentProfileName: "",
    expiringSoon: 0,
  });

 const loadDashboard = useCallback(async () => {
  try {
    const data = await getDashboardData();
    setDashboard(data);
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}, []);

    useFocusEffect(
      useCallback(() => {
        loadDashboard();
      }, [loadDashboard])
    );

    const handleRefresh = async () => {
      setRefreshing(true);
      await loadDashboard();
      setRefreshing(false);
    };;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <DashboardHeader />
       
          {/* Add Document */}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.85}
              onPress={() => router.push("/modal")}
            >
              <View style={styles.left}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={Colors.primary}
                  />
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title}>Add Document</Text>
                  <Text style={styles.subtitle}>
                    Upload a new document
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.subtitle}
              />
            </TouchableOpacity>
        {/* Open Documents */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => router.push("/documents")}
          >
            <View style={styles.left}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={Colors.primary}
                />
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  Open Documents
                </Text>

              <Text style={styles.subtitle}>
                {dashboard.totalDocuments === 0
                  ? "No Documents Uploaded"
                  : `${dashboard.totalDocuments} Document${
                      dashboard.totalDocuments > 1 ? "s" : ""
                    } Stored`}
              </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors.subtitle}
            />
          </TouchableOpacity>

          <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/family-members")}
        >
          <View style={styles.left}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="people-outline"
                size={20}
                color={Colors.primary}
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>
                Family Members
              </Text>

              <Text style={styles.subtitle}>
                {dashboard.totalProfiles <= 1
                  ? "No Family Members"
                  : `${dashboard.totalProfiles - 1} Family Member${
                      dashboard.totalProfiles - 1 > 1 ? "s" : ""
                    }`}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.subtitle}
          />
        </TouchableOpacity>

        <ExpiringDocumentsCard documents={dashboard.expiringDocuments ?? []}/>
      </ScrollView>
      <FloatingButton onPress={() => router.push("/modal")} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
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
  iconContainer: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#EEF4FF",
  justifyContent: "center",
  alignItems: "center",
},
left: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
},
textContainer: {
  marginLeft: 14,
  flex: 1,
},
title: {
  fontSize: 16,
  fontWeight: "600",
  color: Colors.text,
},
subtitle: {
  marginTop: 4,
  fontSize: 14,
  color: Colors.subtitle,
},

});