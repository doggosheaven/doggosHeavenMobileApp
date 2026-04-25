import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, Modal,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { BASE_URL } from "../../constants/api";
import { saveAuth } from "../../utils/authStorage";

const ROLES = [
  { value: "customer", label: "Customer", icon: "person-outline" },
  { value: "staff",    label: "Staff",    icon: "briefcase-outline" },
];

// ── Styles defined BEFORE components so they are available ──────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B3D2E" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },

  header: { alignItems: "center", marginBottom: 24 },
  logo: { width: 80, height: 80, marginBottom: 8 },
  appName: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#fff" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  roleRow: {
    flexDirection: "row", gap: 10, marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, padding: 6,
  },
  roleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 12,
  },
  roleBtnActive: { backgroundColor: "#0B3D2E", elevation: 3 },
  roleText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  roleTextActive: { color: "#A8D96C" },

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

  forgotBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 14, paddingVertical: 6 },
  forgotTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  link: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 12, marginTop: 16,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
});

const fp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginTop: 1 },

  stepRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  stepDot: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#E8F5E8" },
  stepDotActive: { backgroundColor: "#A8D96C" },
  stepDotDone: { backgroundColor: "#0B3D2E" },

  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 50,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginTop: 6, marginBottom: 4 },

  btn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 16, elevation: 3,
  },
  btnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  otpInfoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  otpInfoTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  resendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, marginTop: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: "#E8F5E8", borderWidth: 1, borderColor: "#D4EDD4",
  },
  resendBtnDisabled: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0" },
  resendTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  resendTxtDisabled: { color: "#bbb" },
});

// ── ForgotPasswordModal ──────────────────────────────────────────────────────

