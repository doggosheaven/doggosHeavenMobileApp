import { Stack, useRouter } from "expo-router";
import { useFonts, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import { Platform, View } from "react-native";
import { getAuth } from "../utils/authStorage";
import { BASE_URL } from "../constants/api";
import { AppProvider } from "../context/AppContext";

SplashScreen.preventAutoHideAsync().catch(() => {});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const isExpoGo = Constants.appOwnership === "expo";

async function registerPushToken() {
  try {
    if (!Device.isDevice || isExpoGo) return;
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
        await Notifications.setNotificationChannelAsync("booking_alert", {
          name: "New Booking Alert",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          vibrationPattern: [0, 400, 200, 400, 200, 400],
          enableVibrate: true,
        });
      }
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "940fc4bb-a36c-411b-b94b-164849675a08",
    });
    const token = tokenData?.data;
    const { user, token: authToken } = await getAuth();
    if (!user?.id || !token) return;
    fetch(`${BASE_URL}/api/v1/customerappointment/savepushtoken`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authToken || "" },
      body: JSON.stringify({ userId: user.id, expoPushToken: token }),
    }).catch(() => {});
  } catch (e) {
    if (__DEV__) console.log("Push token error:", e);
  }
}

export default function TabLayout() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useFonts({
    Poppins_700Bold,
    Inter_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      registerPushToken().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      getAuth().then(({ user }) => {
        if (!user) return;
        if (user.role === "admin") {
          router.push("/admin/notifications");
        } else if (user.role === "staff") {
          router.push("/staff/notifications");
        } else {
          router.push("/(tabs)/home");
        }
      }).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: "#0B3D2E" }} onLayout={onLayoutRootView} />;
  }

  return (
    <AppProvider>
      <View style={{ flex: 1, backgroundColor: "#0B3D2E" }} onLayout={onLayoutRootView}>
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true, gestureDirection: "horizontal" }} />
      </View>
    </AppProvider>
  );
}
