import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { ErrorState, EmptyState } from "../../components/ScreenState";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const STATUS = {
  overdue:  { label: "Overdue",  tint: "#C62828", bg: "#FFEBEE", icon: "alert-circle" },
  dueSoon:  { label: "Due soon", tint: "#B8860B", bg: "#FFF9E6", icon: "time" },
  upcoming: { label: "Upcoming", tint: "#3E7B27", bg: "#E8F5E8", icon: "calendar" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "dueSoon", label: "Due soon" },
  { key: "upcoming", label: "Upcoming" },
];

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const whenLabel = (days) => {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 30) return `in ${days} days`;
  const months = Math.round(days / 30);
  return `in ${months} month${months === 1 ? "" : "s"}`;
};

/**
 * Vaccination due dates across the customer's pets.
 *
 * Every pet already carried these dates from registration; there was simply no
 * screen showing them, so owners had to remember on their own.
 */
export default function Vaccinations() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/customer/pet/vaccinations`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) { setData(json); setError(false); }
      else setError(true);
    } catch (e) {
      __DEV__ && console.log(e);
      setError(true);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = data?.vaccinations || [];
  const shown = filter === "all" ? all : all.filter((v) => v.status === filter);
  const counts = data?.counts || {};

  const initials = (n = "") => (n[0] || "?").toUpperCase();

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Vaccinations</Text>
          <Text style={s.headerSub}>
            {counts.overdue > 0
              ? `${counts.overdue} overdue`
              : counts.dueSoon > 0
              ? `${counts.dueSoon} due in the next 30 days`
              : "Everything is up to date"}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : error ? (
        <ErrorState
          message="Could not load the vaccination schedule. Check your connection."
          onRetry={() => { setLoading(true); setError(false); load(); }}
        />
      ) : (
        <>
          {all.length > 0 && (
            <View style={s.chipRow}>
              {FILTERS.map((f) => {
                const n = f.key === "all" ? all.length : counts[f.key] || 0;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.chip, filter === f.key && s.chipActive]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipTxt, filter === f.key && s.chipTxtActive]}>
                      {f.label} {n}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0B3D2E" />
            }
          >
            {all.length === 0 ? (
              <EmptyState
                icon="medkit-outline"
                title="No vaccination dates yet"
                subtitle={
                  data?.petCount
                    ? "Add a next-due date on your pet's record and it will show up here."
                    : "Register a pet first, then its vaccination dates appear here."
                }
                actionLabel={data?.petCount ? "Go to My Pets" : "Add a pet"}
                actionIcon="paw-outline"
                onAction={() => router.push(data?.petCount ? "/screens/mypets" : "/(tabs)/Pet/PetForm")}
              />
            ) : shown.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title={`Nothing ${FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}`}
                subtitle="Try a different filter."
                actionLabel="Show all"
                actionIcon="list-outline"
                onAction={() => setFilter("all")}
              />
            ) : (
              shown.map((v, i) => {
                const meta = STATUS[v.status] || STATUS.upcoming;
                return (
                  <TouchableOpacity
                    key={`${v.petId}-${v.name}-${i}`}
                    style={[s.card, { borderLeftColor: meta.tint }]}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: "/screens/editpet", params: { petId: v.petId } })}
                  >
                    <View style={s.cardTop}>
                      {v.petImage ? (
                        <Image source={{ uri: v.petImage }} style={s.petImg} />
                      ) : (
                        <View style={s.petAvatar}>
                          <Text style={s.petAvatarTxt}>{initials(v.petName)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.vaxName} numberOfLines={1}>{v.name}</Text>
                        <Text style={s.petName} numberOfLines={1}>
                          {v.petName}{v.petBreed ? ` · ${v.petBreed}` : ""}
                        </Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: meta.bg }]}>
                        <Ionicons name={meta.icon} size={11} color={meta.tint} />
                        <Text style={[s.badgeTxt, { color: meta.tint }]}>{meta.label}</Text>
                      </View>
                    </View>

                    <View style={s.divider} />

                    <View style={s.metaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.metaLabel}>Next due</Text>
                        <Text style={[s.metaVal, { color: meta.tint }]}>
                          {fmt(v.nextDueDate)} · {whenLabel(v.daysAway)}
                        </Text>
                      </View>
                      {v.lastGivenOn && (
                        <View style={{ flex: 1 }}>
                          <Text style={s.metaLabel}>Last given</Text>
                          <Text style={s.metaVal}>{fmt(v.lastGivenOn)}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 30 }} />
          </ScrollView>
        </>
      )}
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
  headerTitle: { fontSize: 19, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: {
    backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  chipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  chipTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#8A9A8A" },
  chipTxtActive: { color: "#A8D96C" },

  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#D4EDD4", borderLeftWidth: 4, elevation: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  petImg: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F5E8" },
  petAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  petAvatarTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaxName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petName: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 1 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeTxt: { fontSize: 10, fontFamily: "Poppins_700Bold" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginVertical: 10 },
  metaRow: { flexDirection: "row", gap: 12 },
  metaLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#8A9A8A" },
  metaVal: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#1A1A1A", marginTop: 1 },
});
