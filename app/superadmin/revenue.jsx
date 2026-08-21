import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState, EmptyState } from "../../components/ScreenState";
import CalendarModal from "../../components/CalendarModal";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRESETS = [
  { key: "all",   label: "All time" },
  { key: "today", label: "Today" },
  { key: "week",  label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Custom" },
];

const rangeFor = (key) => {
  const now = new Date();
  if (key === "today") return { from: toISO(now), to: toISO(now) };
  if (key === "week") {
    const from = new Date(now); from.setDate(now.getDate() - 6);
    return { from: toISO(from), to: toISO(now) };
  }
  if (key === "month") {
    return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) };
  }
  return { from: null, to: null };
};

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function SuperAdminRevenue() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preset, setPreset] = useState("all");
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(false);
  // Custom range: pick a start, then an end.
  const [custom, setCustom] = useState({ from: null, to: null });
  const [picking, setPicking] = useState(null); // null | "from" | "to"

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const { from, to } =
        preset === "custom"
          ? { from: custom.from ? toISO(custom.from) : null, to: custom.to ? toISO(custom.to) : null }
          : rangeFor(preset);
      const q = new URLSearchParams();
      if (from) q.set("from", from);
      if (to) q.set("to", to);
      const res = await fetch(`${BASE_URL}/api/v1/superadmin/revenue?${q}`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) { setData(json); setError(false); }
      else setError(true);
    } catch (e) {
      if (__DEV__) console.log(e);
      setError(true);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, [preset, custom]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const initials = (n = "") => n.split(" ").map((x) => x[0]).join("").toUpperCase().slice(0, 2) || "?";

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Revenue by person</Text>
          <Text style={s.headerSub}>Who earned what, and what they added</Text>
        </View>
      </View>

      {/* Range */}
      <View style={s.chipRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[s.chip, preset === p.key && s.chipActive]}
            onPress={() => {
              if (p.key === "custom") { setPreset("custom"); setPicking("from"); return; }
              setPreset(p.key); setLoading(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.chipTxt, preset === p.key && s.chipTxtActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {preset === "custom" && (custom.from || custom.to) && (
        <TouchableOpacity style={s.rangeBar} onPress={() => setPicking("from")} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={15} color="#3E7B27" />
          <Text style={s.rangeTxt}>
            {custom.from ? toISO(custom.from) : "…"} to {custom.to ? toISO(custom.to) : "…"}
          </Text>
          <Ionicons name="create-outline" size={15} color="#8A9A8A" />
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : error ? (
        <ErrorState
          message="Could not load the revenue figures. Check your connection."
          onRetry={() => { setLoading(true); setError(false); load(); }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />}
        >
          {/* Totals */}
          <View style={s.totalCard}>
            <Text style={s.totalLabel}>Total revenue</Text>
            <Text style={s.totalValue}>{money(data?.totals?.revenue)}</Text>
            <View style={s.totalRow}>
              <Stat label="Visits" value={data?.totals?.visits} />
              <Stat label="Bookings" value={data?.totals?.appointments} />
              <Stat label="Bills" value={data?.totals?.bills} />
            </View>
            <View style={s.totalRow}>
              <Stat label="Customers added" value={data?.totals?.customersAdded} />
              <Stat label="Pets added" value={data?.totals?.pets} />
            </View>
          </View>

          {(data?.staff || []).length === 0 ? (
            <EmptyState
              icon="cash-outline"
              title="Nothing recorded for this period"
              subtitle="Try a wider date range."
              actionLabel="Show all time"
              actionIcon="infinite-outline"
              onAction={() => { setPreset("all"); setLoading(true); }}
            />
          ) : (
            (data?.staff || []).map((p) => (
              <TouchableOpacity key={p._id} style={s.card} activeOpacity={0.85} onPress={() => setDetail(p)}>
                <View style={s.cardTop}>
                  <Avatar photo={p.profilePhoto} text={initials(p.fullName)} />
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>{p.fullName}</Text>
                      {!p.isActive && <View style={s.offBadge}><Text style={s.offTxt}>OFF</Text></View>}
                    </View>
                    <Text style={s.role}>{p.role}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.amount}>{money(p.revenue.total)}</Text>
                    <Text style={s.amountSub}>earned</Text>
                  </View>
                </View>

                <View style={s.pillRow}>
                  <Pill icon="clipboard-outline" label="visits" value={p.counts.visits} />
                  <Pill icon="calendar-outline" label="bookings" value={p.counts.appointments} />
                  <Pill icon="receipt-outline" label="bills" value={p.counts.bills} />
                  <Pill icon="person-add-outline" label="customers" value={p.counts.customersAdded} />
                  <Pill icon="paw-outline" label="pets" value={p.counts.pets} />
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Custom range picker: start, then end */}
      <CalendarModal
        visible={picking !== null}
        selectedDate={picking === "to" ? custom.to || custom.from : custom.from}
        onClose={() => setPicking(null)}
        onSelect={(d) => {
          if (picking === "from") {
            setCustom({ from: d, to: null });
            setTimeout(() => setPicking("to"), 250);
          } else {
            const from = custom.from || d;
            const [a2, b2] = d < from ? [d, from] : [from, d];
            setCustom({ from: a2, to: b2 });
            setPicking(null);
            setLoading(true);
          }
        }}
      />

      {/* Breakdown */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={s.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setDetail(null)} />
          <View style={s.sheet}>
            {detail && (
              <>
                <View style={s.sheetHead}>
                  <Avatar photo={detail.profilePhoto} text={initials(detail.fullName)} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>{detail.fullName}</Text>
                    <Text style={s.sheetSub}>{detail.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetail(null)}>
                    <Ionicons name="close" size={22} color="#0B3D2E" />
                  </TouchableOpacity>
                </View>

                <Text style={s.section}>REVENUE</Text>
                <Row label="From visits" value={money(detail.revenue.visits)} />
                <Row label="From bookings" value={money(detail.revenue.appointments)} />
                <Row label="From walk-in bills" value={money(detail.revenue.bills)} />
                <Row label="Total" value={money(detail.revenue.total)} strong last />

                <Text style={s.section}>ADDED TO THE SYSTEM</Text>
                <Row label="Customers" value={detail.counts.customersAdded} />
                <Row label="Staff" value={detail.counts.staffAdded} />
                <Row label="Pets" value={detail.counts.pets} />
                <Row label="Visits" value={detail.counts.visits} />
                <Row label="Bookings accepted" value={detail.counts.appointments} />
                <Row label="Prescriptions" value={detail.counts.prescriptions} last />

                <TouchableOpacity
                  style={s.fullBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    const email = detail.email;
                    setDetail(null);
                    router.push(`/superadmin/users?search=${encodeURIComponent(email)}`);
                  }}
                >
                  <Ionicons name="open-outline" size={17} color="#A8D96C" />
                  <Text style={s.fullBtnTxt}>Open in Users</Text>
                </TouchableOpacity>
                <View style={{ height: 16 }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Avatar({ photo, text }) {
  if (photo) return <Image source={{ uri: photo }} style={s.avatarImg} />;
  return <View style={s.avatar}><Text style={s.avatarTxt}>{text}</Text></View>;
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statValue}>{value ?? 0}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Pill({ icon, label, value }) {
  return (
    <View style={s.pill}>
      <Ionicons name={icon} size={12} color="#3E7B27" />
      <Text style={s.pillTxt}>{value ?? 0} {label}</Text>
    </View>
  );
}

function Row({ label, value, strong, last }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, strong && s.rowValueStrong]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  backBtn: { width: 34, height: 34, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  rangeBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  rangeTxt: { flex: 1, fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  chip: {
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  chipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  chipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A9A8A" },
  chipTxtActive: { color: "#A8D96C" },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  totalCard: { backgroundColor: "#0B3D2E", borderRadius: 18, padding: 18, marginBottom: 14, gap: 12 },
  totalLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },
  totalValue: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: -6 },
  totalRow: { flexDirection: "row", gap: 10 },
  statValue: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8FA88F" },

  empty: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#8A9A8A" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, gap: 10,
    borderWidth: 1, borderColor: "#D4EDD4", elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  avatarImg: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#E8F5E8" },
  avatarTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flexShrink: 1 },
  role: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A9A8A", textTransform: "capitalize" },
  offBadge: { backgroundColor: "#C62828", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  offTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#fff" },
  amount: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  amountSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A9A8A" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  pillTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#F0F7F0", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "88%",
  },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A9A8A" },

  section: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#8A9A8A",
    letterSpacing: 1.2, marginTop: 16, marginBottom: 6,
  },
  row: {
    flexDirection: "row", alignItems: "center", paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#D4EDD4",
  },
  rowLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#3A4A3A" },
  rowValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  rowValueStrong: { fontSize: 16 },

  fullBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#0B3D2E", borderRadius: 14, paddingVertical: 13, marginTop: 18,
  },
  fullBtnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
