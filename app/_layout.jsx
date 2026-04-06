import { Stack } from "expo-router";
import { useFonts, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { getAuth } from "../utils/authStorage";
import { BASE_URL } from "../constants/api";

SplashScreen.preventAutoHideAsync();

// Foreground mein bhi notification dikhao
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerPushToken() {
  if (!Device.isDevice) return;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      sound: "default",
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: "940fc4bb-a36c-411b-b94b-164849675a08",
  });

  const { user, token: authToken } = await getAuth();
  if (!user?.id || !token) return;

  fetch(`${BASE_URL}/api/v1/customerappointment/savepushtoken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authToken || "" },
    body: JSON.stringify({ userId: user.id, expoPushToken: token }),
  }).catch(() => {});
}

export default function TabLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Inter_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      registerPushToken();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}