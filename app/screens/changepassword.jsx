import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useRouter } from "expo-router";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });

  const toggle = (field) => setShow((s) => ({ ...s, [field]: !s[field] }));

  const handleChange = async () => {
    if (!form.current || !form.newPass || !form.confirm) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    if (form.newPass.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    if (form.newPass !== form.confirm) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/auth/changepassword`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Success", "Password changed successfully!", [{ text: "OK", onPress: () => router.back() }]);
      } else {
        Alert.alert("Error", data.message || "Failed to change password.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, placeholder }) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={form[field]}
          onChangeText={(v) => setForm({ ...form, [field]: v })}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          secureTextEntry={!show[field]}
        />
        <TouchableOpacity onPress={() => toggle(field)}>
          <Ionicons name={show[field] ? "eye-off-outline" : "eye-outline"} size={18} color="#aaa" />
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Header title="Change Password" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.iconBox}>
          <Ionicons name="shield-checkmark" size={48} color="#A8D96C" />
        </View>
        <Text style={styles.subtitle}>Keep your account secure with a strong password.</Text>

        <View style={styles.card}>
          <Field label="Current Password" field="current" placeholder="Enter current password" />
          <Field label="New Password" field="newPass" placeholder="Enter new password" />
          <Field label="Confirm New Password" field="confirm" placeholder="Confirm new password" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleChange} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#A8D96C" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
              <Text style={styles.saveBtnText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 20, paddingBottom: 100 },

  iconBox: {
    alignSelf: "center",
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#0B3D2E",
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
  },
  subtitle: {
    textAlign: "center", fontSize: 13,
    fontFamily: "Inter_400Regular", color: "#555",
    marginBottom: 24, paddingHorizontal: 20,
  },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    marginBottom: 20, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 4 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, marginBottom: 14, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    elevation: 3,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
