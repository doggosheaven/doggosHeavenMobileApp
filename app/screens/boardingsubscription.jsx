import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useApp } from "../../context/AppContext";

const PRICE_PER_DAY = 766.67;

export default function BoardingScreen() {
  const router = useRouter();
  const [auth, setAuth] = useState({});
  const [selectedPets, setSelectedPets] = useState([]);
  const [activating, setActivating] = useState(false);
  const [deboarding, setDeboarding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { pets, boarding, loadPets, loadBoarding } = useApp();

  const activeBoarding = boarding?.activeBoarding || null;
  const walletBalance = boarding?.walletBalance || 0;

  useEffect(() => {
    loadPets();
    loadBoarding();
    getAuth().then(({ user, token }) => setAuth({ user, token }));
  }, []);

  const reload = async () => {
    await Promise.all([loadPets(true), loadBoarding(true)]);
  };

  const loading = !boarding && !refreshing;

  const togglePet = (id) =>
    setSelectedPets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const dailyCharge = parseFloat((PRICE_PER_DAY * selectedPets.length).toFixed(2));

  const handleActivate = async () => {
    if (!selectedPets.length)
      return Alert.alert("Select Pets", "Please select at least one pet.");

    if (walletBalance < dailyCharge) {
      Alert.alert(
        "Insufficient Balance",
        `Your wallet has Rs.${walletBalance.toFixed(0)} but daily charge is Rs.${dailyCharge}. Please add money first.`,
        [
          { text: "Add Money", onPress: () => router.push("/screens/walletscreen") },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }

    Alert.alert(
      "Start Boarding?",
      `Rs.${dailyCharge}/day will be deducted from your wallet for ${selectedPets.length} pet${selectedPets.length > 1 ? "s" : ""}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start Boarding", onPress: confirmActivate },
      ]
    );
  };

  const confirmActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ petIds: selectedPets }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Boarding Started!", "Daily deduction will begin from tomorrow.");
        setSelectedPets([]);
        reload();
      } else {
        Alert.alert("Error", data.message);
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const handleDeboard = () => {
    Alert.alert(
      "Deboard Pets?",
      "Are you sure you want to stop boarding? Daily deductions will stop.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes, Deboard", style: "destructive", onPress: confirmDeboard },
      ]
    );
  };

  const confirmDeboard = async () => {
    setDeboarding(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/deboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth.token || "" },
        body: JSON.stringify({ boardingId: activeBoarding?.id }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Deboarded", "Your pets have been deboarded successfully.");
        reload();
      } else {
        Alert.alert("Error", data.message);
      }
    } catch {
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setDeboarding(false);
    }
  };

  if (loading)
    return <View style={s.center}><ActivityIndicator size="large" color="#0B3D2E" /></View>;

  // ── Active Boarding View ──────────────────────────────────────────────────
  if (activeBoarding) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>My Boarding</Text>
            <Text style={s.headerSub}>Active boarding plan</Text>
          </View>
          <TouchableOpacity style={s.walletBtn} onPress={() => router.push("/screens/walletscreen")} activeOpacity={0.8}>
            <Ionicons name="wallet-outline" size={16} color="#A8D96C" />
            <Text style={s.walletBtnText}>Rs.{walletBalance.toFixed(0)}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Active status card */}
          <View style={s.activeCard}>
            <View style={s.activeCardTop}>
              <Text style={s.activeCardEmoji}>🏠</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.activeCardTitle}>15-Day Boarding Plan</Text>
                <View style={s.activePill}><Text style={s.activePillText}>ACTIVE</Text></View>
              </View>
            </View>

            <View style={s.statsRow}>
              {[
                { label: "Pets", val: activeBoarding.numberOfPets },
                { label: "Daily Charge", val: `Rs.${activeBoarding.dailyCharge}` },
                { label: "Days Left", val: activeBoarding.daysRemaining },
                { label: "Wallet Days", val: activeBoarding.estimatedDaysLeft },
              ].map((item) => (
                <View key={item.label} style={s.statBox}>
                  <Text style={s.statVal}>{item.val}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Pets chips */}
            <View style={s.petsRow}>
              {activeBoarding.pets?.map((p) => (
                <View key={p._id} style={s.petChip}>
                  <Text style={s.petChipText}>🐾 {p.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Wallet balance */}
          <View style={s.walletCard}>
            <Ionicons name="wallet-outline" size={22} color="#0B3D2E" />
            <View style={s.walletCardTop}>
              <Text style={s.walletLabel}>Wallet Balance</Text>
              <View style={s.walletCardBottom}>
                <Text style={s.walletVal}>Rs.{walletBalance.toLocaleString("en-IN")}</Text>
                <TouchableOpacity style={s.addMoneyBtn} onPress={() => router.push("/screens/walletscreen")}>
                  <Ionicons name="add" size={13} color="#0B3D2E" />
                  <Text style={s.addMoneyText}>Add Money</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Low balance warning */}
          {activeBoarding.lowBalance && (
            <TouchableOpacity style={s.warningBox} onPress={() => router.push("/screens/walletscreen")}>
              <Ionicons name="warning-outline" size={18} color="#B8860B" />
              <Text style={s.warningText}>Low balance! Add money to avoid boarding stop.</Text>
              <Ionicons name="chevron-forward" size={16} color="#B8860B" />
            </TouchableOpacity>
          )}

          {/* Dates */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Boarding Details</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Start Date</Text>
              <Text style={s.detailVal}>{new Date(activeBoarding.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>End Date</Text>
              <Text style={s.detailVal}>{new Date(activeBoarding.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
            </View>
            <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={s.detailLabel}>Daily Deduction</Text>
              <Text style={[s.detailVal, { color: "#C62828" }]}>-Rs.{activeBoarding.dailyCharge}/day</Text>
            </View>
          </View>

          {/* Deboard button */}
          <TouchableOpacity
            style={[s.deboardBtn, deboarding && s.deboardBtnDis]}
            onPress={handleDeboard}
            disabled={deboarding}
            activeOpacity={0.85}
          >
            {deboarding ? (
              <ActivityIndicator size="small" color="#C62828" />
            ) : (
              <>
                <Ionicons name="exit-outline" size={20} color="#C62828" />
                <Text style={s.deboardBtnText}>Deboard My Pets</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </View>
    );
  }

  // ── No Active Boarding — Start New ───────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B3D2E" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Wallet Boarding</Text>
          <Text style={s.headerSub}>Rs.{PRICE_PER_DAY.toFixed(0)}/pet/day • Deducted daily</Text>
        </View>
        <TouchableOpacity style={s.walletBtn} onPress={() => router.push("/screens/walletscreen")} activeOpacity={0.8}>
          <Ionicons name="wallet-outline" size={16} color="#A8D96C" />
          <Text style={s.walletBtnText}>Rs.{walletBalance.toFixed(0)}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Wallet balance */}
        <View style={s.walletCard}>
          <Ionicons name="wallet-outline" size={22} color="#0B3D2E" />
          <View style={s.walletCardTop}>
            <Text style={s.walletLabel}>Wallet Balance</Text>
            <View style={s.walletCardBottom}>
              <Text style={s.walletVal}>Rs.{walletBalance.toLocaleString("en-IN")}</Text>
              <TouchableOpacity style={s.addMoneyBtn} onPress={() => router.push("/screens/walletscreen")}>
                <Ionicons name="add" size={13} color="#0B3D2E" />
                <Text style={s.addMoneyText}>Add Money</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plan info */}
        <View style={s.planInfoCard}>
          <Text style={s.planInfoEmoji}>🏠</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.planInfoTitle}>15-Day Boarding Plan</Text>
            <Text style={s.planInfoSub}>Rs.{PRICE_PER_DAY.toFixed(0)}/pet/day • Deducted from wallet daily</Text>
          </View>
        </View>

        {/* Pet selection */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Select Pets to Board</Text>
          <Text style={s.cardSub}>Choose which pets to include in boarding</Text>

          {pets.length === 0 ? (
            <TouchableOpacity style={s.addPetBox} onPress={() => router.push("/(tabs)/Pet/PetForm")}>
              <Ionicons name="add-circle-outline" size={24} color="#0B3D2E" />
              <Text style={s.addPetBoxText}>Add a pet first</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.petsGrid}>
              {pets.map((pet) => {
                const sel = selectedPets.includes(pet._id);
                return (
                  <TouchableOpacity
                    key={pet._id}
                    style={[s.petCard, sel && s.petCardSel]}
                    onPress={() => togglePet(pet._id)}
                    activeOpacity={0.8}
                  >
                    {sel && (
                      <View style={s.checkDot}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                    <Text style={s.petEmoji}>{pet.species?.toLowerCase().includes("cat") ? "🐱" : "🐶"}</Text>
                    <Text style={[s.petName, sel && s.petNameSel]} numberOfLines={1}>{pet.name}</Text>
                    {pet.breed ? <Text style={s.petBreed} numberOfLines={1}>{pet.breed}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Cost preview */}
          {selectedPets.length > 0 && (
            <View style={s.costPreview}>
              <View style={s.costRow}>
                <Text style={s.costLabel}>Pets selected</Text>
                <Text style={s.costVal}>{selectedPets.length}</Text>
              </View>
              <View style={s.costRow}>
                <Text style={s.costLabel}>Daily deduction</Text>
                <Text style={s.costVal}>Rs.{dailyCharge}/day</Text>
              </View>
              <View style={[s.costRow, { borderBottomWidth: 0 }]}>
                <Text style={s.costLabel}>Wallet balance</Text>
                <Text style={[s.costVal, walletBalance < dailyCharge && { color: "#C62828" }]}>
                  Rs.{walletBalance.toFixed(0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.startBtn, (activating || !selectedPets.length) && s.startBtnDis]}
          onPress={handleActivate}
          disabled={activating || !selectedPets.length}
          activeOpacity={0.85}
        >
          {activating ? (
            <ActivityIndicator size="small" color="#0B3D2E" />
          ) : (
            <>
              <Ionicons name="paw-outline" size={20} color="#0B3D2E" />
              <Text style={s.startBtnText}>Start Boarding</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.subscribeLink} onPress={() => router.push("/screens/walletscreen")}>
          <Ionicons name="information-circle-outline" size={15} color="#3E7B27" />
          <Text style={s.subscribeLinkText}>View Subscription Details & Add Money</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },
  walletBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(168,217,108,0.15)", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(168,217,108,0.3)",
  },
  walletBtnText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  activeCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 20, marginBottom: 14, elevation: 4,
  },
  activeCardTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  activeCardEmoji: { fontSize: 40 },
  activeCardTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 6 },
  activePill: {
    backgroundColor: "#A8D96C", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  activePillText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statBox: {
    flex: 1, backgroundColor: "rgba(168,217,108,0.12)",
    borderRadius: 12, padding: 10, alignItems: "center",
  },
  statVal: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  statLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: 2, textAlign: "center" },

  petsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  petChip: {
    backgroundColor: "rgba(168,217,108,0.2)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  petChipText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  walletCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  walletCardTop: { flex: 1 },
  walletCardBottom: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  walletLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 2 },
  walletVal: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  addMoneyBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "#D4EDD4",
  },
  addMoneyText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  warningBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFF9E6", borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#F0C040",
  },
  warningText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#7A6000" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#E8F5E8",
  },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 14 },

  detailRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  detailLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  detailVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  deboardBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 2, borderColor: "#C62828", borderRadius: 14, padding: 16,
    backgroundColor: "#fff", elevation: 1,
  },
  deboardBtnDis: { opacity: 0.5 },
  deboardBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#C62828" },

  planInfoCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0B3D2E", borderRadius: 14, padding: 14,
    marginBottom: 12, elevation: 2,
  },
  planInfoEmoji: { fontSize: 28 },
  planInfoTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  planInfoSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },

  addPetBox: {
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#D4EDD4", borderStyle: "dashed",
    borderRadius: 12, padding: 20,
  },
  addPetBoxText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  petsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  petCard: {
    width: "30%", backgroundColor: "#F0F7F0", borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1.5, borderColor: "#D4EDD4", position: "relative",
  },
  petCardSel: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  checkDot: {
    position: "absolute", top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#A8D96C", justifyContent: "center", alignItems: "center",
  },
  petEmoji: { fontSize: 26, marginBottom: 6 },
  petName: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },
  petNameSel: { color: "#A8D96C" },
  petBreed: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", textAlign: "center", marginTop: 2 },

  costPreview: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  costRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  costLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },
  costVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  startBtn: {
    backgroundColor: "#A8D96C", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, elevation: 2, marginBottom: 10, alignSelf: "center",
  },
  startBtnDis: { opacity: 0.45 },
  startBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  subscribeLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10,
  },
  subscribeLinkText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
});
