import { useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, FlatList, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import CalendarModal from "../CalendarModal";

const toISO = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmtDisplay = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

const TABS = ["Reminders", "Attendance"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];


/**
 * Shared by /staff/reminders and /admin/reminders, which were functionally
 * identical — the copies differed only in header spacing and an icon size.
 */
export default function RemindersScreen({ closeIconSize = 22, headerGap = false }) {
  const router = useRouter();
  const [tab, setTab] = useState("Reminders");
  const [date, setDate] = useState(new Date());
  const [reminderList, setReminderList] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [presentMap, setPresentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const tabRef = useRef(tab);
  const dateRef = useRef(date);
  const tokenRef = useRef(token);
  tabRef.current = tab;
  dateRef.current = date;
  tokenRef.current = token;

  const load = useCallback(async (d, t) => {
    const targetDate = d ?? dateRef.current;
    const currentTab = t ?? tabRef.current;
    setLoading(true);
    try {
      const { token: tk } = await getAuth();
      setToken(tk || "");
      tokenRef.current = tk || "";
      const iso = toISO(targetDate);

      if (currentTab === "Reminders") {
        const res = await fetch(`${BASE_URL}/api/v1/reminders/getreminderslist/${iso}`, {
          headers: { Authorization: tk || "" },
        });
        const json = await res.json();
        setReminderList(json.List || json.list || []);
      } else {
        const res = await fetch(`${BASE_URL}/api/v1/attendance/getattendancelist/${iso}`, {
          headers: { Authorization: tk || "" },
        });
        const json = await res.json();
        const items = json.List || [];
        setAttendanceList(items);
        const map = {};
        items.forEach((i) => { map[i._id] = i.present ?? false; });
        setPresentMap(map);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(date, tab); }, [tab, date]));

  const changeDate = (n) => {
    const nd = addDays(dateRef.current, n);
    setDate(nd);
    load(nd, tabRef.current);
  };

  const handleTabChange = (t) => {
    setTab(t);
    setReminderList([]);
    setAttendanceList([]);
    setPresentMap({});
  };

  const handleRemindAll = async () => {
    const iso = toISO(dateRef.current);
    Alert.alert("Send Reminders", "Send reminders to all pets scheduled for this date?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send", onPress: async () => {
          setSending(true);
          try {
            const res = await fetch(`${BASE_URL}/api/v1/reminders/sendreminders/${iso}`, {
              headers: { Authorization: tokenRef.current },
            });
            const json = await res.json();
            Alert.alert(json.success ? "✅ Sent" : "Error", json.message || "Reminders sent!");
          } catch { Alert.alert("Error", "Network error"); }
          finally { setSending(false); }
        },
      },
    ]);
  };

  const handleRemindAbsentees = async () => {
    const iso = toISO(dateRef.current);
    Alert.alert("Remind Absentees", "Send reminders to all absent pets?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send", onPress: async () => {
          setSending(true);
          try {
            const res = await fetch(`${BASE_URL}/api/v1/reminders/sendoverduereminders`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: tokenRef.current },
              body: JSON.stringify({ date: iso }),
            });
            const json = await res.json();
            Alert.alert(json.success ? "✅ Sent" : "Error", json.message || "Reminders sent to absentees!");
          } catch { Alert.alert("Error", "Network error"); }
          finally { setSending(false); }
        },
      },
    ]);
  };

  const togglePresent = (id) => {
    setPresentMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      const presentIds = attendanceList.filter((i) => presentMap[i._id]).map((i) => i._id);
      const absentIds  = attendanceList.filter((i) => !presentMap[i._id]).map((i) => i._id);
      const res = await fetch(`${BASE_URL}/api/v1/attendance/updateattendancelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tokenRef.current },
        body: JSON.stringify({ date: toISO(dateRef.current), presentIds, absentIds }),
      });
      const json = await res.json();
      if (json.success) Alert.alert("✅ Saved", "Attendance updated successfully.");
      else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const isToday = toISO(date) === toISO(new Date());
  const presentCount = attendanceList.filter((i) => presentMap[i._id]).length;

  return (
    <View style={s.container}>
      <View style={[s.header, headerGap && s.headerGapStyle]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={closeIconSize} color="#fff" />
        </TouchableOpacity>
        <Text style={[s.headerTitle, headerGap && s.headerTitleLeft]}>Reminders</Text>
        <TouchableOpacity style={s.calIconBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={22} color="#A8D96C" />
          {!isToday && <View style={s.calDot} />}
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t} style={[s.tab, tab === t && s.tabActive]}
            onPress={() => handleTabChange(t)} activeOpacity={0.8}
          >
            <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <CalendarModal
        visible={showPicker}
        selectedDate={date}
        onSelect={(d) => { setDate(d); load(d, tabRef.current); }}
        onClose={() => setShowPicker(false)}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(dateRef.current, tabRef.current); }} tintColor="#0B3D2E" />}
        >
          {tab === "Reminders" && (
            <>
              {reminderList.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons name="notifications-off-outline" size={52} color="#A8D96C" />
                  <Text style={s.emptyTitle}>No Reminders</Text>
                  <Text style={s.emptySubtitle}>No reminders scheduled for {fmtDisplay(date)}</Text>
                </View>
              ) : (
                <>
                  <View style={s.countCard}>
                    <Ionicons name="notifications" size={24} color="#A8D96C" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={s.countVal}>{reminderList.length}</Text>
                      <Text style={s.countLabel}>Scheduled Reminders</Text>
                    </View>
                  </View>

                  {reminderList.map((item, i) => (
                    <View key={item._id || i} style={s.card}>
                      <View style={s.cardHeader}>
                        <View style={s.petAvatar}>
                          <Text style={s.petAvatarTxt}>
                            {item.petName ? item.petName.slice(0, 2).toUpperCase() : "🐾"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.petName}>{item.petName || "—"}</Text>
                          <Text style={s.purposeTxt}>{item.purpose || "—"}</Text>
                        </View>
                        <View style={s.dateBadge}>
                          <Text style={s.dateBadgeTxt}>
                            {item.scheduledDate ? item.scheduledDate.substring(0, 10) : "—"}
                          </Text>
                        </View>
                      </View>
                      <View style={s.divider} />
                      <View style={s.infoRow}>
                        <Ionicons name="person-outline" size={13} color="#666" />
                        <Text style={s.infoTxt}>{item.ownerName || "—"}</Text>
                        {item.contact && (
                          <>
                            <Text style={s.dot}>•</Text>
                            <Ionicons name="call-outline" size={13} color="#666" />
                            <Text style={s.infoTxt}>{item.contact}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={s.remindBtn} onPress={handleRemindAll} disabled={sending} activeOpacity={0.85}>
                    {sending ? <ActivityIndicator color="#A8D96C" /> : (
                      <>
                        <Ionicons name="notifications-outline" size={20} color="#A8D96C" />
                        <Text style={s.remindBtnTxt}>Remind All</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {tab === "Attendance" && (
            <>
              {attendanceList.length > 0 && (
                <View style={s.summaryRow}>
                  <View style={[s.summaryBox, { borderColor: "#3E7B27" }]}>
                    <Ionicons name="checkmark-circle" size={16} color="#3E7B27" />
                    <Text style={[s.summaryVal, { color: "#3E7B27" }]}>{presentCount}</Text>
                    <Text style={s.summaryLabel}>Present</Text>
                  </View>
                  <View style={[s.summaryBox, { borderColor: "#C62828" }]}>
                    <Ionicons name="close-circle" size={16} color="#C62828" />
                    <Text style={[s.summaryVal, { color: "#C62828" }]}>{attendanceList.length - presentCount}</Text>
                    <Text style={s.summaryLabel}>Absent</Text>
                  </View>
                  <View style={[s.summaryBox, { borderColor: "#0B3D2E" }]}>
                    <Ionicons name="people" size={16} color="#0B3D2E" />
                    <Text style={[s.summaryVal, { color: "#0B3D2E" }]}>{attendanceList.length}</Text>
                    <Text style={s.summaryLabel}>Total</Text>
                  </View>
                </View>
              )}

              {attendanceList.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons name="calendar-outline" size={52} color="#A8D96C" />
                  <Text style={s.emptyTitle}>No Scheduled Visits</Text>
                  <Text style={s.emptySubtitle}>No pets scheduled for {fmtDisplay(date)}</Text>
                </View>
              ) : (
                <>
                  {attendanceList.map((item) => {
                    const pet = item.petId;
                    const isPresent = presentMap[item._id] ?? false;
                    return (
                      <View key={item._id} style={[s.card, isPresent && s.cardPresent]}>
                        <View style={s.cardRow}>
                          <View style={[s.petAvatar, isPresent && { backgroundColor: "#3E7B27" }]}>
                            <Text style={s.petAvatarTxt}>
                              {pet?.name ? pet.name.slice(0, 2).toUpperCase() : "🐾"}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.petName}>{pet?.name || "Unknown"}</Text>
                            <Text style={s.purposeTxt}>{item.purpose || "—"}</Text>
                            {pet?.owner?.name && (
                              <View style={s.infoRow}>
                                <Ionicons name="person-outline" size={11} color="#999" />
                                <Text style={s.infoTxt}>{pet.owner.name}</Text>
                                {pet.owner.phone && (
                                  <>
                                    <Text style={s.dot}>•</Text>
                                    <Text style={s.infoTxt}>{pet.owner.phone}</Text>
                                  </>
                                )}
                              </View>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[s.toggleBtn, isPresent ? s.togglePresent : s.toggleAbsent]}
                            onPress={() => togglePresent(item._id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={isPresent ? "checkmark-circle" : "close-circle"}
                              size={16} color={isPresent ? "#3E7B27" : "#C62828"}
                            />
                            <Text style={[s.toggleTxt, { color: isPresent ? "#3E7B27" : "#C62828" }]}>
                              {isPresent ? "Present" : "Absent"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  <TouchableOpacity style={s.saveBtn} onPress={handleSaveAttendance} disabled={saving} activeOpacity={0.85}>
                    {saving ? <ActivityIndicator color="#A8D96C" /> : (
                      <>
                        <Ionicons name="checkmark-done-outline" size={20} color="#A8D96C" />
                        <Text style={s.saveBtnTxt}>Save Attendance</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={s.remindAbsentBtn} onPress={handleRemindAbsentees} disabled={sending} activeOpacity={0.85}>
                    {sending ? <ActivityIndicator color="#C62828" /> : (
                      <>
                        <Ionicons name="notifications-outline" size={20} color="#C62828" />
                        <Text style={s.remindAbsentTxt}>Remind Absentees</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
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
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  headerTitleLeft: { textAlign: "left" },
  headerGapStyle: { gap: 10 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  calIconBtn: { position: "relative", padding: 8, backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 12 },
  calDot: { position: "absolute", top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#0B3D2E" },

  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#0B3D2E" },
  tabTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  tabTxtActive: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  scroll: { padding: 16, paddingBottom: 40 },

  countCard: { backgroundColor: "#0B3D2E", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 16, elevation: 3 },
  countVal: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#fff" },
  countLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderRadius: 10, padding: 10, borderWidth: 1, elevation: 1 },
  summaryVal: { fontSize: 16, fontFamily: "Poppins_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4" },
  cardPresent: { borderColor: "#3E7B27", backgroundColor: "#F6FFF0" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  petAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center" },
  petAvatarTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  purposeTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", marginBottom: 3 },
  dateBadge: { backgroundColor: "#E8F5E8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dateBadgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginVertical: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  dot: { fontSize: 11, color: "#ccc" },

  toggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  togglePresent: { backgroundColor: "#E8F5E8", borderColor: "#3E7B27" },
  toggleAbsent: { backgroundColor: "#FFF0F0", borderColor: "#FFCDD2" },
  toggleTxt: { fontSize: 11, fontFamily: "Poppins_700Bold" },

  remindBtn: { backgroundColor: "#0B3D2E", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  remindBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  saveBtn: { backgroundColor: "#0B3D2E", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, marginBottom: 10 },
  saveBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  remindAbsentBtn: { backgroundColor: "#fff", borderRadius: 14, height: 52, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderColor: "#FFCDD2" },
  remindAbsentTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#C62828" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center" },
});
