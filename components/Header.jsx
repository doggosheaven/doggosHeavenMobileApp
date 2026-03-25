import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Header({ showBack = false, title = null }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Left — back button or paw logo */}
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🐾</Text>
          </View>
        )}
      </View>

      {/* Center — app name or custom title */}
      <View style={styles.center}>
        <Text style={styles.appName}>{title ?? "DoggosHeaven"}</Text>
        {!title && <Text style={styles.tagline}>Premium Pet Care</Text>}
      </View>

      {/* Right — notification bell + profile */}
      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.icon}>🔔</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => router.push("/profile")}
        >
          <Text style={styles.avatarText}>👤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7BC743",
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 18,
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
  backArrow: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  iconBtn: {
    padding: 4,
  },
  icon: {
    fontSize: 18,
  },
  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7BC743",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
  },
});
