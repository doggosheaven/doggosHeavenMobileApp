import { useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

const fmtDuration = (entryTime) => {
  if (!entryTime) return "—";
  const diff = Date.now() - new Date(entryTime).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return "< 1h";
};

export default function AdminDeboard() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [petsList, setPetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [petsLoading, setPetsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailPet, setDetailPet] = useState(null);
  const [detailPetInfo, setDetailPetInfo] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deboarding, setDeboarding] = useState(false);
  const selectedCatRef = useRef(null);

  const fetchPets = useCallback(async (cat, token) => {
    setPetsLoading(true);
    setPetsList([]);
    try {
      const t = token || (await getAuth()).token || "";
      const res = await fetch(
        `${BASE_URL}/api/v1/pet/getboardedpetslist/?type=${cat._id}`,
        { headers: { Authorization: t } }
      );
      const json = await res.json();
      setPetsList(json.boardedPetList || []);
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setPetsLoading(false); setRefreshing(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getboardingcategories`, {
        headers: { Authorization: token || "" },
      });
      const json = await res.json();
      if (json.success) {
        const cats = json.visitTypes || [];
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCat(cats[0]);
          selectedCatRef.current = cats[0];
          fetchPets(cats[0], token);
        }
      }
    } catch (e) { if (__DEV__) console.log(e); }
    finally { setLoading(false); }
  }, [fetchPets]);

  useFocusEffect(useCallback(() => { loadCategories(); }, [loadCategories]));

  const handleSelectCat = (cat) => {
    setSelectedCat(cat);
    selectedCatRef.current = cat;
    fetchPets(cat);
  };

  const openDetail = async (boardingId, petId) => {
    setDetailLoading(true);
    setDetailPet(null);
    setDetailPetInfo(null);
    try {
      const { token } = await getAuth();
      const [boardRes, petRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/boarding/getboardingdetails`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token || "" },
          body: JSON.stringify({ _id: boardingId }),
        }),
        fetch(`${BASE_URL}/api/v1/pet/getpetdetails/${petId}`, {
          headers: { Authorization: token || "" },
        }),
      ]);
      const boardJson = await boardRes.json();
      const petJson = await petRes.json();
      if (boardJson.success) setDetailPet(boardJson.boardingDetails);
      else { Alert.alert("Error", boardJson.message); return; }
      if (petJson.success) setDetailPetInfo(petJson.pet);
    } catch { Alert.alert("Error", "Failed to load details"); }
    finally { setDetailLoading(false); }
  };

  const handleDeboard = async () => {
    const cat = selectedCatRef.current;
    if (!detailPet || !cat) return;
    const purpose = cat.purpose?.toLowerCase().replace(/\s/g, "");
    const routeMap = {
      hostel: "hosteldeboarding", daycare: "daycaredeboarding",
      dayschool: "dayschooldeboarding", playschool: "playschooldeboarding",
      dogpark: "dogparkdeboarding",
    };
    const route = routeMap[purpose] || "daycaredeboarding";
    const petName = detailPetInfo?.name || detailPet.petId?.name || "this pet";
    Alert.alert("Deboard Pet", `Deboard ${petName} from ${cat.purpose}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deboard", style: "destructive", onPress: async () => {
          setDeboarding(true);
          try {
            const { token } = await getAuth();
            const res = await fetch(`${BASE_URL}/api/v1/boarding/${route}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: token || "" },
              body: JSON.stringify({ boardingid: detailPet._id }),
            });
            const json = await res.json();
            if (json.success) {
              setDetailPet(null); setDetailPetInfo(null);
              Alert.alert("✅ Done", `${petName} deboarded successfully.`);
              fetchPets(cat);
            } else Alert.alert("Error", json.message);
          } catch { Alert.alert("Error", "Network error"); }
          finally { setDeboarding(false); }
        },
      },
    ]);
  };

  if (detailLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#0B3D2E" />
        <Text style={s.loadingTxt}>Loading boarding details...</Text>
      </View>
    );
  }

  if (detailPet) {
    const pet = detailPetInfo;
    const isBoarded = detailPet.isBoarded;
    return (
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => { setDetailPet(null); setDetailPetInfo(null); }} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Boarding Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.detailScroll}>
          <View style={s.avatarCard}>
            <View style={[s.bigAvatar, !isBoarded && s.bigAvatarGrey]}>
              <Text style={s.bigAvatarTxt}>{pet?.name?.slice(0, 2).toUpperCase() || "🐾"}</Text>
            </View>
            <Text style={s.detailPetName}>{pet?.name || "Unknown Pet"}</Text>
            <Text style={s.detailCatName}>{selectedCatRef.current?.purpose}</Text>
            <View style={[s.statusPill, isBoarded ? s.pillBoarded : s.pillDone]}>
              <View style={[s.pillDot, { backgroundColor: isBoarded ? "#A8D96C" : "#aaa" }]} />
              <Text style={s.pillTxt}>{isBoarded ? "Currently Boarded" : "Already Deboarded"}</Text>
            </View>
          </View>

          <Text style={s.secTitle}>Pet & Owner</Text>
          <View style={s.infoCard}>
            {[
              { icon: "paw-outline", label: "Pet Name", value: pet?.name },
              { icon: "color-palette-outline", label: "Breed", value: pet?.breed },
              { icon: "person-outline", label: "Owner", value: pet?.owner?.name },
              { icon: "call-outline", label: "Phone", value: pet?.owner?.phone },
              { icon: "mail-outline", label: "Email", value: pet?.owner?.email },
            ].map((row, i, arr) => (
              <View key={row.label} style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.infoIconBox}><Ionicons name={row.icon} size={16} color="#3E7B27" /></View>
                <Text style={s.infoLabel}>{row.label}</Text>
                <Text style={s.infoValue} numberOfLines={1}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>

          <Text style={s.secTitle}>Boarding Info</Text>
          <View style={s.infoCard}>
            {[
              { icon: "home-outline", label: "Type", value: detailPet.boardingType?.purpose },
              { icon: "time-outline", label: "Entry Time", value: fmtDateTime(detailPet.entryTime) },
              { icon: "hourglass-outline", label: "Duration", value: fmtDuration(detailPet.entryTime) },
              { icon: "calendar-outline", label: "No. of Days", value: detailPet.numberOfDays?.toString() },
              { icon: "card-outline", label: "Subscription", value: detailPet.isSubscriptionAvailed ? "Yes" : "No" },
            ].map((row, i, arr) => (
              <View key={row.label} style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={s.infoIconBox}><Ionicons name={row.icon} size={16} color="#3E7B27" /></View>
                <Text style={s.infoLabel}>{row.label}</Text>
                <Text style={s.infoValue} numberOfLines={1}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>

          {isBoarded ? (
            <TouchableOpacity style={s.deboardBtn} onPress={handleDeboard} disabled={deboarding} activeOpacity={0.85}>
              {deboarding ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="exit-outline" size={22} color="#fff" /><Text style={s.deboardBtnTxt}>Deboard Pet</Text></>
              )}
            </TouchableOpacity>
          ) : (
            <View style={s.alreadyDone}>
              <Ionicons name="checkmark-circle" size={20} color="#3E7B27" />
              <Text style={s.alreadyDoneTxt}>This pet has already been deboarded</Text>
            </View>
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Deboard Pets</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#0B3D2E" /></View>
      ) : (
        <>
          <View style={s.catSection}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat._id}
                  style={[s.catChip, selectedCat?._id === cat._id && s.catChipActive]}
                  onPress={() => handleSelectCat(cat)} activeOpacity={0.8}
                >
                  <Text style={s.catEmoji}>{cat.emoji || "🏠"}</Text>
                  <Text style={[s.catChipTxt, selectedCat?._id === cat._id && s.catChipTxtActive]}>{cat.purpose}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {petsLoading ? (
            <View style={s.centered}>
              <ActivityIndicator size="large" color="#0B3D2E" />
              <Text style={s.loadingTxt}>Loading pets...</Text>
            </View>
          ) : petsList.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="paw-outline" size={52} color="#A8D96C" />
              <Text style={s.emptyTitle}>No Pets Boarded</Text>
              <Text style={s.emptySubtitle}>No pets currently in {selectedCat?.purpose}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.listScroll}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPets(selectedCat); }} tintColor="#0B3D2E" />}
            >
              {petsList.map((item) => (
                <TouchableOpacity
                  key={item._id} style={s.petCard}
                  onPress={() => openDetail(item._id, item.petId?._id)} activeOpacity={0.82}
                >
                  <View style={s.petAvatar}>
                    <Text style={s.petAvatarTxt}>{item.petId?.name ? item.petId.name.slice(0, 2).toUpperCase() : "🐾"}</Text>
                  </View>
                  <View style={s.petCardBody}>
                    <View style={s.petCardTop}>
                      <Text style={s.petName} numberOfLines={1}>{item.petId?.name || "Unknown"}</Text>
                      <View style={s.boardedBadge}>
                        <View style={s.boardedDot} />
                        <Text style={s.boardedTxt}>Boarded</Text>
                      </View>
                    </View>
                    <Text style={s.ownerTxt} numberOfLines={1}>{item.petId?.owner?.name || "—"}</Text>
                    <View style={s.metaRow}>
                      {item.petId?.owner?.phone && (
                        <View style={s.metaItem}>
                          <Ionicons name="call-outline" size={11} color="#999" />
                          <Text style={s.metaTxt}>{item.petId.owner.phone}</Text>
                        </View>
                      )}
                      {item.entryTime && (
                        <View style={s.metaItem}>
                          <Ionicons name="hourglass-outline" size={11} color="#999" />
                          <Text style={s.metaTxt}>{fmtDuration(item.entryTime)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
                </TouchableOpacity>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", flex: 1, textAlign: "center" },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  catSection: { borderBottomWidth: 1, borderBottomColor: "#D4EDD4" },
  catRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: "#fff" },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  catChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  catEmoji: { fontSize: 15 },
  catChipTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  catChipTxtActive: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  listScroll: { padding: 16, paddingBottom: 40 },
  petCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    marginBottom: 10, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  petAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center" },
  petAvatarTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  petCardBody: { flex: 1, minWidth: 0 },
  petCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  petName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1, marginRight: 8 },
  boardedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8F5E8", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  boardedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#3E7B27" },
  boardedTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  ownerTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999", textAlign: "center" },
  detailScroll: { padding: 16, paddingBottom: 40 },
  avatarCard: { backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 16, elevation: 3 },
  bigAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  bigAvatarGrey: { backgroundColor: "#999" },
  bigAvatarTxt: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  detailPetName: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  detailCatName: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa", marginBottom: 10 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  pillBoarded: { backgroundColor: "rgba(168,217,108,0.2)" },
  pillDone: { backgroundColor: "rgba(255,255,255,0.1)" },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  secTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 10, marginTop: 4 },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, paddingHorizontal: 14, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0" },
  infoIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center" },
  infoLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#666", width: 90 },
  infoValue: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#0B3D2E", textAlign: "right" },
  deboardBtn: { backgroundColor: "#C62828", borderRadius: 14, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 3 },
  deboardBtnTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  alreadyDone: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#E8F5E8", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#D4EDD4" },
  alreadyDoneTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
});
