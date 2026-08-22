import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getAuth, clearAuth, saveAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function AdminProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAuth = useCallback(async () => {
    const { user: u, token: t } = await getAuth();
    setUser(u);
    setToken(t || "");
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadAuth(); }, [loadAuth]));

  const getInitials = (name) => {
    if (!name) return "A";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to update profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("profilePhoto", { uri, name: "profile.jpg", type: "image/jpeg" });
      const res = await fetch(`${BASE_URL}/api/v1/auth/updateprofilephoto`, {
        method: "PUT",
        headers: { Authorization: token },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const updated = { ...user, profilePhoto: data.profilePhoto || uri };
        await saveAuth(token, updated);
        setUser(updated);
        Alert.alert("✅ Done", "Profile photo updated!");
      } else {
        const updated = { ...user, profilePhoto: uri };
        await saveAuth(token, updated);
        setUser(updated);
      }
    } catch {
      const updated = { ...user, profilePhoto: uri };
      await saveAuth(token, updated);
      setUser(updated);
    } finally { setUploadingPhoto(false); }
  };

  const handlePhotoOptions = () => {
    Alert.alert("Profile Photo", "Choose an option", [
      { text: "Choose from Gallery", onPress: handlePickPhoto },
      { text: "Remove Photo", style: "destructive", onPress: async () => {
        const updated = { ...user, profilePhoto: null };
        await saveAuth(token, updated);
        setUser(updated);
      }},
      { text: "Cancel", style: "cancel" },
    ]);
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

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); router.replace("/auth/login"); } },
    ]);
  };

  const menuItems = [
    { icon: "grid-outline",          label: "Dashboard",       onPress: () => router.push("/admin/dashboard") },
    { icon: "calendar-outline",      label: "All Bookings",    onPress: () => router.push("/admin/appointments") },
    { icon: "paw-outline",           label: "Pet Master",      onPress: () => router.push("/admin/petmaster") },
    { icon: "cube-outline",          label: "Inventory",       onPress: () => router.push("/admin/inventory") },
    { icon: "notifications-outline", label: "Reminders",       onPress: () => router.push("/admin/reminders") },
    { icon: "construct-outline",     label: "Services",        onPress: () => router.push("/admin/services") },
    { icon: "people-outline",        label: "Staff",           onPress: () => router.push("/admin/staff") },
    { icon: "cash-outline",          label: "Revenue",         onPress: () => router.push("/admin/revenue") },
    { icon: "card-outline",          label: "Booking Revenue", onPress: () => router.push("/admin/bookingrevenueadmin") },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={openEdit} activeOpacity={0.8}>
          <Ionicons name="pencil-outline" size={16} color="#A8D96C" />
          <Text style={styles.editHeaderText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadAuth(); }}
            tintColor="#0B3D2E"
          />
        }
      >
        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePhotoOptions} activeOpacity={0.8}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(user?.fullName)}</Text>
              </View>
            )}
            {uploadingPhoto ? (
              <View style={styles.editBadge}>
                <ActivityIndicator size="small" color="#0B3D2E" />
              </View>
            ) : (
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={11} color="#0B3D2E" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.fullName || "Admin"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          {user?.phone ? <Text style={styles.userPhone}>📞 {user.phone}</Text> : null}
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#A8D96C" />
            <Text style={styles.roleText}>{user?.role === "admin" ? "Administrator" : "Staff"}</Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>Account Info</Text>
            <TouchableOpacity onPress={openEdit}>
              <Text style={styles.editLink}>Edit →</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: "Full Name", value: user?.fullName || "—", icon: "person-outline" },
            { label: "Email",     value: user?.email || "—",     icon: "mail-outline" },
            { label: "Phone",     value: user?.phone || "Not set", icon: "call-outline" },
            { label: "Role",      value: user?.role === "admin" ? "Administrator" : "Staff", icon: "shield-outline" },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.infoIconBox}>
                <Ionicons name={item.icon} size={18} color="#3E7B27" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Nav */}
        <View style={styles.menuCard}>
          <Text style={styles.infoCardTitle}>Quick Navigation</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, i === menuItems.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={20} color="#0B3D2E" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#aaa" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#C62828" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Doggos Heaven Admin v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Full Name</Text>
            <View style={styles.inputBox}>
              <Ionicons name="person-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#aaa"
                value={form.fullName}
                onChangeText={(v) => setForm(p => ({ ...p, fullName: v }))}
              />
            </View>

            <Text style={styles.formLabel}>Phone Number</Text>
            <View style={styles.inputBox}>
              <Ionicons name="call-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="10-digit phone number"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={10}
                value={form.phone}
                onChangeText={(v) => setForm(p => ({ ...p, phone: v.replace(/[^0-9]/g, "").slice(0, 10) }))}
              />
              {form.phone.length > 0 && (
                <Text style={{ fontSize: 11, color: form.phone.length === 10 ? "#3E7B27" : "#B8860B" }}>
                  {form.phone.length}/10
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#A8D96C" /> : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
    overflow: "hidden",
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

  // Modal
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
