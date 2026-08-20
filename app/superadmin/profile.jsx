import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth, clearAuth, saveAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

export default function SuperAdminProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    getAuth().then(({ token: t, user: u }) => {
      setToken(t || "");
      setUser(u);
      setForm({ fullName: u?.fullName || "", phone: u?.phone || "" });
    });
  }, []));

  const saveProfile = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Full name is required.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/updateprofile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ fullName: form.fullName.trim(), phone: form.phone.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        const next = { ...user, fullName: json.user.fullName, phone: json.user.phone };
        setUser(next);
        await saveAuth(token, next);
        setEditing(false);
        Alert.alert("Saved ✅", "Profile updated.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (!pw.currentPassword || !pw.newPassword) return Alert.alert("Error", "Both passwords are required.");
    if (pw.newPassword.length < 6) return Alert.alert("Error", "New password must be at least 6 characters.");
    setPwSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/changepassword`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(pw),
      });
      const json = await res.json();
      if (json.success) {
        setPw({ currentPassword: "", newPassword: "" });
        setPwOpen(false);
        Alert.alert("Done ✅", "Password changed.");
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setPwSaving(false); }
  };

  const logout = () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); router.replace("/auth/login"); } },
    ]);
  };

  const initials = (n = "") => n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "SA";

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <View style={s.avatar}><Text style={s.avatarTxt}>{initials(user?.fullName)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{user?.fullName || "Super Admin"}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <View style={s.badge}>
            <Ionicons name="shield-checkmark" size={11} color="#0B3D2E" />
            <Text style={s.badgeTxt}>SUPER ADMIN</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Profile</Text>
            <TouchableOpacity onPress={() => setEditing((p) => !p)}>
              <Text style={s.link}>{editing ? "Cancel" : "Edit"}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <>
              <Text style={s.label}>Full name</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} value={form.fullName}
                  onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))} />
              </View>
              <Text style={s.label}>Phone</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} value={form.phone} keyboardType="number-pad" maxLength={10}
                  onChangeText={(v) => setForm((p) => ({ ...p, phone: v.replace(/\D/g, "") }))} />
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#0B3D2E" /> : <Text style={s.primaryTxt}>Save</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Row label="Name" value={user?.fullName} />
              <Row label="Email" value={user?.email} />
              <Row label="Phone" value={user?.phone || "—"} last />
            </>
          )}
        </View>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Password</Text>
            <TouchableOpacity onPress={() => setPwOpen((p) => !p)}>
              <Text style={s.link}>{pwOpen ? "Cancel" : "Change"}</Text>
            </TouchableOpacity>
          </View>
          {pwOpen && (
            <>
              <Text style={s.label}>Current password</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} secureTextEntry value={pw.currentPassword}
                  onChangeText={(v) => setPw((p) => ({ ...p, currentPassword: v }))} />
              </View>
              <Text style={s.label}>New password</Text>
              <View style={s.inputBox}>
                <TextInput style={s.input} secureTextEntry value={pw.newPassword}
                  onChangeText={(v) => setPw((p) => ({ ...p, newPassword: v }))} />
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={changePassword} disabled={pwSaving} activeOpacity={0.85}>
                {pwSaving ? <ActivityIndicator color="#0B3D2E" /> : <Text style={s.primaryTxt}>Update password</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#C62828" />
          <Text style={s.logoutTxt}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20, paddingBottom: 20,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  avatar: {
    width: 58, height: 58, borderRadius: 29, backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  name: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff" },
  email: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 1 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: "#A8D96C", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 6,
  },
  badgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#0B3D2E", letterSpacing: 0.5 },

  scroll: { padding: 16 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHead: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  link: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  row: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E8F5E8" },
  rowLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#8A9A8A" },
  rowValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 10, marginBottom: 6 },
  inputBox: {
    backgroundColor: "#F0F7F0", borderRadius: 12, paddingHorizontal: 12, height: 46,
    justifyContent: "center", borderWidth: 1, borderColor: "#D4EDD4",
  },
  input: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  primaryBtn: {
    backgroundColor: "#A8D96C", borderRadius: 12, paddingVertical: 12,
    alignItems: "center", marginTop: 14,
  },
  primaryTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "#FFCDD2",
  },
  logoutTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
});
