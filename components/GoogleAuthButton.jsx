import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { BASE_URL } from "../constants/api";
import { saveAuth } from "../utils/authStorage";
import { getGoogleIdToken, statusCodes, isErrorWithCode, isGoogleSignInAvailable } from "../utils/googleSignIn";
import GoogleGIcon from "./GoogleGIcon";

// One button that both signs up and logs in a customer via Google.
export default function GoogleAuthButton({ label = "Continue with Google" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Expo Go has no native Google module — offer nothing rather than a button
  // that can only fail.
  if (!isGoogleSignInAvailable()) return null;

  const registerPushToken = async (authToken) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted" || !authToken) return;
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;
      if (!pushToken) return;
      fetch(`${BASE_URL}/api/v1/customerappointment/savepushtoken`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authToken },
        body: JSON.stringify({ expoPushToken: pushToken }),
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

      // Server sometimes returns an HTML error page (e.g. 404 before deploy).
      // Read as text first so we can show a clean message instead of a JSON parse crash.
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        Alert.alert("Server Error", "Sign-in server abhi available nahi hai. Thodi der baad try karein.");
        return;
      }

      if (data.success) {
        await saveAuth(data.token, data.user);
        await registerPushToken(data.token);
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
            <GoogleGIcon size={20} />
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
