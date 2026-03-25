import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { BASE_URL } from "../../constants/api";

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!formData.fullName.trim()) return "Full name is required";
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email))
      return "Valid email is required";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    return null;
  };

  const handleSignup = async () => {
    const error = validate();
    if (error) { Alert.alert("Error", error); return; }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role: "customer" }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Account created! Please login.", [
          { text: "OK", onPress: () => router.replace("/auth/login") },
        ]);
      } else {
        Alert.alert("Signup Failed", data.message || "Something went wrong");
      }
    } catch (error) {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>DoggosHeaven 🐾</Text>
          <Text style={styles.subtitle}>Join our pet family!</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Sign Up</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
              value={formData.fullName}
              onChangeText={(v) => update("fullName", v)}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(v) => update("email", v)}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={formData.password}
                onChangeText={(v) => update("password", v)}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")}>
              <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 32 },
  appName: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#666", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  title: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  passwordRow: { flexDirection: "row", alignItems: "center" },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: "#0B3D2E",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { backgroundColor: "#aaa" },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  link: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
});
