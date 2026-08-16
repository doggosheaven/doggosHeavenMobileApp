import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { BASE_URL } from "../constants/api";
import { saveAuth } from "../utils/authStorage";
import { getGoogleIdToken, statusCodes, isErrorWithCode } from "../utils/googleSignIn";

// One button that both signs up and logs in a customer via Google.
export default function GoogleAuthButton({ label = "Continue with Google" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const registerPushToken = async (userId) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted" || !userId) return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;
      if (!pushToken) return;
      fetch(`${BASE_URL}/api/v1/customerappointment/savepushtoken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, expoPushToken: pushToken }),
      }).catch(() => {});
    } catch (_) {}
  };

  const handlePress = async () => {
    setLoading(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return; // user cancelled

      const res = await fetch(`${BASE_URL}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (data.success) {
        await saveAuth(data.token, data.user);
        await registerPushToken(data.user?.id);
        router.replace("/(tabs)/home");
      } else {
        Alert.alert("Google Sign-In Failed", data.message || "Please try again.");
      }
    } catch (e) {
      // Ignore user-driven cancellations / in-progress taps.
      if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return;
      Alert.alert("Error", e?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <View style={s.divider}>
        <View style={s.line} />
        <Text style={s.orText}>or</Text>
        <View style={s.line} />
      </View>

      <TouchableOpacity style={s.btn} onPress={handlePress} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#0B3D2E" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#DB4437" />
            <Text style={s.btnText}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },
  orText: { marginHorizontal: 12, fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },

  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: "#fff", borderWidth: 1, borderColor: "#D4EDD4",
    borderRadius: 14, height: 52, elevation: 1,
  },
  btnText: { color: "#0B3D2E", fontSize: 15, fontFamily: "Poppins_700Bold" },
});
