import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "../utils/authStorage";

const homeFor = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "staff") return "/staff/dashboard";
  return "/(tabs)/home";
};

/**
 * Blocks a whole route group until the stored session is confirmed to hold one of
 * `allow`. Without this, a signed-in customer can deep-link straight into /admin/*.
 * Anyone who does not belong is bounced to their own home screen.
 */
export default function RoleGate({ allow, children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    getAuth()
      .then(({ token, user }) => {
        if (!active) return;
        if (!token || !user) return router.replace("/auth/login");
        if (!allow.includes(user.role)) return router.replace(homeFor(user.role));
        setAllowed(true);
      })
      .catch(() => { if (active) router.replace("/auth/login"); });
    return () => { active = false; };
  }, []);

  if (!allowed) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator size="large" color="#A8D96C" />
      </View>
    );
  }
  return children;
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: "#0B3D2E",
    justifyContent: "center",
    alignItems: "center",
  },
});
