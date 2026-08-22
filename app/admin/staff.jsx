import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState } from "../../components/ScreenState";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarModal({ visible, selectedDate, onSelect, onClose }) {
  const [calMonth, setCalMonth] = useState(selectedDate || new Date());
  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const isSameDay   = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

  // Fixed 6-row grid — always 42 cells
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < 42) cells.push(null);

  const CELL = 36; // fixed cell size

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cal.box}>
          <View style={cal.header}>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month-1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
            </TouchableOpacity>
            <Text style={cal.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={() => setCalMonth(new Date(year, month+1, 1))} hitSlop={{top:8,bottom:8,left:8,right:8}}>
              <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
            </TouchableOpacity>
          </View>

          {/* Day names row */}
          <View style={cal.dayRow}>
            {DAY_NAMES.map(d => (
              <View key={d} style={{ width: CELL, alignItems: "center" }}>
                <Text style={cal.dayName}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid — 6 rows x 7 cols */}
          {[0,1,2,3,4,5].map(row => (
            <View key={row} style={{ flexDirection: "row", marginBottom: 2 }}>
              {[0,1,2,3,4,5,6].map(col => {
                const day = cells[row * 7 + col];
                if (!day) return <View key={col} style={{ width: CELL, height: CELL }} />;
                const thisDate = new Date(year, month, day);
                const isSel   = selectedDate && isSameDay(thisDate, selectedDate);
                const isToday = isSameDay(thisDate, new Date());
                return (
                  <TouchableOpacity
                    key={col}
                    style={[cal.day, { width: CELL, height: CELL }, isSel && cal.daySelected, isToday && !isSel && cal.dayToday]}
                    onPress={() => { onSelect(thisDate); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[cal.dayTxt, isSel && cal.dayTxtSelected, isToday && !isSel && cal.dayTxtToday]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity style={[cal.todayBtn, { flex: 1, backgroundColor: "#F0F7F0" }]} onPress={() => { onSelect(new Date()); onClose(); }} activeOpacity={0.8}>
              <Text style={[cal.todayBtnTxt, { color: "#0B3D2E" }]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cal.todayBtn, { flex: 1 }]} onPress={() => { onSelect(null); onClose(); }} activeOpacity={0.8}>
              <Text style={cal.todayBtnTxt}>All Dates</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay: {flex:1,backgroundColor:"rgba(0,0,0,0.45)",justifyContent:"center",alignItems:"center"},
  box: {backgroundColor:"#fff",borderRadius:20,padding:20,width:"88%",elevation:10},
  header: {flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14},
  monthTxt: {fontSize:16,fontFamily:"Poppins_700Bold",color:"#0B3D2E"},
  dayRow: {flexDirection:"row",marginBottom:6},
  dayName: {fontSize:11,fontFamily:"Poppins_700Bold",color:"#3E7B27",textAlign:"center"},
  day: {justifyContent:"center",alignItems:"center",borderRadius:8},
  daySelected: {backgroundColor:"#0B3D2E"},
  dayToday: {backgroundColor:"#E8F5E8",borderWidth:1.5,borderColor:"#3E7B27"},
  dayTxt: {fontSize:13,fontFamily:"Inter_400Regular",color:"#1A1A1A"},
  dayTxtSelected: {fontFamily:"Poppins_700Bold",color:"#A8D96C"},
  dayTxtToday: {fontFamily:"Poppins_700Bold",color:"#0B3D2E"},
  todayBtn: {backgroundColor:"#0B3D2E",borderRadius:12,paddingVertical:12,alignItems:"center"},
  todayBtnTxt: {fontSize:14,fontFamily:"Poppins_700Bold",color:"#A8D96C"},
});

const emptyForm = () => ({ fullName: "", email: "", password: "" });

export default function AdminStaff() {
  const router = useRouter();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");

  // single modal with mode: null | "detail" | "edit" | "add"
  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [historyTab, setHistoryTab] = useState("visits");
  const [revenueDate, setRevenueDate] = useState(null);
  const [showRevCal, setShowRevCal] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const res = await fetch(`${BASE_URL}/api/v1/auth/getallstaff`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setStaffList(data.staff || []);
    } catch (e) { if (__DEV__) console.log(e); setLoadError(true); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadStaff(); }, [loadStaff]));

  const openDetail = async (s) => {
    setDetail({ staff: s, stats: null, recentVisits: [] });
    setModalMode("detail");
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
          boardings: data.boardings || [],
          prescriptions: data.prescriptions || [],
        });
        setHistoryTab("visits");
      }
    } catch (e) { console.log(e); }
    finally { setDetailLoading(false); }
  };

  const fetchRevenue = async (staffId, date = null) => {
    setRevenueLoading(true);
    try {
      const { token: t } = await getAuth();
      const dateStr = date ? date.toISOString().split('T')[0] : '';
      const url = dateStr
        ? `${BASE_URL}/api/v1/auth/staffrevenue/${staffId}?date=${dateStr}`
        : `${BASE_URL}/api/v1/auth/staffrevenue/${staffId}`;
      const res = await fetch(url, { headers: { Authorization: t || '' } });
      const data = await res.json();
      if (data.success) setRevenueData(data);
    } catch (e) { console.log(e); }
    finally { setRevenueLoading(false); }
  };

  const openAdd = () => {
    setForm(emptyForm()); setEditingId(null); setShowPassword(false); setModalMode("add");
  };

  const openEdit = (s) => {
    setForm({ fullName: s.fullName, email: s.email, password: "" });
    setEditingId(s._id);
    setShowPassword(false);
    setModalMode("edit");
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Full name is required.");
    if (!form.email.trim()) return Alert.alert("Error", "Email is required.");
    if (!editingId && form.password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    if (editingId && form.password && form.password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`${BASE_URL}/api/v1/auth/updatestaff/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify({
              fullName: form.fullName.trim(),
              email: form.email.trim(),
              ...(form.password ? { password: form.password } : {}),
            }),
          })
        : await fetch(`${BASE_URL}/api/v1/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: token },
            body: JSON.stringify({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role: "staff" }),
          });
      const data = await res.json();
      if (data.success) {
        setModalMode(null);
        loadStaff();
        Alert.alert("Success ✅", editingId ? "Staff updated!" : `"${form.fullName}" added!`);
      } else Alert.alert("Error", data.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Remove Staff", `Remove "${name}" from staff?

Their login is disabled immediately. Past visits, bills and prescriptions stay on record.`, [
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
              setModalMode(null);
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
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Staff</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#0B3D2E" />
          <Text style={s.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : loadError ? (
        <ErrorState
          message="Could not load this. Check your connection."
          onRetry={() => { setLoadError(false); setLoading(true); loadStaff(); }}
        />
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
                  {item.profilePhoto ? (
                    <Image source={{ uri: item.profilePhoto }} style={s.avatarImg} />
                  ) : (
                    <View style={s.avatar}>
                      <Text style={s.avatarTxt}>{getInitials(item.fullName)}</Text>
                    </View>
                  )}
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

      {/* ─── Single Modal (detail / edit / add) ─── */}
      <Modal
        visible={modalMode !== null}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalMode(modalMode === "edit" ? "detail" : null)}
      >
        {/* ── Detail View ── */}
        {(modalMode === "detail") && (
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: "93%" }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Staff Profile</Text>
              <TouchableOpacity onPress={() => setModalMode(null)}>
                <Ionicons name="close" size={22} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator size="large" color="#0B3D2E" style={{ paddingVertical: 50 }} />
            ) : detail ? (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* Avatar + Name + Actions */}
                <View style={s.profileRow}>
                  {detail.staff?.profilePhoto ? (
                    <Image source={{ uri: detail.staff.profilePhoto }} style={s.bigAvatarImg} />
                  ) : (
                    <View style={s.bigAvatar}>
                      <Text style={s.bigAvatarTxt}>{getInitials(detail.staff?.fullName)}</Text>
                    </View>
                  )}
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
                <View style={s.statsGrid}>
                  <StatBox icon="paw-outline"     label="Total Visits"   value={detail.stats?.totalVisits ?? 0}           color="#0B3D2E" />
                  <StatBox icon="home-outline"    label="Boardings"      value={detail.stats?.totalBoardings ?? 0}        color="#1A5C3A" />
                  <StatBox icon="cash-outline"    label="Revenue"        value={`₹${detail.stats?.totalRevenue ?? 0}`}   color="#2D6A4F" />
                  <StatBox icon="heart-outline"   label="Pets Added"     value={detail.stats?.totalPets ?? 0}             color="#3E7B27" />
                  <StatBox icon="calendar-outline" label="Bookings"      value={detail.stats?.totalAppointments ?? 0}     color="#1A5C3A" />
                  <StatBox icon="medical-outline" label="Prescriptions"  value={detail.stats?.totalPrescriptions ?? 0}    color="#0B3D2E" />
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
                        { key: "visits",       label: "Visits",       icon: "paw",      count: detail.recentVisits?.length },
                        { key: "boardings",    label: "Boarding",     icon: "home",     count: detail.boardings?.length },
                        { key: "appointments", label: "Bookings",     icon: "calendar", count: detail.appointments?.length },
                        { key: "pets",         label: "Pet Master",   icon: "heart",    count: detail.recentPets?.length },
                        { key: "inventory",    label: "Inventory",    icon: "cube",     count: detail.inventoryItems?.length },
                        { key: "prescriptions",label: "Prescriptions",icon: "medical",  count: detail.prescriptions?.length },
                        { key: "revenue",      label: "Revenue",      icon: "cash",     count: 0 },
                      ].map(tab => (
                        <TouchableOpacity
                          key={tab.key}
                          style={[s.tab, historyTab === tab.key && s.tabActive]}
                          onPress={() => {
                            setHistoryTab(tab.key);
                            if (tab.key === "revenue" && !revenueData) {
                              fetchRevenue(detail.staff._id);
                            }
                          }}
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

                  {/* Boardings Tab */}
                  {historyTab === "boardings" && (
                    detail.boardings?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="home-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No boardings recorded</Text>
                      </View>
                    ) : (
                      detail.boardings.map((b, i) => (
                        <View key={b._id || i} style={[s.historyItem, i === detail.boardings.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={[s.historyIconBox, { backgroundColor: "#E8F5E8" }]}>
                            <Ionicons name="home" size={18} color="#0B3D2E" />
                          </View>
                          <View style={s.historyContent}>
                            <View style={s.historyTop}>
                              <Text style={s.historyLabel}>{b.petId?.name || "Unknown Pet"}</Text>
                              <Text style={s.historyTime}>{fmtDateTime(b.createdAt)}</Text>
                            </View>
                            <Text style={s.historySub}>
                              {b.boardingType?.purpose || "Boarding"}{b.petId?.owner?.name ? `  •  ${b.petId.owner.name}` : ""}
                            </Text>
                            <Text style={s.historySub}>
                              {b.numberOfDays ? `${b.numberOfDays} day(s)` : ""}{b.isBoarded ? "  •  Currently Boarded" : "  •  Deboarded"}
                            </Text>
                          </View>
                        </View>
                      ))
                    )
                  )}

                  {/* Prescriptions Tab */}
                  {historyTab === "prescriptions" && (
                    detail.prescriptions?.length === 0 ? (
                      <View style={s.noData}>
                        <Ionicons name="medical-outline" size={32} color="#A8D96C" />
                        <Text style={s.noDataTxt}>No prescriptions added</Text>
                      </View>
                    ) : (
                      detail.prescriptions.map((p, i) => (
                        <View key={p._id || i} style={[s.historyItem, i === detail.prescriptions.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={[s.historyIconBox, { backgroundColor: "#F0FFF4" }]}>
                            <Ionicons name="medical" size={18} color="#3E7B27" />
                          </View>
                          <View style={s.historyContent}>
                            <View style={s.historyTop}>
                              <Text style={s.historyLabel}>{p.petId?.name || "Unknown Pet"}</Text>
                              <Text style={s.historyTime}>{fmtDateTime(p.createdAt)}</Text>
                            </View>
                            <Text style={s.historySub}>{p.diagnosis || "No diagnosis"}</Text>
                            {p.price != null && <Text style={s.historyAmount}>₹{p.price}</Text>}
                          </View>
                        </View>
                      ))
                    )
                  )}

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
                        <Text style={s.noDataTxt}>No bookings accepted yet</Text>
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
                              {pet.species || ""}{pet.breed ? `  \u2022  ${pet.breed}` : ""}{pet.owner?.name ? `  \u2022  ${pet.owner.name}` : ""}
                            </Text>
                          </View>
                        </View>
                      ))
                    )
                  )}

                  {/* Revenue Tab */}
                  {historyTab === "revenue" && (
                    <View style={{ padding: 14 }}>
                      {/* Date Picker */}
                      <View style={s.revDateRow}>
                        <TouchableOpacity
                          style={s.revDatePickerBtn}
                          onPress={() => setShowRevCal(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="calendar-outline" size={16} color="#0B3D2E" />
                          <Text style={s.revDatePickerTxt}>
                            {revenueDate
                              ? revenueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : "Select Date (optional)"}
                          </Text>
                          {revenueDate && (
                            <TouchableOpacity
                              onPress={() => { setRevenueDate(null); fetchRevenue(detail.staff._id, null); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="close-circle" size={16} color="#C62828" />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s.revFetchBtn}
                          onPress={() => fetchRevenue(detail.staff._id, revenueDate)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="search" size={15} color="#fff" />
                          <Text style={s.revFetchBtnTxt}>Load</Text>
                        </TouchableOpacity>
                      </View>

                      <CalendarModal
                        visible={showRevCal}
                        selectedDate={revenueDate}
                        onSelect={(d) => {
                          setRevenueDate(d);
                          if (d) fetchRevenue(detail.staff._id, d);
                          else fetchRevenue(detail.staff._id, null);
                        }}
                        onClose={() => setShowRevCal(false)}
                      />

                      {revenueLoading ? (
                        <ActivityIndicator color="#0B3D2E" style={{ marginVertical: 20 }} />
                      ) : revenueData ? (
                        <>
                          <View style={s.revSummaryRow}>
                            {[
                              { label: "Total", val: revenueData.totalRevenue, bg: "#0B3D2E" },
                              { label: "Visits", val: revenueData.visitRevenue, bg: "#1A5C3A" },
                              { label: "Bookings", val: revenueData.apptRevenue, bg: "#3E7B27" },
                            ].map(c => (
                              <View key={c.label} style={[s.revCard, { backgroundColor: c.bg }]}>
                                <Text style={s.revCardLabel}>{c.label}</Text>
                                <Text style={s.revCardVal}>{"\u20b9"}{c.val}</Text>
                              </View>
                            ))}
                          </View>

                          {revenueData.visits?.length > 0 && (
                            <>
                              <Text style={[s.secTitle, { marginTop: 10 }]}>Visits ({revenueData.visits.length})</Text>
                              {revenueData.visits.map((v, i) => (
                                <View key={v._id || i} style={s.revItem}>
                                  <Text style={{ fontSize: 18, marginRight: 8 }}>{v.visitType?.emoji || "\ud83d\udc3e"}</Text>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.revItemLabel}>{v.visitType?.purpose || "Visit"}</Text>
                                    <Text style={s.revItemSub}>{v.pet?.name || ""}{v.pet?.owner?.name ? " \u2022 " + v.pet.owner.name : ""}</Text>
                                    <Text style={s.revItemDate}>{fmtDateTime(v.createdAt)}</Text>
                                  </View>
                                  <Text style={s.revItemAmt}>{"\u20b9"}{v.details?.finalPrice || 0}</Text>
                                </View>
                              ))}
                            </>
                          )}

                          {revenueData.appointments?.length > 0 && (
                            <>
                              <Text style={[s.secTitle, { marginTop: 10 }]}>Bookings ({revenueData.appointments.length})</Text>
                              {revenueData.appointments.map((a, i) => (
                                <View key={a._id || i} style={s.revItem}>
                                  <View style={[s.historyIconBox, { backgroundColor: "#E8F5E8", marginRight: 8 }]}>
                                    <Ionicons name="calendar" size={16} color="#0B3D2E" />
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.revItemLabel}>{a.serviceName || "Booking"}</Text>
                                    <Text style={s.revItemSub}>{a.petName || ""}{a.customerId?.fullName ? " \u2022 " + a.customerId.fullName : ""}</Text>
                                    <Text style={s.revItemDate}>{fmtDateTime(a.createdAt)}</Text>
                                  </View>
                                  <Text style={s.revItemAmt}>{"\u20b9"}{a.totalAmount || 0}</Text>
                                </View>
                              ))}
                            </>
                          )}

                          {revenueData.visits?.length === 0 && revenueData.appointments?.length === 0 && (
                            <View style={s.noData}>
                              <Ionicons name="cash-outline" size={32} color="#A8D96C" />
                              <Text style={s.noDataTxt}>No revenue{revenueDate ? " on this date" : ""}</Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={s.noData}>
                          <Ionicons name="cash-outline" size={32} color="#A8D96C" />
                          <Text style={s.noDataTxt}>Tap Filter to load revenue</Text>
                        </View>
                      )}
                    </View>
                  )}

                </View>

                <View style={{ height: 24 }} />
              </ScrollView>
            ) : null}
          </View>
        </View>
        )}

        {/* ── Add / Edit Form ── */}
        {(modalMode === "edit" || modalMode === "add") && (
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{editingId ? "Edit Staff" : "Add Staff Member"}</Text>
              <TouchableOpacity onPress={() => setModalMode(editingId ? "detail" : null)}>
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

            <View style={s.formGroup}>
              <Text style={s.label}>{editingId ? "Reset Password" : "Password *"}</Text>
              <View style={s.inputRow}>
                <Ionicons name="lock-closed-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                <TextInput style={s.input}
                  placeholder={editingId ? "Leave blank to keep current" : "Min 6 characters"}
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  value={form.password} onChangeText={(v) => setForm(p => ({ ...p, password: v }))} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

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
        )}
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

function StatBox({ icon, label, value, color }) {
  return (
    <View style={[s.statBox, { backgroundColor: color || "#0B3D2E" }]}>
      <Ionicons name={icon} size={20} color="#A8D96C" />
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
    flexDirection: "row", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
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
  avatarImg: {
    width: 48, height: 48, borderRadius: 24,
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
  bigAvatarImg: {
    width: 68, height: 68, borderRadius: 34,
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

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statBox: {
    width: "30.5%", borderRadius: 14,
    padding: 12, alignItems: "center", gap: 4,
  },
  statVal: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#A8D96C", textAlign: "center" },

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

  // Revenue tab
  revDateRow: { flexDirection: "row", gap: 8, marginBottom: 12, alignItems: "center" },
  revDatePickerBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 40,
  },
  revDatePickerTxt: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  revFetchBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#0B3D2E", borderRadius: 10,
    paddingHorizontal: 12, height: 40,
  },
  revFetchBtnTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  revSummaryRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  revCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  revCardLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 3 },
  revCardVal: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  revItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  revItemLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  revItemSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 1 },
  revItemDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#aaa", marginTop: 1 },
  revItemAmt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginLeft: 8 },
});
