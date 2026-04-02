import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const toISO = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const fmtDisplay = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function StaffServicesDone() {
  const [date, setDate] = useState(new Date());
  const [list, setList] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");

  const loadVisitTypes = async (t) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) setVisitTypes(json.visitTypes || []);
    } catch (e) { console.log(e); }
  };

  const load = useCallback(async (d = date) => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      await loadVisitTypes(t);
      const iso = toISO(d);
      const res = await fetch(`${BASE_URL}/api/v1/visit/getvisitlist?date=${iso}`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      setList(json.List || []);
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

  const filtered = list.filter((v) => {
    const matchType = selectedType === "All" || v.visitType?.purpose === selectedType;
    const matchSearch = !search.trim() ||
      v.pet?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.pet?.owner?.name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalRevenue = filtered.reduce((sum, v) => sum + (v.details?.price || 0), 0);
  const isToday = toISO(date) === toISO(new Date());

  const typeFilters = ["All", ...visitTypes.map((vt) => vt.purpose)];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Services Done</Text>
        <Text style={s.headerSub}>{list.length} visits</Text>
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

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by pet or owner name..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={s.filterBar} contentContainerStyle={s.filterContent}
      >
        {typeFilters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, selectedType === f && s.filterChipActive]}
            onPress={() => setSelectedType(f)}
          >
            <Text style={[s.filterText, selectedType === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor="#0B3D2E" />}
        >
          {/* Summary Cards */}
          {filtered.length > 0 && (
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: "#0B3D2E20" }]}>
                  <Ionicons name="paw" size={20} color="#0B3D2E" />
                </View>
                <Text style={s.statVal}>{filtered.length}</Text>
                <Text style={s.statLabel}>Services</Text>
              </View>
              <View style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: "#3E7B2720" }]}>
                  <Ionicons name="cash" size={20} color="#3E7B27" />
                </View>
                <Text style={[s.statVal, { color: "#3E7B27" }]}>₹{totalRevenue}</Text>
                <Text style={s.statLabel}>Revenue</Text>
              </View>
              <View style={s.statCard}>
                <View style={[s.statIcon, { backgroundColor: "#F59E0B20" }]}>
                  <Ionicons name="ribbon" size={20} color="#F59E0B" />
                </View>
                <Text style={[s.statVal, { color: "#F59E0B" }]}>
                  {new Set(filtered.map((v) => v.visitType?.purpose)).size}
                </Text>
                <Text style={s.statLabel}>Types</Text>
              </View>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="construct-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Services Found</Text>
              <Text style={s.emptySubtitle}>
                {list.length === 0
                  ? `No visits recorded for ${fmtDisplay(date)}`
                  : "No visits match your filter"}
              </Text>
            </View>
          ) : (
            filtered.map((v, i) => (
              <View key={v._id || i} style={s.card}>
                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View style={s.typeBadge}>
                    <Text style={s.typeEmoji}>{v.visitType?.emoji || "🐾"}</Text>
                    <Text style={s.typeName}>{v.visitType?.purpose || "Visit"}</Text>
                  </View>
                  {v.details?.price != null && (
                    <Text style={s.price}>₹{v.details.price}</Text>
                  )}
                </View>

                <View style={s.divider} />

                {/* Pet & Owner */}
                <View style={s.petRow}>
                  <View style={s.petAvatar}>
                    <Text style={s.petAvatarTxt}>
                      {v.pet?.name ? v.pet.name.slice(0, 2).toUpperCase() : "🐾"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.petName}>{v.pet?.name || "Unknown Pet"}</Text>
                    {v.pet?.owner?.name && (
                      <View style={s.ownerRow}>
                        <Ionicons name="person-outline" size={11} color="#999" />
                        <Text style={s.ownerTxt}>{v.pet.owner.name}</Text>
                        {v.pet.owner.phone && (
                          <>
                            <Text style={s.dot}>•</Text>
                            <Ionicons name="call-outline" size={11} color="#999" />
                            <Text style={s.ownerTxt}>{v.pet.owner.phone}</Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={s.timeBox}>
                    <Ionicons name="time-outline" size={12} color="#999" />
                    <Text style={s.timeTxt}>{fmtTime(v.createdAt)}</Text>
                  </View>
                </View>

                {/* Extra details */}
                {(v.details?.note || v.details?.customerType) && (
                  <View style={s.detailsBox}>
                    {v.details.customerType && (
                      <View style={s.detailChip}>
                        <Ionicons name="person-circle-outline" size={12} color="#3E7B27" />
                        <Text style={s.detailChipTxt}>{v.details.customerType}</Text>
                      </View>
                    )}
                    {v.details.note && (
                      <Text style={s.noteText} numberOfLines={2}>{v.details.note}</Text>
                    )}
                  </View>
                )}

                <Text style={s.visitId}>ID: {(v._id || "").slice(-8).toUpperCase()}</Text>
              </View>
            ))
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
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
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

  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  filterBar: { backgroundColor: "#fff", maxHeight: 54, borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4" },
  filterChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  filterTextActive: { color: "#fff", fontFamily: "Poppins_700Bold" },

  scroll: { padding: 16, paddingBottom: 40 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12,
    alignItems: "center", elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  statVal: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  typeBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  typeEmoji: { fontSize: 14 },
  typeName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  price: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },

  petRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  petAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  petAvatarTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 3 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ownerTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  dot: { fontSize: 11, color: "#ccc" },
  timeBox: { flexDirection: "row", alignItems: "center", gap: 3 },
  timeTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

  detailsBox: { marginTop: 10, gap: 6 },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  detailChipTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  noteText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", fontStyle: "italic" },

  visitId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right", marginTop: 8 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center" },
});
