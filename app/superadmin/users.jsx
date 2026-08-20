import { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView,
  Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const ROLES = [
  { value: "superadmin", label: "Super Admin", tint: "#F5C451", icon: "shield-checkmark" },
  { value: "admin",      label: "Admin",       tint: "#A8D96C", icon: "shield-half" },
  { value: "staff",      label: "Staff",       tint: "#7EC8E3", icon: "briefcase" },
  { value: "customer",   label: "Customer",    tint: "#E8A0BF", icon: "person" },
];
const roleMeta = (r) => ROLES.find((x) => x.value === r) || ROLES[3];

export default function SuperAdminUsers() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [meId, setMeId] = useState(null);

  const [roleFilter, setRoleFilter] = useState(params.role || "");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(params.includeInactive === "1");

  const [mode, setMode] = useState(null); // null | "edit" | "detail"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", role: "staff" });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      const { token: t, user: me } = await getAuth();
      setToken(t || "");
      setMeId(me?.id || me?._id || null);
      const q = new URLSearchParams({ limit: "200" });
      if (roleFilter) q.set("role", roleFilter);
      if (search.trim()) q.set("search", search.trim());
      if (includeInactive) q.set("includeInactive", "1");

      const res = await fetch(`${BASE_URL}/api/v1/superadmin/users?${q}`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
        setCounts(json.counts || {});
        setTotal(json.total || 0);
      }
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [roleFilter, search, includeInactive]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Debounce typing so every keystroke does not hit the server.
  const onSearchChange = (v) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(), 350);
  };
  useEffect(() => () => searchTimer.current && clearTimeout(searchTimer.current), []);

  // Creating goes through the shared form, which can also register a pet and
  // email the new sign-in details.
  const openAdd = () => router.push("/superadmin/adduser");

  const openEdit = (u) => {
    setForm({ fullName: u.fullName || "", email: u.email || "", phone: u.phone || "", password: "", role: u.role });
    setEditing(u); setShowPassword(false); setMode("edit");
  };

  const openDetail = async (u) => {
    setDetail({ user: u }); setMode("detail"); setDetailLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/users/${u._id}`, {
        headers: { Authorization: token },
      });
      const json = await res.json();
      if (json.success) setDetail(json);
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Full name is required.");
    if (!form.email.trim()) return Alert.alert("Error", "Email is required.");
    if (form.password && form.password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");

    setSaving(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
      };
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/users/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) { setMode(null); load(); Alert.alert("Done ✅", json.message); }
      else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const setStatus = async (u, isActive) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/users/${u._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json();
      if (json.success) { setMode(null); load(); }
      else Alert.alert("Not allowed", json.message);
    } catch { Alert.alert("Error", "Network error"); }
  };

  const remove = (u) => {
    Alert.alert(
      "Remove user",
      `"${u.fullName}" ka access band karein?\n\nAccount deactivate ho jayega — unke visits, bills aur prescriptions record par rahenge.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate", style: "destructive", onPress: async () => {
            try {
              const res = await fetch(`${BASE_URL}/api/v1/superadmin/users/${u._id}`, {
                method: "DELETE", headers: { Authorization: token },
              });
              const json = await res.json();
              if (json.success) { setMode(null); load(); }
              else Alert.alert("Not allowed", json.message);
            } catch { Alert.alert("Error", "Network error"); }
          },
        },
      ]
    );
  };

  const initials = (n = "") => n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "?";
  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Users</Text>
          <Text style={s.headerSub}>{total} shown</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color="#1A1206" />
          <Text style={s.addBtnTxt}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={17} color="#8A7A4A" />
          <TextInput
            style={s.searchInput}
            placeholder="Naam, email ya phone se dhoondein"
            placeholderTextColor="#B9AC85"
            value={search}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(""); load(); }}>
              <Ionicons name="close-circle" size={17} color="#CFC2A0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Role filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={s.chipRowInner}>
        <TouchableOpacity
          style={[s.chip, !roleFilter && s.chipActive]}
          onPress={() => setRoleFilter("")}
          activeOpacity={0.8}
        >
          <Text style={[s.chipTxt, !roleFilter && s.chipTxtActive]}>All</Text>
        </TouchableOpacity>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[s.chip, roleFilter === r.value && s.chipActive]}
            onPress={() => setRoleFilter(roleFilter === r.value ? "" : r.value)}
            activeOpacity={0.8}
          >
            <Ionicons name={r.icon} size={12} color={roleFilter === r.value ? "#1A1206" : r.tint} />
            <Text style={[s.chipTxt, roleFilter === r.value && s.chipTxtActive]}>
              {r.label} {counts[r.value] ?? 0}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.chip, includeInactive && s.chipActive]}
          onPress={() => setIncludeInactive((p) => !p)}
          activeOpacity={0.8}
        >
          <Ionicons name="pause-circle-outline" size={12} color={includeInactive ? "#1A1206" : "#8A7A4A"} />
          <Text style={[s.chipTxt, includeInactive && s.chipTxtActive]}>Deactivated</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#F5C451" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#F5C451" />}
        >
          {users.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color="#CFC2A0" />
              <Text style={s.emptyTxt}>Koi user nahi mila</Text>
            </View>
          ) : (
            users.map((u) => {
              const meta = roleMeta(u.role);
              const inactive = u.isActive === false;
              return (
                <TouchableOpacity
                  key={u._id}
                  style={[s.card, inactive && s.cardInactive]}
                  onPress={() => openDetail(u)}
                  activeOpacity={0.85}
                >
                  <View style={[s.avatar, { backgroundColor: meta.tint }]}>
                    <Text style={s.avatarTxt}>{initials(u.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{u.fullName}</Text>
                      {inactive && (
                        <View style={s.offBadge}><Text style={s.offBadgeTxt}>OFF</Text></View>
                      )}
                    </View>
                    <Text style={s.email} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <View style={[s.roleTag, { borderColor: meta.tint }]}>
                    <Text style={[s.roleTagTxt, { color: meta.tint === "#F5C451" ? "#8A6D14" : "#3A3327" }]}>
                      {meta.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Add / Edit sheet */}
      <Modal visible={mode === "edit"} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMode(null)} />
          <View style={s.sheet}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Edit user</Text>
              <TouchableOpacity onPress={() => setMode(null)}>
                <Ionicons name="close" size={22} color="#1A1206" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Role</Text>
              <View style={s.roleGrid}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[s.rolePick, form.role === r.value && { borderColor: r.tint, backgroundColor: "#FFFBEF" }]}
                    onPress={() => setForm((p) => ({ ...p, role: r.value }))}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={r.icon} size={16} color={r.tint} />
                    <Text style={s.rolePickTxt}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Full name *</Text>
              <View style={s.inputBox}>
                <Ionicons name="person-outline" size={17} color="#8A7A4A" />
                <TextInput style={s.input} value={form.fullName} placeholder="Pura naam"
                  placeholderTextColor="#B9AC85"
                  onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))} />
              </View>

              <Text style={s.label}>Email *</Text>
              <View style={s.inputBox}>
                <Ionicons name="mail-outline" size={17} color="#8A7A4A" />
                <TextInput style={s.input} value={form.email} placeholder="name@example.com"
                  placeholderTextColor="#B9AC85" autoCapitalize="none" keyboardType="email-address"
                  onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
              </View>

              <Text style={s.label}>Phone</Text>
              <View style={s.inputBox}>
                <Ionicons name="call-outline" size={17} color="#8A7A4A" />
                <TextInput style={s.input} value={form.phone} placeholder="10 digits"
                  placeholderTextColor="#B9AC85" keyboardType="number-pad" maxLength={10}
                  onChangeText={(v) => setForm((p) => ({ ...p, phone: v.replace(/\D/g, "") }))} />
              </View>

              <Text style={s.label}>Reset password</Text>
              <View style={s.inputBox}>
                <Ionicons name="lock-closed-outline" size={17} color="#8A7A4A" />
                <TextInput style={s.input} value={form.password}
                  placeholder="Khaali chhodo to purana hi rahega"
                  placeholderTextColor="#B9AC85" secureTextEntry={!showPassword}
                  onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
                <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#B9AC85" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#1A1206" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#1A1206" />
                    <Text style={s.saveBtnTxt}>Save changes</Text>
                  </>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail sheet */}
      <Modal visible={mode === "detail"} transparent animationType="slide" onRequestClose={() => setMode(null)}>
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMode(null)} />
          <View style={s.sheet}>
            {detail?.user && (
              <>
                <View style={s.sheetHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>{detail.user.fullName}</Text>
                    <Text style={s.sheetSub}>{detail.user.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setMode(null)}>
                    <Ionicons name="close" size={22} color="#1A1206" />
                  </TouchableOpacity>
                </View>

                <View style={s.metaRow}>
                  <View style={[s.roleTag, { borderColor: roleMeta(detail.user.role).tint }]}>
                    <Text style={s.roleTagTxt}>{roleMeta(detail.user.role).label}</Text>
                  </View>
                  <Text style={s.metaTxt}>{detail.user.phone || "no phone"}</Text>
                  <Text style={s.metaTxt}>joined {fmt(detail.user.createdAt)}</Text>
                </View>

                {detailLoading ? (
                  <ActivityIndicator color="#F5C451" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={s.activityGrid}>
                    {[
                      ["Visits", detail.activity?.visits],
                      ["Pets", detail.activity?.pets],
                      ["Appointments", detail.activity?.appointments],
                      ["Prescriptions", detail.activity?.prescriptions],
                      ["Inventory", detail.activity?.inventoryItems],
                      ["Bills", detail.activity?.bills],
                    ].map(([label, val]) => (
                      <View key={label} style={s.activityCard}>
                        <Text style={s.activityVal}>{val ?? 0}</Text>
                        <Text style={s.activityLabel}>{label}</Text>
                      </View>
                    ))}
                    {detail.walletBalance != null && (
                      <View style={[s.activityCard, { backgroundColor: "#1A1206" }]}>
                        <Text style={[s.activityVal, { color: "#F5C451" }]}>₹{detail.walletBalance}</Text>
                        <Text style={[s.activityLabel, { color: "#B9AC85" }]}>Wallet</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={s.actionRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(detail.user)} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={17} color="#1A1206" />
                    <Text style={s.actionTxt}>Edit</Text>
                  </TouchableOpacity>

                  {detail.user.isActive === false ? (
                    <TouchableOpacity style={[s.actionBtn, s.actionOn]} onPress={() => setStatus(detail.user, true)} activeOpacity={0.85}>
                      <Ionicons name="play-circle-outline" size={17} color="#fff" />
                      <Text style={[s.actionTxt, { color: "#fff" }]}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[s.actionBtn, s.actionOff]} onPress={() => setStatus(detail.user, false)} activeOpacity={0.85}>
                      <Ionicons name="pause-circle-outline" size={17} color="#fff" />
                      <Text style={[s.actionTxt, { color: "#fff" }]}>Deactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {String(detail.user._id) !== String(meId) && (
                  <TouchableOpacity style={s.removeBtn} onPress={() => remove(detail.user)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color="#C62828" />
                    <Text style={s.removeTxt}>Remove user</Text>
                  </TouchableOpacity>
                )}
                <View style={{ height: 16 }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F4EC" },

  header: {
    backgroundColor: "#1A1206", paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#B9AC85" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F5C451", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#1A1206" },

  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: "#EDE4CE",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1206" },

  chipRow: { maxHeight: 56 },
  chipRowInner: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#EDE4CE",
  },
  chipActive: { backgroundColor: "#F5C451", borderColor: "#F5C451" },
  chipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A7A4A" },
  chipTxtActive: { color: "#1A1206" },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#8A7A4A" },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: "#EDE4CE", elevation: 1,
  },
  cardInactive: { opacity: 0.55 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  avatarTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1A1206" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1A1206", flexShrink: 1 },
  email: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A7A4A" },
  offBadge: { backgroundColor: "#C62828", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  offBadgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#fff" },
  roleTag: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleTagTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#3A3327" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#F7F4EC", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "88%",
  },
  sheetHead: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 10 },
  sheetTitle: { flex: 1, fontSize: 18, fontFamily: "Poppins_700Bold", color: "#1A1206" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A7A4A", marginTop: 1 },

  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#1A1206", marginBottom: 6, marginTop: 12 },
  inputBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 48,
    borderWidth: 1, borderColor: "#EDE4CE",
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1206" },

  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolePick: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: "#EDE4CE",
  },
  rolePickTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#1A1206" },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#F5C451", borderRadius: 14, paddingVertical: 14, marginTop: 20,
  },
  saveBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#1A1206" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A7A4A" },

  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  activityCard: {
    width: "31%", backgroundColor: "#fff", borderRadius: 12, padding: 10, gap: 2,
    borderWidth: 1, borderColor: "#EDE4CE",
  },
  activityVal: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#1A1206" },
  activityLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A7A4A" },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#F5C451", borderRadius: 12, paddingVertical: 12,
  },
  actionOff: { backgroundColor: "#B8860B" },
  actionOn: { backgroundColor: "#3E7B27" },
  actionTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#1A1206" },

  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#FFCDD2", backgroundColor: "#FFF5F5",
  },
  removeTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },
});
