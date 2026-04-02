import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const emptyForm = () => ({ fullName: "", email: "", password: "" });

export default function AdminStaff() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");

  const [formModal, setFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [detailModal, setDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [historyTab, setHistoryTab] = useState("visits");

  const loadStaff = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/auth/getallstaff`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setStaffList(data.staff || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadStaff(); }, [loadStaff]));

  const openDetail = async (s) => {
    setDetail({ staff: s, stats: null, recentVisits: [] });
    setDetailModal(true);
    setDetailLoading(true);
    try {
      const { token: t } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/auth/staffdetails/${s._id}`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) {
        setDetail({
          staff: data.staff,
          stats: data.stats,
          recentVisits: data.recentVisits || [],
          allServices: data.allServices || [],
          providedServiceIds: data.providedServiceIds || [],
          appointments: data.appointments || [],
          inventoryItems: data.inventoryItems || [],
          recentPets: data.recentPets || [],
        });
        setHistoryTab("visits");
      }
    } catch (e) { console.log(e); }
    finally { setDetailLoading(false); }
  };

  const openAdd = () => {
    setForm(emptyForm()); setEditingId(null); setShowPassword(false); setFormModal(true);
  };

  const openEdit = (s) => {
    setForm({ fullName: s.fullName, email: s.email, password: "" });
    setEditingId(s._id);
    setShowPassword(false);
    setDetailModal(false);
    setFormModal(true);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Full name is required.");
    if (!form.email.trim()) return Alert.alert("Error", "Email is required.");
    if (!editingId && form.password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`${BASE_URL}/api/v1/auth/updatestaff/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim() }),
          })
        : await fetch(`${BASE_URL}/api/v1/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role: "staff" }),
          });
      const data = await res.json();
      if (data.success) {
        setFormModal(false);
        loadStaff();
        Alert.alert("Success ✅", editingId ? "Staff updated!" : `"${form.fullName}" added!`);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Delete Staff", `Remove "${name}" from staff?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/v1/auth/deletestaff/${id}`, {
              method: "DELETE", headers: { Authorization: token },
            });
            const data = await res.json();
            if (data.success) {
              setStaffList(prev => prev.filter(s => s._id !== id));
              setDetailModal(false);
            } else Alert.alert("Error", data.message);
          } catch { Alert.alert("Error", "Network error"); }
        },
      },
    ]);
  };

  const getInitials = (name = "") =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "S";

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Staff</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#0B3D2E" />
          <Text style={s.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStaff(); }} tintColor="#0B3D2E" />}
        >
          {/* Total count card */}
          <View style={s.countCard}>
            <Ionicons name="people" size={28} color="#A8D96C" />
            <View style={{ marginLeft: 12 }}>
              <Text style={s.countVal}>{staffList.length}</Text>
              <Text style={s.countLabel}>Total Staff Members</Text>
            </View>
          </View>

          {staffList.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#A8D96C" />
              <Text style={s.emptyText}>No staff members yet</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={openAdd}>
                <Text style={s.emptyBtnText}>Add First Staff</Text>
              </TouchableOpacity>
            </View>
          ) : (
            staffList.map((item) => (
              <TouchableOpacity key={item._id} style={s.card} onPress={() => openDetail(item)} activeOpacity={0.82}>
                <View style={s.cardLeft}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{getInitials(item.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.staffName}>{item.fullName}</Text>
                    <Text style={s.staffEmail}>{item.email}</Text>
                    <View style={s.badge}><Text style={s.badgeTxt}>Staff</Text></View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* ─── Staff Detail Modal ─── */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "93%" }]}>

            {/* Modal Header */}
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Staff Profile</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ paddingVertical: 50 }} />
            ) : detail ? (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Avatar + Name + Actions */}
                <View style={s.profileRow}>
                  <View style={s.bigAvatar}>
                    <Text style={s.bigAvatarTxt}>{getInitials(detail.staff?.fullName)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.profileName}>{detail.staff?.fullName}</Text>
                    <View style={s.badge}><Text style={s.badgeTxt}>Staff Member</Text></View>
                    <View style={s.profileActions}>
                      <TouchableOpacity style={s.editActionBtn} onPress={() => openEdit(detail.staff)} activeOpacity={0.8}>
                        <Ionicons name="pencil-outline" size={14} color="#0B3D2E" />
                        <Text style={s.editActionTxt}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.delActionBtn} onPress={() => handleDelete(detail.staff?._id, detail.staff?.fullName)} activeOpacity={0.8}>
                        <Ionicons name="trash-outline" size={14} color="#C62828" />
                        <Text style={s.delActionTxt}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Personal Info */}
                <Text style={s.secTitle}>Personal Info</Text>
                <View style={s.infoCard}>
                  <InfoRow icon="mail-outline" label="Email" value={detail.staff?.email} />
                  <InfoRow icon="calendar-outline" label="Joined On" value={fmtDate(detail.staff?.createdAt)} last />
                </View>

                {/* Stats */}
                <Text style={s.secTitle}>Activity Stats</Text>
                <View style={s.statsRow}>
                  <StatBox icon="paw-outline" label="Total Visits" value={detail.stats?.totalVisits ?? 0} />
                  <StatBox icon="home-outline" label="Boardings" value={detail.stats?.totalBoardings ?? 0} />
                </View>

                {/* Services Section */}
                <Text style={s.secTitle}>Services</Text>
                <View style={s.servicesGrid}>
                  {(detail.allServices || []).map((svc) => {
                    const provided = (detail.providedServiceIds || []).includes(svc._id.toString());
                    return (
                      <View key={svc._id} style={[s.svcChip, provided && s.svcChipActive]}>
                        <Text style={s.svcEmoji}>{svc.emoji || "🐾"}</Text>
                        <Text style={[s.svcName, provided && s.svcNameActive]} numberOfLines={2}>{svc.purpose}</Text>
                        {provided && (
                          <View style={s.svcDot}>
                            <Ionicons name="checkmark-circle" size={14} color="#3E7B27" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Activity History Card */}
                <Text style={s.secTitle}>Activity History</Text>
                <View style={s.historyCard}>
                  {/* Tabs */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll}>
                    <View style={s.tabsRow}>
                      {[
                        { key: "visits", label: "Visits", icon: "paw", count: detail.recentVisits?.length },
                        { key: "appointments", label: "Bookings", icon: "calendar", count: detail.appointments?.length },
                        { key: "inventory", label: "Inventory", icon: "cube", count: detail.inventoryItems?.length },
                        { key: "pets", label: "Pet Master", icon: "heart", count: detail.recentPets?.length },
                      ].map(tab => (
                        <TouchableOpacity
                          key={tab.key}
                          style={[s.tab, historyTab === tab.key && s.tabActive]}
                          onPress={() => setHistoryTab(tab.key)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={tab.icon} size={13} color={historyTab === tab.key ? "#fff" : "#3E7B27"} />
                          <Text style={[s.tabTxt, historyTab === tab.key && s.tabTxtActive]}>{tab.label}</Text>
                          {tab.count > 0 && (
                            <View style={[s.tabBadge, historyTab === tab.key && s.tabBadgeActive]}>
                              <Text style={[s.tabBadgeTxt, historyTab === tab.key && s.tabBadgeTxtActive]}>{tab.count}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>

                  {/* Visits Tab */}
                  {historyTab === "visits" && (
                    detail.recentVisits?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="paw-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No visits recorded yet</Text>
                      </View>
                    ) : (
                      detail.recentVisits.map((v, i) => (
                        <View key={v._id || i} style={[s.historyItem, i === detail.recentVisits.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={s.historyIconBox}>
                            <Text style={{ fontSize: 16 }}>{v.visitType?.emoji || "🐾"}</Text>
                          </View>
                          <View style={s.historyContent}>
                            <View style={s.historyTop}>
                              <Text style={s.historyLabel}>{v.visitType?.purpose || "Visit"}</Text>
                              <Text style={s.historyTime}>{fmtDateTime(v.createdAt)}</Text>
                            </View>
                            {v.pet?.name ? (
                              <Text style={s.historySub}>
                                🐶 {v.pet.name}{v.pet?.owner?.name ? `  •  ${v.pet.owner.name}` : ""}
                              </Text>
                            ) : null}
                            {v.details?.price != null ? (
                              <Text style={s.historyAmount}>₹{v.details.price}</Text>
                            ) : null}
                          </View>
                        </View>
                      ))
                    )
                  )}

                  {/* Appointments Tab */}
                  {historyTab === "appointments" && (
                    detail.appointments?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="calendar-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No appointments found</Text>
                      </View>
                    ) : (
                      detail.appointments.map((a, i) => {
                        const statusColor = a.status === "completed" ? "#0B3D2E" : a.status === "confirmed" ? "#3E7B27" : a.status === "cancelled" ? "#C62828" : "#F59E0B";
                        const statusBg = a.status === "cancelled" ? "#FFEBEE" : a.status === "completed" ? "#E8F5E8" : "#FFF9E6";
                        return (
                          <View key={a._id || i} style={[s.historyItem, i === detail.appointments.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={[s.historyIconBox, { backgroundColor: statusBg }]}>
                              <Ionicons
                                name={a.status === "completed" ? "ribbon" : a.status === "confirmed" ? "checkmark-circle" : a.status === "cancelled" ? "close-circle" : "time"}
                                size={18} color={statusColor}
                              />
                            </View>
                            <View style={s.historyContent}>
                              <View style={s.historyTop}>
                                <Text style={[s.historyLabel, { color: statusColor }]}>
                                  {a.serviceName || "Booking"}
                                </Text>
                                <Text style={s.historyTime}>{fmtDateTime(a.createdAt)}</Text>
                              </View>
                              <Text style={s.historySub}>
                                {a.petName ? `🐶 ${a.petName}` : ""}{a.customerId?.fullName || a.customerId?.name ? `  •  ${a.customerId?.fullName || a.customerId?.name}` : ""}
                              </Text>
                              <View style={s.historyFooter}>
                                <View style={[s.statusChip, { backgroundColor: statusBg }]}>
                                  <Text style={[s.statusChipTxt, { color: statusColor }]}>{a.status}</Text>
                                </View>
                                {a.totalAmount > 0 && <Text style={s.historyAmount}>₹{a.totalAmount}</Text>}
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )
                  )}

                  {/* Inventory Tab */}
                  {historyTab === "inventory" && (
                    detail.inventoryItems?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="cube-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No inventory data</Text>
                      </View>
                    ) : (
                      detail.inventoryItems.map((item, i) => (
                        <View key={item._id || i} style={[s.historyItem, i === detail.inventoryItems.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={[s.historyIconBox, { backgroundColor: "#EEF4FF" }]}>
                            <Ionicons name="cube" size={18} color="#3B5BDB" />
                          </View>
                          <View style={s.historyContent}>
                            <View style={s.historyTop}>
                              <Text style={s.historyLabel}>{item.itemName}</Text>
                              <Text style={s.historyTime}>{fmtDateTime(item.updatedAt)}</Text>
                            </View>
                            <Text style={s.historySub}>
                              {item.itemType}  •  Stock: {item.stock ?? "—"}
                            </Text>
                          </View>
                        </View>
                      ))
                    )
                  )}

                  {/* Pet Master Tab */}
                  {historyTab === "pets" && (
                    detail.recentPets?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="heart-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No pets registered</Text>
                      </View>
                    ) : (
                      detail.recentPets.map((pet, i) => (
                        <View key={pet._id || i} style={[s.historyItem, i === detail.recentPets.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={[s.historyIconBox, { backgroundColor: "#FFF0F6" }]}>
                            <Ionicons name="heart" size={18} color="#C2255C" />
                          </View>
                          <View style={s.historyContent}>
                            <View style={s.historyTop}>
                              <Text style={s.historyLabel}>{pet.name}</Text>
                              <Text style={s.historyTime}>{fmtDateTime(pet.createdAt)}</Text>
                            </View>
                            <Text style={s.historySub}>
                              {pet.species || ""}{pet.breed ? `  •  ${pet.breed}` : ""}{pet.owner?.name ? `  •  ${pet.owner.name}` : ""}
                            </Text>
                          </View>
                        </View>
                      ))
                    )
                  )}
                </View>

                <View style={{ height: 24 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ─── Add / Edit Modal ─── */}
      <Modal visible={formModal} transparent animationType="slide" onRequestClose={() => setFormModal(false)}>
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editingId ? "Edit Staff" : "Add Staff Member"}</Text>
              <TouchableOpacity onPress={() => setFormModal(false)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Full Name *</Text>
              <View style={s.inputRow}>
                <Ionicons name="person-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput style={s.input} placeholder="Enter full name" placeholderTextColor="#aaa"
                  value={form.fullName} onChangeText={(v) => setForm(p => ({ ...p, fullName: v }))} />
              </View>
            </View>

            <View style={s.formGroup}>
              <Text style={s.label}>Email *</Text>
              <View style={s.inputRow}>
                <Ionicons name="mail-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput style={s.input} placeholder="Enter email" placeholderTextColor="#aaa"
                  keyboardType="email-address" autoCapitalize="none"
                  value={form.email} onChangeText={(v) => setForm(p => ({ ...p, email: v }))} />
              </View>
            </View>

            {!editingId && (
              <View style={s.formGroup}>
                <Text style={s.label}>Password *</Text>
                <View style={s.inputRow}>
                  <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                  <TextInput style={s.input} placeholder="Min 6 characters" placeholderTextColor="#aaa"
                    secureTextEntry={!showPassword}
                    value={form.password} onChangeText={(v) => setForm(p => ({ ...p, password: v }))} />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={s.hint}>
              <Ionicons name="information-circle-outline" size={16} color="#3E7B27" />
              <Text style={s.hintTxt}>
                {editingId ? "Update staff name and email." : "Staff can login using Staff tab on login screen."}
              </Text>
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? <ActivityIndicator color="#A8D96C" /> : (
                <>
                  <Ionicons name={editingId ? "checkmark-circle-outline" : "person-add-outline"} size={20} color="#A8D96C" />
                  <Text style={s.saveBtnTxt}>{editingId ? "Update Staff" : "Add Staff Member"}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[s.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: "#E8F5E8" }]}>
      <Ionicons name={icon} size={15} color="#3E7B27" style={{ marginRight: 10 }} />
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoVal}>{value || "—"}</Text>
    </View>
  );
}

function StatBox({ icon, label, value }) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon} size={24} color="#A8D96C" />
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
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
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#A8D96C", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  scroll: { padding: 16, paddingBottom: 40 },

  countCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 20,
    flexDirection: "row", alignItems: "center", marginBottom: 16, elevation: 3,
  },
  countVal: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#fff" },
  countLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center",
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  staffName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  staffEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 5 },
  badge: { backgroundColor: "#E8F5E8", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12, marginBottom: 16 },
  emptyBtn: { backgroundColor: "#0B3D2E", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  // Detail modal
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  bigAvatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  bigAvatarTxt: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  profileName: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 5 },
  profileActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  editActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  editActionTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  delActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#FFF0F0", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  delActionTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#C62828" },

  secTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8, marginTop: 4 },

  infoCard: { backgroundColor: "#F0F7F0", borderRadius: 14, paddingHorizontal: 14, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  infoLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666", flex: 1 },
  infoVal: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A", flex: 2, textAlign: "right" },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1, backgroundColor: "#0B3D2E", borderRadius: 14,
    padding: 16, alignItems: "center", gap: 6,
  },
  statVal: { fontSize: 26, fontFamily: "Poppins_700Bold", color: "#fff" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", textAlign: "center" },

  visitCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: "#D4EDD4",
  },
  visitTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  visitBadge: { backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  visitBadgeTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  visitDate: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  visitPetRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  visitPetTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#444" },
  visitPrice: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  noData: { alignItems: "center", paddingVertical: 30, gap: 6 },
  noDataTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  noDataSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center" },

  // History card
  historyCard: {
    backgroundColor: "#fff", borderRadius: 16,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 16, overflow: "hidden",
  },
  tabsScroll: { borderBottomWidth: 1, borderBottomColor: "#E8F5E8" },
  tabsRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  tabActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  tabTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  tabTxtActive: { color: "#A8D96C" },
  tabBadge: {
    backgroundColor: "#D4EDD4", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center",
  },
  tabBadgeActive: { backgroundColor: "rgba(168,217,108,0.25)" },
  tabBadgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  tabBadgeTxtActive: { color: "#A8D96C" },

  historyItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  historyIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  historyContent: { flex: 1 },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  historyLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  historyTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#999", marginLeft: 6 },
  historySub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 3 },
  historyAmount: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  historyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusChipTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  servicesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  svcChip: {
    width: "47%", backgroundColor: "#F0F7F0", borderRadius: 12,
    padding: 10, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center", gap: 8, position: "relative",
  },
  svcChipActive: { backgroundColor: "#E8F5E8", borderColor: "#3E7B27", borderWidth: 1.5 },
  svcEmoji: { fontSize: 20 },
  svcName: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: "#666" },
  svcNameActive: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  svcDot: { position: "absolute", top: 6, right: 6 },

  // Form modal
  formGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 12,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 50,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  hint: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 12, marginBottom: 16,
  },
  hintTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginBottom: 10,
  },
  saveBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
