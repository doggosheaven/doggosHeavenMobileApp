import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Modal, FlatList,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

// Pad to a full six-row grid so the calendar keeps one height all year — an
// unpadded month renders four, five or six rows and the dialog jumps about.
const padToSixWeeks = (cells) => {
  const out = [...cells];
  while (out.length < 42) out.push(null);
  return out;
};


const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const toISO = (d) => d.toISOString().split("T")[0];
const fmtDisplay = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

function CalendarModal({ visible, selectedDate, onSelect, onClose, token }) {
  const [calMonth, setCalMonth] = useState(selectedDate || new Date());
  const [activeDates, setActiveDates] = useState(new Set());
  const [loadingDots, setLoadingDots] = useState(false);

  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const isSameDay   = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const calDays = padToSixWeeks([...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]);

  
  const fetchActiveDates = useCallback(async (y, m) => {
    setLoadingDots(true);
    try {
      const newSet = new Set();
      const daysCount = new Date(y, m + 1, 0).getDate();
      const today = new Date();
      
      const promises = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(y, m, i + 1);
        if (d > today) return Promise.resolve(null);
        const iso = d.toISOString().split("T")[0];
        return fetch(`${BASE_URL}/api/v1/visit/getvisitlist?date=${iso}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token || "" },
        })
          .then(r => r.json())
          .then(j => ({ iso, count: (j.List || []).length }))
          .catch(() => null);
      });
      const results = await Promise.all(promises);
      results.forEach(r => { if (r && r.count > 0) newSet.add(r.iso); });
      setActiveDates(newSet);
    } catch (e) { console.log(e); }
    finally { setLoadingDots(false); }
  }, [token]);

  useEffect(() => {
    if (visible) fetchActiveDates(year, month);
  }, [visible, year, month]);

  const changeMonth = (newMonth) => {
    setCalMonth(newMonth);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cs.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cs.box}>
          <View style={cs.header}>
            <TouchableOpacity onPress={() => changeMonth(new Date(year, month - 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
            </TouchableOpacity>
            <Text style={cs.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity onPress={() => changeMonth(new Date(year, month + 1, 1))} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
          <View style={cs.dayRow}>
            {DAY_NAMES.map(d => <Text key={d} style={cs.dayName}>{d}</Text>)}
          </View>
          <FlatList
            data={calDays}
            numColumns={7}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            renderItem={({ item: day }) => {
              if (!day) return <View style={cs.dayEmpty} />;
              const thisDate   = new Date(year, month, day);
              const isSelected = selectedDate && isSameDay(thisDate, selectedDate);
              const isTodayDay = isSameDay(thisDate, new Date());
              const isFuture   = thisDate > new Date();
              const iso        = thisDate.toISOString().split("T")[0];
              const hasVisits  = activeDates.has(iso);
              return (
                <TouchableOpacity
                  style={[cs.day, isSelected && cs.daySelected, isTodayDay && !isSelected && cs.dayToday, isFuture && cs.dayFuture]}
                  onPress={() => { onSelect(thisDate); onClose(); }}
                  disabled={isFuture}
                  activeOpacity={0.7}
                >
                  <Text style={[cs.dayTxt, isSelected && cs.dayTxtSelected, isTodayDay && !isSelected && cs.dayTxtToday, isFuture && cs.dayTxtFuture]}>{day}</Text>
                  {hasVisits && !isSelected && (
                    <View style={cs.redDot} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
          {loadingDots && (
            <ActivityIndicator size="small" color="#C62828" style={{ marginVertical: 6 }} />
          )}
          <TouchableOpacity style={cs.todayBtn} onPress={() => { onSelect(new Date()); onClose(); }} activeOpacity={0.8}>
            <Text style={cs.todayBtnTxt}>Go to Today</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cs = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,0.45)", justifyContent:"center", alignItems:"center" },
  box: { backgroundColor:"#fff", borderRadius:20, padding:20, width:"88%", elevation:10 },
  header: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  monthTxt: { fontSize:16, fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  dayRow: { flexDirection:"row", marginBottom:6 },
  dayName: { flex:1, textAlign:"center", fontSize:11, fontFamily:"Poppins_700Bold", color:"#3E7B27" },
  day: { flex:1, aspectRatio:1, justifyContent:"center", alignItems:"center", borderRadius:8, margin:1 },
  dayEmpty: { flex:1, aspectRatio:1, margin:1 },
  daySelected: { backgroundColor:"#0B3D2E" },
  dayToday: { backgroundColor:"#E8F5E8", borderWidth:1.5, borderColor:"#3E7B27" },
  dayFuture: { opacity:0.3 },
  dayTxt: { fontSize:13, fontFamily:"Inter_400Regular", color:"#1A1A1A" },
  dayTxtSelected: { fontFamily:"Poppins_700Bold", color:"#A8D96C" },
  dayTxtToday: { fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  dayTxtFuture: { color:"#ccc" },
  redDot: {
    position: "absolute", bottom: 3, width: 5, height: 5,
    borderRadius: 3, backgroundColor: "#C62828",
  },
  todayBtn: { backgroundColor:"#0B3D2E", borderRadius:12, paddingVertical:12, alignItems:"center", marginTop:14 },
  todayBtnTxt: { fontSize:14, fontFamily:"Poppins_700Bold", color:"#A8D96C" },
});

// Filter Bottom Sheet Modal
function FilterModal({ visible, onClose, visitTypes, selectedType, setSelectedType, date, onDateChange, list, token }) {
  const isToday = toISO(date) === toISO(new Date());
  const [showCal, setShowCal] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={fm.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={fm.sheet}>
          <View style={fm.handle} />
          <Text style={fm.title}>Filter</Text>

          {/* Date picker row */}
          <Text style={fm.sectionLabel}>Date</Text>
          <View style={fm.dateRow}>
            <TouchableOpacity style={fm.navBtn} onPress={() => onDateChange(new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1))} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={18} color="#0B3D2E" />
            </TouchableOpacity>
            <TouchableOpacity style={fm.dateBtn} onPress={() => setShowCal(true)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={16} color="#0B3D2E" />
              <Text style={fm.dateBtnTxt}>{isToday ? "Today" : fmtDisplay(date)}</Text>
              {!isToday && (
                <TouchableOpacity onPress={() => onDateChange(new Date())} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                  <Ionicons name="close-circle" size={16} color="#C62828" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={fm.navBtn} onPress={() => onDateChange(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1))} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={18} color="#0B3D2E" />
            </TouchableOpacity>
          </View>

          <CalendarModal
            visible={showCal}
            selectedDate={date}
            onSelect={(d) => { onDateChange(d); setShowCal(false); }}
            onClose={() => setShowCal(false)}
            token={token}
          />

          {/* Service type filter */}
          <Text style={fm.sectionLabel}>Service Type</Text>
          <View style={fm.typeGrid}>
            {[{ _id: "all", purpose: "All", emoji: "🗂️" }, ...visitTypes].map((vt) => {
              const count = vt._id === "all" ? list.length : list.filter(v => v.visitType?.purpose === vt.purpose).length;
              const active = selectedType === vt.purpose || (vt._id === "all" && selectedType === "All");
              return (
                <TouchableOpacity
                  key={vt._id}
                  style={[fm.typeChip, active && fm.typeChipActive]}
                  onPress={() => { setSelectedType(vt._id === "all" ? "All" : vt.purpose); onClose(); }}
                  activeOpacity={0.8}
                >
                  <Text style={fm.typeEmoji}>{vt.emoji || "🐾"}</Text>
                  <Text style={[fm.typeText, active && fm.typeTextActive]}>{vt.purpose}</Text>
                  {count > 0 && (
                    <View style={[fm.typeBadge, active && fm.typeBadgeActive]}>
                      <Text style={[fm.typeBadgeTxt, active && fm.typeBadgeTxtActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={fm.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={fm.doneBtnTxt}>Done</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const fm = StyleSheet.create({
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,0.45)", justifyContent:"flex-end" },
  sheet: { backgroundColor:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, paddingBottom:36 },
  handle: { width:40, height:4, borderRadius:2, backgroundColor:"#D4EDD4", alignSelf:"center", marginBottom:16 },
  title: { fontSize:18, fontFamily:"Poppins_700Bold", color:"#0B3D2E", marginBottom:16 },
  sectionLabel: { fontSize:12, fontFamily:"Poppins_700Bold", color:"#888", marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 },
  dateRow: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:20 },
  navBtn: { width:34, height:34, borderRadius:10, backgroundColor:"#E8F5E8", justifyContent:"center", alignItems:"center" },
  dateBtn: { flex:1, flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#F0F7F0", borderRadius:12, paddingHorizontal:14, paddingVertical:10, borderWidth:1, borderColor:"#D4EDD4" },
  dateBtnTxt: { flex:1, fontSize:13, fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  typeGrid: { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:20 },
  typeChip: { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:8, borderRadius:20, backgroundColor:"#F0F7F0", borderWidth:1, borderColor:"#D4EDD4" },
  typeChipActive: { backgroundColor:"#0B3D2E", borderColor:"#0B3D2E" },
  typeEmoji: { fontSize:14 },
  typeText: { fontSize:12, fontFamily:"Inter_400Regular", color:"#3E7B27" },
  typeTextActive: { color:"#fff", fontFamily:"Poppins_700Bold" },
  typeBadge: { backgroundColor:"#D4EDD4", borderRadius:10, paddingHorizontal:6, paddingVertical:1, minWidth:18, alignItems:"center" },
  typeBadgeActive: { backgroundColor:"rgba(168,217,108,0.3)" },
  typeBadgeTxt: { fontSize:10, fontFamily:"Poppins_700Bold", color:"#0B3D2E" },
  typeBadgeTxtActive: { color:"#A8D96C" },
  doneBtn: { backgroundColor:"#0B3D2E", borderRadius:14, paddingVertical:14, alignItems:"center" },
  doneBtnTxt: { fontSize:15, fontFamily:"Poppins_700Bold", color:"#A8D96C" },
});

export default function StaffServicesDone() {
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [list, setList] = useState([]);
  const [visitTypes, setVisitTypes] = useState([]);
  const [selectedType, setSelectedType] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async (d = date) => {
    try {
      const { token: t } = await getAuth();
      setToken(t || "");
      const [vtRes, listRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, { headers: { Authorization: t || "" } }),
        fetch(`${BASE_URL}/api/v1/visit/getvisitlist?date=${toISO(d)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: t || "" },
        }),
      ]);
      const vtJson   = await vtRes.json();
      const listJson = await listRes.json();
      if (vtJson.success) setVisitTypes(vtJson.visitTypes || []);
      if (listJson.success) setList(listJson.List || []);
      else setList([]);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(date); }, [date]));

  const changeDate = (d) => { setDate(d); setLoading(true); load(d); };

  const filtered = list.filter((v) => {
    const matchType   = selectedType === "All" || v.visitType?.purpose === selectedType;
    const matchSearch = !search.trim() ||
      v.pet?.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.pet?.owner?.name?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const totalRevenue = list.reduce((sum, v) => sum + (v.details?.price || 0), 0);
  const isToday = toISO(date) === toISO(new Date());
  const isFiltered = selectedType !== "All" || !isToday;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Services Done</Text>
          <Text style={s.headerSub}>
            {isToday ? "Today" : fmtDisplay(date)}
            {selectedType !== "All" ? `  •  ${selectedType}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={[s.filterBtn, isFiltered && s.filterBtnActive]} onPress={() => setShowFilter(true)} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={20} color={isFiltered ? "#0B3D2E" : "#A8D96C"} />
          {isFiltered && <View style={s.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color="#999" />
        <TextInput
          style={s.searchInput}
          placeholder="Search pet or owner..."
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

      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        visitTypes={visitTypes}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        date={date}
        onDateChange={changeDate}
        list={list}
        token={token}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(date); }} tintColor="#0B3D2E" />}
        >
          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: "#0B3D2E15" }]}>
                <Ionicons name="paw" size={18} color="#0B3D2E" />
              </View>
              <Text style={s.statVal}>{list.length}</Text>
              <Text style={s.statLabel}>Total Services</Text>
            </View>
            <View style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: "#3E7B2715" }]}>
                <Ionicons name="cash" size={18} color="#3E7B27" />
              </View>
              <Text style={[s.statVal, { color: "#3E7B27" }]}>₹{totalRevenue}</Text>
              <Text style={s.statLabel}>Revenue</Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIconBox}>
                <Ionicons name="construct-outline" size={40} color="#A8D96C" />
              </View>
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
                <View style={s.cardTop}>
                  <View style={s.typePill}>
                    <Text style={s.typeEmoji}>{v.visitType?.emoji || "🐾"}</Text>
                    <Text style={s.typeName}>{v.visitType?.purpose || "Visit"}</Text>
                  </View>
                  <View style={s.priceBox}>
                    {v.details?.price != null && v.details.price > 0 ? (
                      <Text style={s.price}>₹{v.details.price}</Text>
                    ) : (
                      <Text style={s.priceFree}>Free</Text>
                    )}
                  </View>
                </View>

                <View style={s.divider} />

                <View style={s.petRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>
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
                    <Ionicons name="time-outline" size={12} color="#A8D96C" />
                    <Text style={s.timeTxt}>{fmtTime(v.createdAt)}</Text>
                  </View>
                </View>

                {(v.details?.note || v.details?.customerType) && (
                  <View style={s.extraRow}>
                    {v.details.customerType && (
                      <View style={s.chip}>
                        <Ionicons name="person-circle-outline" size={12} color="#3E7B27" />
                        <Text style={s.chipTxt}>{v.details.customerType}</Text>
                      </View>
                    )}
                    {v.details.note && (
                      <Text style={s.noteTxt} numberOfLines={1}>📝 {v.details.note}</Text>
                    )}
                  </View>
                )}

                <Text style={s.visitId}>#{(v._id || "").slice(-8).toUpperCase()}</Text>
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
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },
  filterBtn: {
    position: "relative", padding: 8,
    backgroundColor: "rgba(168,217,108,0.15)", borderRadius: 12,
  },
  filterBtnActive: { backgroundColor: "#A8D96C" },
  filterDot: {
    position: "absolute", top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#F59E0B", borderWidth: 1, borderColor: "#0B3D2E",
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  scroll: { padding: 14, paddingBottom: 40 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 12,
    alignItems: "center", elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  statVal: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  typePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, flexShrink: 1,
  },
  typeEmoji: { fontSize: 14 },
  typeName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  priceBox: {
    backgroundColor: "#F0F7F0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  price: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  priceFree: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 10 },
  petRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 3 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ownerTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  dot: { fontSize: 11, color: "#ccc" },
  timeBox: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#E8F5E8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  timeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  extraRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  chipTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  noteTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", flex: 1 },
  visitId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#ccc", textAlign: "right", marginTop: 8 },
  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center", paddingHorizontal: 20 },
});