function ForgotPasswordModal({ visible, onClose, role }) {
  const [step, setStep] = useState(1);
  const [fpEmail, setFpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClose = () => {
    setStep(1); setFpEmail(""); setOtp(""); setNewPass(""); setConfirmPass(""); setResendTimer(0);
    onClose();
  };

  const sendOtp = async () => {
    if (!fpEmail.trim()) return Alert.alert("Error", "Please enter your email.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim().toLowerCase(), role }),
      });
      const data = await res.json();
      if (data.success) { setStep(2); startTimer(); }
      else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error."); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) return Alert.alert("Error", "Enter the 6-digit OTP.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim().toLowerCase(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (data.success) setStep(3);
      else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error."); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (newPass.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    if (newPass !== confirmPass) return Alert.alert("Error", "Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail.trim().toLowerCase(), newPassword: newPass }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("✅ Success", "Password reset successfully! Please login.", [{ text: "OK", onPress: handleClose }]);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error."); }
    finally { setLoading(false); }
  };

  const STEPS = ["Email", "Verify OTP", "New Password"];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={fp.overlay}>
        <View style={fp.sheet}>
          {/* Header */}
          <View style={fp.header}>
            <View style={fp.headerIcon}>
              <Ionicons name="lock-open-outline" size={22} color="#A8D96C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fp.headerTitle}>Forgot Password</Text>
              <Text style={fp.headerSub}>{STEPS[step - 1]}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#0B3D2E" />
            </TouchableOpacity>
          </View>

          {/* Step indicators */}
          <View style={fp.stepRow}>
            {STEPS.map((_, i) => (
              <View key={i} style={[fp.stepDot, step > i && fp.stepDotDone, step === i + 1 && fp.stepDotActive]} />
            ))}
          </View>

          {/* Step 1 — Email */}
          {step === 1 && (
            <View>
              <Text style={fp.label}>Registered Email</Text>
              <View style={fp.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput
                  style={fp.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={fpEmail}
                  onChangeText={setFpEmail}
                />
              </View>
              <Text style={fp.hint}>We'll send a 6-digit OTP to this email.</Text>
              <TouchableOpacity style={fp.btn} onPress={sendOtp} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="send-outline" size={18} color="#A8D96C" /><Text style={fp.btnTxt}>Send OTP</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <View>
              <View style={fp.otpInfoBox}>
                <Ionicons name="mail-open-outline" size={16} color="#3E7B27" />
                <Text style={fp.otpInfoTxt}>OTP sent to <Text style={{ fontFamily: "Poppins_700Bold" }}>{fpEmail}</Text></Text>
              </View>
              <Text style={fp.label}>Enter 6-digit OTP</Text>
              <View style={fp.inputBox}>
                <Ionicons name="keypad-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput
                  style={fp.input}
                  placeholder="000000"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>
              <TouchableOpacity style={fp.btn} onPress={verifyOtp} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="checkmark-circle-outline" size={18} color="#A8D96C" /><Text style={fp.btnTxt}>Verify OTP</Text></>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[fp.resendBtn, resendTimer > 0 && fp.resendBtnDisabled]}
                onPress={() => { if (resendTimer === 0) { setOtp(""); sendOtp(); } }}
                disabled={resendTimer > 0}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={14} color={resendTimer > 0 ? "#bbb" : "#3E7B27"} />
                <Text style={[fp.resendTxt, resendTimer > 0 && fp.resendTxtDisabled]}>
                  {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3 — New Password */}
          {step === 3 && (
            <View>
              <Text style={fp.label}>New Password</Text>
              <View style={fp.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput
                  style={fp.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#999"
                  secureTextEntry={!showNew}
                  value={newPass}
                  onChangeText={setNewPass}
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color="#999" />
                </TouchableOpacity>
              </View>
              <Text style={[fp.label, { marginTop: 12 }]}>Confirm Password</Text>
              <View style={fp.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput
                  style={fp.input}
                  placeholder="Re-enter password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirm}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color="#999" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={fp.btn} onPress={resetPassword} disabled={loading} activeOpacity={0.8}>
                {loading ? <ActivityIndicator color="#A8D96C" /> : (
                  <><Ionicons name="shield-checkmark-outline" size={18} color="#A8D96C" /><Text style={fp.btnTxt}>Reset Password</Text></>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── LoginScreen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();
  const [role, setRole] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      let data;
      if (role === "staff") {
        const r1 = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password, role: "staff" }),
        });
        data = await r1.json();
        if (!data.success) {
          const r2 = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password, role: "admin" }),
          });
          data = await r2.json();
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail, password, role: "customer" }),
        });
        data = await res.json();
      }

      if (data.success) {
        await saveAuth(data.token, data.user);
        // Push token register for buzzer
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === "granted") {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            const pushToken = tokenData.data;
            if (pushToken && data.user?.id) {
              fetch(`${BASE_URL}/api/v1/customerappointment/savepushtoken`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: data.user.id, expoPushToken: pushToken }),
              }).catch(() => {});
            }
          }
        } catch {}
        const actualRole = data.user?.role;
        if (actualRole === "admin")      router.replace("/admin/dashboard");
        else if (actualRole === "staff") router.replace("/staff/dashboard");
        else                             router.replace("/(tabs)/home");
      } else {
        Alert.alert("Login Failed", data.message || "Invalid credentials");
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Image source={require("../../assets/images/doggoswhite.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>Doggos Heaven</Text>
            <Text style={styles.subtitle}>Welcome back!</Text>
          </View>

          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                onPress={() => setRole(r.value)}
                activeOpacity={0.8}
              >
                <Ionicons name={r.icon} size={18} color={role === r.value ? "#A8D96C" : "#666"} />
                <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>
              {role === "staff" ? "Staff / Admin Login" : "Customer Login"}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#A8D96C" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#A8D96C" />
                  <Text style={styles.btnText}>Login as {ROLES.find(r => r.value === role)?.label}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => setForgotVisible(true)} activeOpacity={0.7}>
              <Ionicons name="key-outline" size={14} color="#3E7B27" />
              <Text style={styles.forgotTxt}>Forgot Password?</Text>
            </TouchableOpacity>

            {role === "customer" && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/auth/signup")}>
                  <Text style={styles.link}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}

            {role !== "customer" && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color="#3E7B27" />
                <Text style={styles.infoText}>Staff accounts are created by Admin.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordModal visible={forgotVisible} onClose={() => setForgotVisible(false)} role={role} />
    </>
  );
}
