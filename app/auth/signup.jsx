import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../constants/api";

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName.trim()) return Alert.alert("Error", "Full name is required.");
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return Alert.alert("Error", "Valid email is required.");
    if (password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password, role: "customer" }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Success", "Account created! Please login.", [
          { text: "OK", onPress: () => router.replace("/auth/login") },
        ]);
      } else {
        Alert.alert("Signup Failed", data.message || "Something went wrong.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Image source={require("../../assets/images/doggoswhite.png")} style={s.logo} resizeMode="contain" />
          <Text style={s.appName}>Doggos Heaven</Text>
          <Text style={s.subtitle}>Create your account 🐾</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Sign Up</Text>

          {/* Full Name */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Full Name</Text>
            <View style={s.inputBox}>
              <Ionicons name="person-outline" size={18} color="#3E7B27" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Email */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Email Address</Text>
            <View style={s.inputBox}>
              <Ionicons name="mail-outline" size={18} color="#3E7B27" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.inputGroup}>
            <Text style={s.label}>Password</Text>
            <View style={s.inputBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#A8D96C" /> : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#A8D96C" />
                <Text style={s.btnText}>Create Account</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={s.footer}>
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")}>
              <Text style={s.link}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B3D2E" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },

  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80, marginBottom: 8 },
  appName: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#fff" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, elevation: 8 },
  title: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 20 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 50,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  eyeBtn: { padding: 4 },

  btn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 4, elevation: 3,
  },
  btnDisabled: { backgroundColor: "#aaa" },
  btnText: { color: "#A8D96C", fontSize: 15, fontFamily: "Poppins_700Bold" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  link: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
});
