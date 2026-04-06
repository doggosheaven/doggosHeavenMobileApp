import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_FILTERS = ["active", "all", "inactive"];

export default function StaffBoardingSubscriptions() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [token, setToken] = useState(null);
  const [deboarding, setDeboarding] = useState(null); // bookingId being deboarded

  const load = useCallback(async (status = filter) => {
    const { token: t } = await getAuth();
    setToken(t);
    try {
      const q = status === "all" ? "" : `?status=${status}`;
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/admin/list${q}`, {
        headers: { Authorization: t || "" },
      });
      const data = await res.json();
      if (data.success) setBookings(data.bookings || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(filter); }, [filter]));

  const handleDeboard = (b) => {
    Alert.alert(
      "Force Deboard?",
      `Stop boarding for ${b.userId?.fullName}? (${b.numberOfPets} pet${b.numberOfPets > 1 ? "s" : ""})`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deboard", style: "destructive", onPress: async () => {
            setDeboarding(b._id);
            try {
              const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/admin/${b._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: token || "" },
                body: JSON.stringify({ action: "reject", adminNote: "Deboarded by staff" }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("✅ Done", "Boarding stopped successfully.");
                load(filter);
              } else Alert.alert("Error", data.message);
            } catch { Alert.alert("Error", "Network error"); }
            finally { setDeboarding(null); }
          },
        },
      ]
    );
  };

  const statusColor = { active: "#0B3D2E", inactive: "#C62828", rejected: "#C62828", pending: "#B8860B", approved: "#2E7D32" };
  const statusBg = { active: "#E8F5E8", inactive: "#FFEBEE", rejected: "#FFEBEE", pending: "#FFF9E6", approved: "#E8F5E8" };

  return (
    <View style={s.container}>
      <Header title="Boarding Subscriptions" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterBarContent}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterTab, filter === f && s.filterTabActive]}
            onPress={() => { setFilter(f); setLoading(true); }}
          >
            <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {bookings.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyEmoji}>🐾</Text>
              <Text style={s.emptyText}>No {filter} boardings</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <View key={b._id} style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.cardHeaderInfo}>
                    <Text style={s.ownerName}>{b.userId?.fullName || "Unknown"}</Text>
                    <Text style={s.ownerEmail}>{b.userId?.email}</Text>
                    {b.userId?.phone ? <Text style={s.ownerPhone}>📞 {b.userId.phone}</Text> : null}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusBg[b.status] }]}>
                    <Text style={[s.statusText, { color: statusColor[b.status] }]}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={s.detailsRow}>
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Pets</Text>
                    <Text style={s.detailVal}>{b.numberOfPets}</Text>
                  </View>
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Daily</Text>
                    <Text style={s.detailVal}>₹{b.dailyCharge}</Text>
                  </View>
                  <View style={s.detailItem}>
                    <Text style={s.detailLabel}>Days Left</Text>
                    <Text style={s.detailVal}>{b.daysRemaining}</Text>
                  </View>
                </View>

                <View style={s.petsRow}>
                  {b.petIds?.map((p) => (
                    <View key={p._id} style={s.petChip}>
                      <Text style={s.petChipText}>🐾 {p.name} ({p.species || "Pet"})</Text>
                    </View>
                  ))}
                </View>

                {b.status === "active" && b.startDate && (
                  <View style={s.datesRow}>
                    <Ionicons name="calendar-outline" size={13} color="#3E7B27" />
                    <Text style={s.dateText}>
                      {new Date(b.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {" → "}
                      {new Date(b.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  </View>
                )}

                {b.status === "active" && (
                  <TouchableOpacity
                    style={[s.deboardBtn, deboarding === b._id && s.deboardBtnDis]}
                    onPress={() => handleDeboard(b)}
                    disabled={deboarding === b._id}
                  >
                    {deboarding === b._id ? (
                      <ActivityIndicator size="small" color="#C62828" />
                    ) : (
                      <>
                        <Ionicons name="exit-outline" size={15} color="#C62828" />
                        <Text style={s.deboardBtnText}>Deboard</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                <Text style={s.bookingId}>
                  {new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {" · "}ID: {b._id.slice(-6).toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  filterBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#D4EDD4", maxHeight: 52 },
  filterBarContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#D4EDD4", backgroundColor: "#F0F7F0",
  },
  filterTabActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  filterTabText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  filterTabTextActive: { color: "#A8D96C" },

  scroll: { padding: 16, paddingBottom: 40 },
  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  cardHeaderInfo: { flex: 1 },
  ownerName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  ownerEmail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  ownerPhone: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: "Poppins_700Bold" },

  detailsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  detailItem: {
    flex: 1, backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  detailLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 2 },
  detailVal: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  petsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  petChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  petChipText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  datesRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 10, marginBottom: 10,
  },
  dateText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  deboardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1.5, borderColor: "#C62828", borderRadius: 12, paddingVertical: 10,
    marginBottom: 10,
  },
  deboardBtnDis: { opacity: 0.5 },
  deboardBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#C62828" },

  bookingId: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#bbb", textAlign: "right" },
});
