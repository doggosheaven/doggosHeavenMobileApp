import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { registerCacheReset } from "../../utils/sessionCache";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

let _cachedPets = null;
let _cachedToken = "";

registerCacheReset(() => { _cachedPets = null; _cachedToken = ""; });

export default function BlacklistedPets() {
  const router = useRouter();
  const [pets, setPets] = useState(_cachedPets || []);
  const [loading, setLoading] = useState(!_cachedPets);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState(_cachedToken);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async (force = false) => {
    if (!force && _cachedPets) { setPets(_cachedPets); setLoading(false); return; }
    try {
      const { token: t } = await getAuth();
      setToken(t || ""); _cachedToken = t || "";
      const res = await fetch(`${BASE_URL}/api/v1/pet/blacklisted`, {
        headers: { Authorization: t || "" },
      });
      const json = await res.json();
      if (json.success) { setPets(json.pets || []); _cachedPets = json.pets || []; }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = (pet) => {
    Alert.alert(
      "Remove from Blacklist",
      `Remove ${pet.name} from blacklist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove", onPress: async () => {
            setRemovingId(pet._id);
            try {
              const res = await fetch(`${BASE_URL}/api/v1/pet/blacklist/${pet._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: token },
                body: JSON.stringify({ isBlacklisted: false, blacklistReason: "" }),
              });
              const json = await res.json();
              if (json.success) {
                const updated = pets.filter((p) => p._id !== pet._id);
                setPets(updated); _cachedPets = updated;
                Alert.alert("✅ Done", `${pet.name} removed from blacklist.`);
              } else Alert.alert("Error", json.message);
            } catch { Alert.alert("Error", "Network error"); }
            finally { setRemovingId(null); }
          },
        },
      ]
    );
  };

  const filtered = pets.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.owner?.phone?.includes(search)
  );

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>🚫 Blacklisted Pets</Text>
      </View>

      {/* Warning Banner */}
      <View style={s.warningBanner}>
        <Ionicons name="warning" size={18} color="#B8860B" />
        <Text style={s.warningText}>
          Blacklisted pets should NOT be served. Contact admin if unsure.
        </Text>
      </View>

      {/* Search */}
      <View style={s.searchWrapper}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color="#999" />
          <TextInput
            style={s.searchInput}
            placeholder="Search by pet name, owner, phone..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#C62828" style={{ flex: 1 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#C62828" />}
        >
          {filtered.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-circle" size={56} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Blacklisted Pets</Text>
              <Text style={s.emptySub}>
                {search ? "No results for your search" : "All pets are in good standing"}
              </Text>
            </View>
          ) : (
            filtered.map((pet) => (
              <View key={pet._id} style={s.card}>
                {/* Card Header */}
                <View style={s.cardHeader}>
                  <View style={s.avatar}>
                    <Text style={s.avatarTxt}>{pet.name?.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={s.cardInfo}>
                    <View style={s.nameRow}>
                      <Text style={s.petName}>{pet.name}</Text>
                      <View style={s.blackBadge}>
                        <Ionicons name="ban" size={10} color="#fff" />
                        <Text style={s.blackBadgeTxt}>BLACKLISTED</Text>
                      </View>
                    </View>
                    <Text style={s.petBreed}>{pet.breed || pet.species || "—"}</Text>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Reason */}
                {pet.blacklistReason ? (
                  <View style={s.reasonBox}>
                    <Ionicons name="alert-circle" size={14} color="#C62828" />
                    <Text style={s.reasonText}>{pet.blacklistReason}</Text>
                  </View>
                ) : null}

                {/* Meta */}
                <View style={s.metaRow}>
                  {pet.blacklistedAt && (
                    <View style={s.metaItem}>
                      <Ionicons name="calendar-outline" size={12} color="#999" />
                      <Text style={s.metaText}>Blacklisted: {fmtDate(pet.blacklistedAt)}</Text>
                    </View>
                  )}
                  {pet.blacklistedBy && (
                    <View style={s.metaItem}>
                      <Ionicons name="person-outline" size={12} color="#999" />
                      <Text style={s.metaText}>By: {pet.blacklistedBy}</Text>
                    </View>
                  )}
                </View>

                {/* Owner Info */}
                {pet.owner && (
                  <View style={s.ownerBox}>
                    <View style={s.ownerRow}>
                      <Ionicons name="person-circle-outline" size={14} color="#3E7B27" />
                      <Text style={s.ownerText}>{pet.owner.name || "—"}</Text>
                    </View>
                    {pet.owner.phone && (
                      <View style={s.ownerRow}>
                        <Ionicons name="call-outline" size={14} color="#3E7B27" />
                        <Text style={s.ownerText}>{pet.owner.phone}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Remove Button — Admin only */}
                <View style={s.adminOnlyBox}>
                  <Ionicons name="lock-closed-outline" size={13} color="#999" />
                  <Text style={s.adminOnlyTxt}>Only admin can remove from blacklist</Text>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF5F5" },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF9E6", paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#FFE082",
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#B8860B" },

  searchWrapper: { backgroundColor: "#fff", padding: 12, borderBottomWidth: 1, borderBottomColor: "#FFCDD2" },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FFF5F5", borderRadius: 12, paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: "#FFCDD2",
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  scroll: { padding: 16, paddingBottom: 40 },

  emptyBox: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 12, elevation: 3,
    borderWidth: 1.5, borderColor: "#FFCDD2",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: "#C62828", justifyContent: "center", alignItems: "center",
  },
  avatarTxt: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#fff" },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  petName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#C62828" },
  blackBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#C62828", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  blackBadgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#fff" },
  petBreed: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },

  divider: { height: 1, backgroundColor: "#FFEBEE", marginBottom: 10 },

  reasonBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFEBEE", borderRadius: 10, padding: 10, marginBottom: 10,
  },
  reasonText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#C62828" },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },

  ownerBox: {
    backgroundColor: "#F8FFF8", borderRadius: 10, padding: 10,
    marginBottom: 10, gap: 4, borderWidth: 1, borderColor: "#D4EDD4",
  },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ownerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  adminOnlyBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F5F5F5", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: "#E0E0E0",
  },
  adminOnlyTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
});
