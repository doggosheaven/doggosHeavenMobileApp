import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions, Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { getAuth } from "../utils/authStorage";
import { StatusBar } from "expo-status-bar";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const logoAnim   = useRef(new Animated.Value(0)).current;
  const textAnim   = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getAuth().then(({ token, user }) => {
      if (token) {
        if (user?.role === "admin")      router.replace("/admin/dashboard");
        else if (user?.role === "staff") router.replace("/staff/dashboard");
        else                             router.replace("/(tabs)/home");
      } else {
        setChecked(true);
        Animated.stagger(120, [
          Animated.spring(logoAnim,    { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.timing(textAnim,    { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.parallel([
            Animated.spring(cardAnim,    { toValue: 0, useNativeDriver: true, tension: 60, friction: 9 }),
            Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          ]),
          Animated.timing(btnAnim,     { toValue: 1, duration: 350, useNativeDriver: true }),
        ]).start();
      }
    });
  }, []);

  // Loading state — green screen with logo (matches splash)
  if (!checked) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Image source={require("../assets/images/doggoswhite.png")} style={styles.splashLogo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top green section */}
      <View style={styles.topSection}>
        <Animated.View style={{ opacity: logoAnim, transform: [{ scale: logoAnim }] }}>
          <Image
            source={require("../assets/images/doggoswhite.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={{ opacity: textAnim }}>
          <Text style={styles.appName}>Doggos Heaven</Text>
          <Text style={styles.tagline}>Premium Pet Care Services 🐾</Text>
        </Animated.View>
      </View>

      {/* Bottom white card section */}
      <Animated.View
        style={[
          styles.bottomCard,
          { opacity: cardOpacity, transform: [{ translateY: cardAnim }] },
        ]}
      >
        <Text style={styles.welcomeTitle}>Welcome!</Text>
        <Text style={styles.welcomeDesc}>
          Give your furry friend the love and care they deserve. Book grooming, vet visits, boarding and more — all in one place.
        </Text>

        <View style={styles.featureRow}>
          {[
            { icon: "✂️", label: "Grooming" },
            { icon: "🏥", label: "Vet Care" },
            { icon: "🏠", label: "Boarding" },
            { icon: "🛁", label: "Spa" },
          ].map((f) => (
            <View key={f.label} style={styles.featureItem}>
              <View style={styles.featureIconBox}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Animated.View style={{ opacity: btnAnim, width: "100%" }}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.85}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.push("/auth/login")}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Splash / loading
  splash: {
    flex: 1,
    backgroundColor: "#0B3D2E",
    justifyContent: "center",
    alignItems: "center",
  },
  splashLogo: {
    width: 200,
    height: 200,
  },

  // Main screen
  container: {
    flex: 1,
    backgroundColor: "#0B3D2E",
  },

  // Top green section
  topSection: {
    flex: 0.42,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    gap: 12,
  },
  logo: {
    width: 130,
    height: 130,
  },
  appName: {
    fontSize: 30,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#A8D96C",
    textAlign: "center",
    marginTop: -6,
  },

  // Bottom white card
  bottomCard: {
    flex: 0.58,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 32,
    alignItems: "center",
    elevation: 12,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
    marginBottom: 10,
  },
  welcomeDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },

  // Feature icons row
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 28,
  },
  featureItem: {
    alignItems: "center",
    gap: 6,
  },
  featureIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F0F7F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D4EDD4",
  },
  featureIcon: { fontSize: 22 },
  featureLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#3E7B27",
  },

  // Buttons
  getStartedBtn: {
    backgroundColor: "#0B3D2E",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    width: "100%",
    elevation: 4,
    marginBottom: 14,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: "center",
  },
  loginLinkText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  loginLinkBold: {
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
  },
});
