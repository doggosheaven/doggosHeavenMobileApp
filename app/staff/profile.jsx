import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth, clearAuth, saveAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function StaffProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  useFocusEffect(useCallback(() => {
    getAuth().then(({ user: u, token: t }) => {
      setUser(u);
      setToken(t || "");
    });
  }, []));

  const getInitials = (name) => {
    if (!name) return "S";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const openEdit = () => {
    setForm({ fullName: user?.fullName || "", phone: user?.phone || "" });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Name cannot be empty.");
    if (form.phone && form.phone.trim().length !== 10) return Alert.alert("Error", "Phone must be 10 digits.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/updateprofile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ fullName: form.fullName.trim(), phone: form.phone.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, fullName: form.fullName.trim(), phone: form.phone.trim() };
        await saveAuth(token, updated);
        setUser(updated);
        setEditModal(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current) return Alert.alert("Error", "Enter current password.");
    if (pwForm.newPw.length < 6) return Alert.alert("Error", "New password must be at least 6 characters.");
    if (pwForm.newPw !== pwForm.confirm) return Alert.alert("Error", "Passwords do not match.");
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/changepassword`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (data.success) {
        setPwModal(false);
        setPwForm({ current: "", newPw: "", confirm: "" });
        Alert.alert("Success ✅", "Password changed successfully!");
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); router.replace("/auth/login"); } },
    ]);
  };

  const menuItems = [
    { icon: "grid-outline",           label: "Dashboard",     onPress: () => router.push("/staff/dashboard") },
    { icon: "paw-outline",            label: "Pet Master",    onPress: () => router.push("/staff/petmaster") },
    { icon: "cube-outline",           label: "Inventory",     onPress: () => router.push("/staff/inventory") },
    { icon: "calendar-outline",       label: "My Bookings",   onPress: () => router.push("/staff/appointments") },
    { icon: "ribbon-outline",         label: "My Services",   onPress: () => router.push("/staff/myservices") },
    { icon: "notifications-outline",  label: "Reminders",     onPress: () => router.push("/staff/reminders") },
    { icon: "exit-outline",           label: "Deboard Pets",  onPress: () => router.push("/staff/deboard") },
    { icon: "lock-closed-outline",    label: "Change Password", onPress: () => setPwModal(true) },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
        <TouchableOpacity style={s.editHeaderBtn} onPress={openEdit} activeOpacity={0.8}>
          <Ionicons name="pencil-outline" size={16} color="#A8D96C" />
          <Text style={s.editHeaderText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Avatar Card */}
        <View style={s.avatarCard}>
          <TouchableOpacity style={s.avatarWrapper} onPress={openEdit} activeOpacity={0.8}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarText}>{getInitials(user?.fullName)}</Text>
            </View>
            <View style={s.editBadge}>
              <Ionicons name="pencil" size={11} color="#0B3D2E" />
            </View>
          </TouchableOpacity>
          <Text style={s.userName}>{user?.fullName || "Staff"}</Text>
          <Text style={s.userEmail}>{user?.email || ""}</Text>
          {user?.phone ? <Text style={s.userPhone}>📞 {user.phone}</Text> : null}
          <View style={s.roleBadge}>
            <Ionicons name="person-circle-outline" size={14} color="#A8D96C" />
            <Text style={s.roleText}>Staff Member</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={s.infoCard}>
          <View style={s.infoCardHeader}>
            <Text style={s.infoCardTitle}>Account Info</Text>
            <TouchableOpacity onPress={openEdit}>
              <Text style={s.editLink}>Edit →</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: "Full Name", value: user?.fullName || "—", icon: "person-outline" },
            { label: "Email",     value: user?.email || "—",     icon: "mail-outline" },
            { label: "Phone",     value: user?.phone || "Not set", icon: "call-outline" },
            { label: "Role",      value: "Staff Member",           icon: "shield-outline" },
          ].map((item, i, arr) => (
            <View key={item.label} style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.infoIconBox}>
                <Ionicons name={item.icon} size={18} color="#3E7B27" />
              </View>
              <View style={s.infoContent}>
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Nav */}
        <View style={s.menuCard}>
          <Text style={s.infoCardTitle}>Quick Navigation</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuItem, i === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={s.menuIconBox}>
                <Ionicons name={item.icon} size={20} color="#0B3D2E" />
              </View>
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#aaa" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#C62828" />
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={s.version}>Doggos Heaven Staff v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <Text style={s.formLabel}>Full Name</Text>
            <View style={s.inputBox}>
              <Ionicons name="person-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input} placeholder="Enter full name" placeholderTextColor="#aaa"
                value={form.fullName} onChangeText={(v) => setForm(p => ({ ...p, fullName: v }))}
              />
            </View>

            <Text style={s.formLabel}>Phone Number</Text>
            <View style={s.inputBox}>
              <Ionicons name="call-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input} placeholder="10-digit phone number" placeholderTextColor="#aaa"
                keyboardType="number-pad" maxLength={10}
                value={form.phone}
                onChangeText={(v) => setForm(p => ({ ...p, phone: v.replace(/[^0-9]/g, "").slice(0, 10) }))}
              />
              {form.phone.length > 0 && (
                <Text style={{ fontSize: 11, color: form.phone.length === 10 ? "#3E7B27" : "#B8860B" }}>
                  {form.phone.length}/10
                </Text>
              )}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#A8D96C" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={pwModal} transparent animationType="slide" onRequestClose={() => setPwModal(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPwModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {[
              { label: "Current Password", key: "current", placeholder: "Enter current password" },
              { label: "New Password",     key: "newPw",   placeholder: "Min 6 characters" },
              { label: "Confirm Password", key: "confirm", placeholder: "Re-enter new password" },
            ].map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text style={s.formLabel}>{label}</Text>
                <View style={s.inputBox}>
                  <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.input} placeholder={placeholder} placeholderTextColor="#aaa"
                    secureTextEntry={!showPw[key]}
                    value={pwForm[key]}
                    onChangeText={(v) => setPwForm(p => ({ ...p, [key]: v }))}
                  />
                  <TouchableOpacity onPress={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}>
                    <Ionicons name={showPw[key] ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.saveBtn} onPress={handleChangePassword} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#A8D96C" /> : (
                <>
                  <Ionicons name="lock-closed-outline" size={20} color="#A8D96C" />
                  <Text style={s.saveBtnText}>Update Password</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  editHeaderBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(168,217,108,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editHeaderText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  scroll: { padding: 16, paddingBottom: 40 },

  avatarCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 3,
  },
  avatarWrapper: { position: "relative", marginBottom: 12 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center",
  },
  editBadge: {
    position: "absolute", bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#0B3D2E",
  },
  avatarText: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  userName: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  userEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa", marginBottom: 4 },
  userPhone: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 10 },
  roleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(168,217,108,0.2)",
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
  },
  roleText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  infoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  infoCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  infoCardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  editLink: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999", marginBottom: 2 },
  infoValue: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  menuCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#FFCDD2", marginBottom: 16, elevation: 1,
  },
  logoutText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#C62828" },
  version: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", color: "#bbb" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  formLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 50, marginBottom: 16,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 4, marginBottom: 10,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
