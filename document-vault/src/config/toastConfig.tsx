import React from "react";
import {
  BaseToast,
  ErrorToast,
  ToastConfig,
} from "react-native-toast-message";

import { Colors } from "@/src/constants/colors";

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: "#22C55E",
        borderLeftWidth: 5,
        borderRadius: 16,
        backgroundColor: "#FFF",
        elevation: 4,
      }}
      contentContainerStyle={{
        paddingHorizontal: 14,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "700",
        color: Colors.text,
      }}
      text2Style={{
        fontSize: 14,
        color: Colors.subtitle,
      }}
    />
  ),

  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: "#EF4444",
        borderLeftWidth: 5,
        borderRadius: 16,
        backgroundColor: "#FFF",
        elevation: 4,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "700",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),

  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: Colors.primary,
        borderLeftWidth: 5,
        borderRadius: 16,
        backgroundColor: "#FFF",
        elevation: 4,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: "700",
      }}
      text2Style={{
        fontSize: 14,
      }}
    />
  ),
};