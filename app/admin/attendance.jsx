import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const toISO = (d) => d.toISOString().split("T")[0];

const addDays = (d, n) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const fmtDisplay = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

export default function StaffAttendance() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState("");
  // local present state: { [id]: true/false }
  const [presentMap, setPresentMap] = useState({});

  const load = useCallback(async (d = date) => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const iso = toISO(d);
      const res = await fetch(`${BASE_URL}/api/v1/attendance/getattendancelist/${iso}`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      const items = json.List || [];
      setList(items);
      // seed presentMap from server data
      const map = {};
      items.forEach((item) => { map[item._id] = item.present ?? false; });
      setPresentMap(map);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [date]);

  useFocusEffect(useCallback(() => { setLoading(true); load(date); }, [date]));

  const changeDate = (n) => {
    const nd = addDays(date, n);
    setDate(nd);
    setLoading(true);
    load(nd);
  };

  const toggle = (id) => {
    setPresentMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const presentIds = list.filter((i) => presentMap[i._id]).map((i) => i._id);
      const absentIds  = list.filter((i) => !presentMap[i._id]).map((i) => i._id);
      const res = await fetch(`${BASE_URL}/api/v1/attendance/updateattendancelist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({ date: toISO(date), presentIds, absentIds }),
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("✅ Saved", "Attendance updated successfully.");
        load(date);
      } else Alert.alert("Error", json.message);
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  const presentCount = list.filter((i) => presentMap[i._id]).length;
  const absentCount  = list.length - presentCount;
  const isToday = toISO(date) === toISO(new Date());

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Attendance</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Date Navigator */}
      <View style={s.dateNav}>
        <TouchableOpacity style={s.navBtn} onPress={() => changeDate(-1)} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
        </TouchableOpacity>
        <View style={s.dateCenter}>
          <Text style={s.dateText}>{fmtDisplay(date)}</Text>
          {isToday && <View style={s.todayBadge}><Text style={s.todayTxt}>Today</Text></View>}
        </View>
        <TouchableOpacity style={s.navBtn} onPress={() => changeDate(1)} activeOpacity={0.8}>
          <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
        </TouchableOpacity>
      </View>

      {/* Summary Row */}
      {list.length > 0 && (
        <View style={s.summaryRow}>
          <View style={[s.summaryBox, { borderColor: "#3E7B27" }]}>
            <Ionicons name="checkmark-circle" size={18} color="#3E7B27" />
            <Text style={[s.summaryVal, { color: "#3E7B27" }]}>{presentCount}</Text>
            <Text style={s.summaryLabel}>Present</Text>
          </View>
          <View style={[s.summaryBox, { borderColor: "#C62828" }]}>
            <Ionicons name="close-circle" size={18} color="#C62828" />
            <Text style={[s.summaryVal, { color: "#C62828" }]}>{absentCount}</Text>
            <Text style={s.summaryLabel}>Absent</Text>
          </View>
          <View style={[s.summaryBox, { borderColor: "#0B3D2E" }]}>
            <Ionicons name="people" size={18} color="#0B3D2E" />
            <Text style={[s.summaryVal, { color: "#0B3D2E" }]}>{list.length}</Text>
            <Text style={s.summaryLabel}>Total</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor="#0B3D2E" />}
        >
          {list.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Scheduled Visits</Text>
              <Text style={s.emptySubtitle}>No pets are scheduled for {fmtDisplay(date)}</Text>
            </View>
          ) : (
            <>
              {list.map((item) => {
                const pet = item.petId;
                const isPresent = presentMap[item._id] ?? false;
                const initials = pet?.name
                  ? pet.name.slice(0, 2).toUpperCase()
                  : "🐾";
                return (
                  <View key={item._id} style={[s.card, isPresent && s.cardPresent]}>
                    <View style={s.cardLeft}>
                      <View style={[s.avatar, isPresent && s.avatarPresent]}>
                        <Text style={s.avatarTxt}>{initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.petName}>{pet?.name || "Unknown Pet"}</Text>
                        <Text style={s.purpose}>{item.purpose || "—"}</Text>
                        {pet?.owner?.name && (
                          <View style={s.ownerRow}>
                            <Ionicons name="person-outline" size={11} color="#999" />
                            <Text style={s.ownerTxt}>{pet.owner.name}</Text>
                            {pet.owner.phone && (
                              <>
                                <Text style={s.dot}>•</Text>
                                <Text style={s.ownerTxt}>{pet.owner.phone}</Text>
                              </>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Toggle */}
                    <TouchableOpacity
                      style={[s.toggleBtn, isPresent ? s.togglePresent : s.toggleAbsent]}
                      onPress={() => toggle(item._id)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPresent ? "checkmark-circle" : "close-circle"}
                        size={18}
                        color={isPresent ? "#3E7B27" : "#C62828"}
                      />
                      <Text style={[s.toggleTxt, { color: isPresent ? "#3E7B27" : "#C62828" }]}>
                        {isPresent ? "Present" : "Absent"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Save Button */}
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#A8D96C" /> : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={20} color="#A8D96C" />
                    <Text style={s.saveBtnTxt}>Save Attendance</Text>
                  </>
                )}
              </TouchableOpacity>
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
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", textAlign: "center" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  dateNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  dateCenter: { alignItems: "center", gap: 4 },
  dateText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  todayBadge: { backgroundColor: "#0B3D2E", paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  todayTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  summaryRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  summaryBox: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10,
    borderWidth: 1,
  },
  summaryVal: { fontSize: 16, fontFamily: "Poppins_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666" },

  scroll: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  cardPresent: { borderColor: "#3E7B27", backgroundColor: "#F6FFF0" },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },

  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  avatarPresent: { backgroundColor: "#3E7B27" },
  avatarTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  petName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  purpose: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", marginBottom: 3 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ownerTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  dot: { fontSize: 11, color: "#ccc" },

  toggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  togglePresent: { backgroundColor: "#E8F5E8", borderColor: "#3E7B27" },
  toggleAbsent: { backgroundColor: "#FFF0F0", borderColor: "#FFCDD2" },
  toggleTxt: { fontSize: 12, fontFamily: "Poppins_700Bold" },

  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 8,
  },
  saveBtnTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center" },
});
