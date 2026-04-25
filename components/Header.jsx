import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth } from "../utils/authStorage";
import { BASE_URL } from "../constants/api";

export default function Header({ showBack = false, title = null }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(useCallback(() => {
    if (showBack) return;
    const fetchUnread = async () => {
      try {
        const { user, token } = await getAuth();
        if (!user?.id) return;
        const key = `notif_read_ids_${user.id}`;
        const [res, stored] = await Promise.all([
          fetch(`${BASE_URL}/api/v1/customerappointment/notifications/${user.id}`,
            { headers: { Authorization: token || "" } }),
          AsyncStorage.getItem(key),
        ]);
        const data = await res.json();
        if (!data.success) return;
        const persistedIds = new Set(stored ? JSON.parse(stored) : []);
        const notifs = data.notifications || [];
        const unread = notifs.filter((n) => {
          if (n.source === 'visit') return n.read === false;
          return !persistedIds.has(String(n.id));
        }).length;
        setUnreadCount(unread);
      } catch {}
    };
    fetchUnread();
  }, [showBack]));

  const handleBellPress = async () => {
    try {
      const { user, token } = await getAuth();
      if (user?.id) {
        fetch(
          `${BASE_URL}/api/v1/customerappointment/notifications/${user.id}/markread`,
          { method: "PATCH", headers: { Authorization: token || "" } }
        ).catch(() => {});
      }
    } catch {}
    setUnreadCount(0);
    router.push("/screens/notifications");
  };

  return (
    <View style={styles.container}>
      {/* Left */}
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <Image source={require("../assets/images/doggoswhite.png")} style={styles.logoImg} resizeMode="contain" />
        )}
      </View>

      {/* Center */}
      <View style={styles.center}>
        <Text style={styles.appName} numberOfLines={1} adjustsFontSizeToFit>{title ?? "DoggosHeaven"}</Text>
        {!title && <Text style={styles.tagline}>Happy Pets, Happy You 🐾</Text>}
      </View>

      {/* Right — bell with badge (only on main screens) */}
      <View style={styles.right}>
        {!showBack && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBellPress}
          >
            <View style={styles.bellWrap}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTxt}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  left: {
    flex: 1,
    alignItems: "flex-start",
  },
  center: {
    flex: 2,
    alignItems: "center",
  },
  right: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  logoImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  appName: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "#7BC743",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  iconBtn: {
    padding: 4,
  },
  bellWrap: { position: "relative" },
  badge: {
    position: "absolute", top: -4, right: -6,
    backgroundColor: "#C62828", borderRadius: 10,
    minWidth: 16, height: 16,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: "#0B3D2E",
  },
  badgeTxt: { fontSize: 8, fontFamily: "Poppins_700Bold", color: "#fff" },
  icon: { fontSize: 18 },

});
