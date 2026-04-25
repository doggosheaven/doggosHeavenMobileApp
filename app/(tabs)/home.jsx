import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useApp } from "../../context/AppContext";

const SERVICE_ICONS = {
  Grooming: "✂️", Hostel: "🏠", "Day School": "🎓",
  "Day Care": "🌞", "Play School": "🎮", Veterinary: "🩺", "Dog Park": "🌳",
};

const FALLBACK_SERVICES = [
  { _id: "1", purpose: "Grooming",    price: 900,  halfdayprice: null, isSubscriptionAvailable: true,  detail: "Bath, trim, nail clipping & ear cleaning" },
  { _id: "2", purpose: "Hostel",      price: 1000, halfdayprice: 500,  isSubscriptionAvailable: true,  detail: "Overnight stay with meals & care" },
  { _id: "3", purpose: "Day School",  price: 350,  halfdayprice: null, isSubscriptionAvailable: false, detail: "Training & socializing for your pet" },
  { _id: "4", purpose: "Day Care",    price: 600,  halfdayprice: null, isSubscriptionAvailable: false, detail: "Full day supervised care & play" },
  { _id: "5", purpose: "Play School", price: 500,  halfdayprice: null, isSubscriptionAvailable: true,  detail: "Fun activities & early training" },
  { _id: "6", purpose: "Veterinary",  price: null, halfdayprice: null, consultationPricePvt: 400, isSubscriptionAvailable: false, detail: "Expert vet consultation & checkup" },
  { _id: "7", purpose: "Dog Park",    price: 667,  halfdayprice: null, isSubscriptionAvailable: false, detail: "Open play area for your dog" },
];

const QUICK_ACTIONS = [
  { icon: "calendar",  label: "My Bookings", sub: "Appointments", bg: "#0B3D2E", route: "/(tabs)/bookings",                  valueKey: "bookings" },
  { icon: "paw",       label: "My Pets",     sub: "Registered",  bg: "#1A5C3A", route: "/screens/mypets",                        valueKey: "pets" },
  { icon: "wallet",    label: "My Wallet",   sub: "Balance",     bg: "#3E7B27", route: "/screens/walletscreen",             valueKey: "wallet" },
  { icon: "home",      label: "Boarding",    sub: "15-day plan", bg: "#1B4D3E", route: "/screens/boardingsubscription",     valueKey: "boarding" },
];

const SERVICE_CHIPS = [
  { icon: "cut-outline",               label: "Grooming",    color: "#0B3D2E" },
  { icon: "moon-outline",              label: "Hostel",      color: "#1A5C3A" },
  { icon: "school-outline",            label: "Day School",  color: "#3E7B27" },
  { icon: "sunny-outline",             label: "Day Care",    color: "#0B3D2E" },
  { icon: "game-controller-outline",   label: "Play School", color: "#1A5C3A" },
  { icon: "medkit-outline",            label: "Veterinary",  color: "#3E7B27" },
  { icon: "leaf-outline",              label: "Dog Park",    color: "#0B3D2E" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { user, services: ctxServices, boarding: ctxBoarding, bookings: ctxBookings, pets: ctxPets, wallet: ctxWallet, loadAuth, loadServices, loadBoarding, loadAppointments, loadPets, loadWallet } = useApp();

  const services = ctxServices.length > 0 ? ctxServices : FALLBACK_SERVICES;
  const activeBoarding = ctxBoarding?.activeBoarding || null;

  useEffect(() => {
    loadAuth(true).then(() => {
      Promise.all([loadServices(), loadBoarding(), loadAppointments(), loadPets(), loadWallet()]);
    });
  }, []);

  const quickValues = {
    bookings: ctxBookings?.length ?? "0",
    pets:     ctxPets?.length     ?? "0",
    wallet:   ctxWallet?.balance != null ? `₹${ctxWallet.balance}` : "₹0",
    boarding: activeBoarding?.daysRemaining ? `${activeBoarding.daysRemaining}d` : "0",
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadServices(true), loadBoarding(true), loadAppointments(true), loadPets(true), loadWallet(true)]);
    setRefreshing(false);
  };

  const bookService = (service) => {
    router.push({
      pathname: "/screens/bookingform",
      params: {
        serviceId: service._id,
        serviceName: service.purpose,
        serviceEmoji: service.emoji || SERVICE_ICONS[service.purpose] || "🐾",
        servicePrice: service.price || 0,
        serviceHalfPrice: service.halfdayprice || 0,
        serviceConsultPrice: service.consultationPricePvt || 0,
        serviceDescription: service.description || service.detail || "",
        servicePriceTiers: service.priceTiers?.length ? encodeURIComponent(JSON.stringify(service.priceTiers)) : "",
      },
    });
  };

  const handleChipPress = (label) => {
    const match = services.find((s) => s.purpose.toLowerCase().includes(label.toLowerCase()));
    if (match) bookService(match);
    else router.push("/(tabs)/services");
  };

  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <View style={s.container}>
      <Header />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >

        {/* ── Hero Welcome ── */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroGreeting}>{greeting} 👋</Text>
            <Text style={s.heroName}>{user?.fullName || "Pet Parent"}</Text>
            <View style={s.heroBadge}>
              <Ionicons name="paw" size={11} color="#A8D96C" />
              <Text style={s.heroBadgeTxt}>Doggos Heaven Member</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} activeOpacity={0.85}>
            {user?.profilePhoto || user?.profileImage ? (
              <Image source={{ uri: user.profilePhoto || user.profileImage }} style={s.heroAvatar} />
            ) : (
              <View style={s.heroAvatarPlaceholder}>
                <Text style={s.heroAvatarInitial}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || "P"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={[s.quickCard, { backgroundColor: item.bg }]}
              onPress={() => router.push(item.route)}
              activeOpacity={0.85}
            >
              <View style={s.quickIconBox}>
                <Ionicons name={item.icon} size={22} color="#A8D96C" />
              </View>
              <Text style={s.quickValue}>{quickValues[item.valueKey]}</Text>
              <Text style={s.quickLabel}>{item.label}</Text>
              <Text style={s.quickSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Boarding Status Banner ── */}
        <TouchableOpacity
          style={[s.boardingCard, activeBoarding && s.boardingCardActive]}
          onPress={() => router.push("/screens/boardingsubscription")}
          activeOpacity={0.88}
        >
          <View style={s.boardingInfo}>
            <View style={s.boardingTopRow}>
              <View style={[s.boardingStatusDot, { backgroundColor: activeBoarding ? "#A8D96C" : "#888" }]} />
              <Text style={s.boardingStatusTxt}>
                {activeBoarding ? "BOARDING ACTIVE" : "15-DAY BOARDING PLAN"}
              </Text>
            </View>
            {activeBoarding ? (
              <>
                <Text style={s.boardingBigTxt}>{activeBoarding.numberOfPets} Pet{activeBoarding.numberOfPets > 1 ? "s" : ""} Boarded</Text>
                <Text style={s.boardingSmallTxt}>₹{activeBoarding.dailyCharge}/day · {activeBoarding.daysRemaining} days remaining</Text>
              </>
            ) : (
              <>
                <Text style={s.boardingBigTxt}>₹11,500</Text>
                <Text style={s.boardingSmallTxt}>₹766/day per pet · Subscribe now</Text>
              </>
            )}
            <View style={s.boardingCta}>
              <Text style={s.boardingCtaTxt}>{activeBoarding ? "View Details" : "Subscribe Now"}</Text>
              <Ionicons name="arrow-forward" size={12} color="#0B3D2E" />
            </View>
          </View>
          <Text style={s.boardingEmoji}>🏡</Text>
        </TouchableOpacity>

        {/* ── Services ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Our Services</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/services")}>
            <Text style={s.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsScroll}
        >
          {SERVICE_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={s.chip}
              onPress={() => handleChipPress(chip.label)}
              activeOpacity={0.82}
            >
              <View style={[s.chipIcon, { backgroundColor: chip.color }]}>
                <Ionicons name={chip.icon} size={20} color="#A8D96C" />
              </View>
              <Text style={s.chipLabel}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Featured Services ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Popular Services</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/services")}>
            <Text style={s.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {services.slice(0, 4).map((service) => {
          const price = service.price || service.consultationPricePvt;
          return (
            <TouchableOpacity
              key={service._id}
              style={s.serviceRow}
              onPress={() => bookService(service)}
              activeOpacity={0.85}
            >
              <View style={s.serviceRowIcon}>
                <Text style={{ fontSize: 22 }}>{service.emoji || SERVICE_ICONS[service.purpose] || "🐾"}</Text>
              </View>
              <View style={s.serviceRowInfo}>
                <Text style={s.serviceRowName}>{service.purpose}</Text>
                <Text style={s.serviceRowDesc} numberOfLines={1}>{service.description || service.detail}</Text>
              </View>
              <View style={s.serviceRowRight}>
                {price ? (
                  <Text style={s.serviceRowPrice}>₹{price}</Text>
                ) : (
                  <Text style={s.serviceRowPriceNA}>On Request</Text>
                )}
                <TouchableOpacity
                  style={s.bookBtn}
                  onPress={() => bookService(service)}
                  activeOpacity={0.85}
                >
                  <Text style={s.bookBtnTxt}>Book</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Vet Card ── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Our Veterinarian</Text>
        </View>

        <TouchableOpacity
          style={s.vetCard}
          activeOpacity={0.88}
          onPress={() => {
            const vetService = services.find((sv) =>
              sv.purpose.toLowerCase().includes("vet") || sv.purpose.toLowerCase().includes("consult")
            );
            router.push({
              pathname: "/screens/bookingform",
              params: {
                serviceId: vetService?._id || "",
                serviceName: vetService?.purpose || "Veterinary Consultation",
                serviceEmoji: "🩺",
                servicePrice: vetService?.price || 0,
                serviceConsultPrice: vetService?.consultationPricePvt || 500,
                serviceDescription: "Expert vet consultation & checkup",
                servicePriceTiers: vetService?.priceTiers?.length
                  ? encodeURIComponent(JSON.stringify(vetService.priceTiers)) : "",
              },
            });
          }}
        >
          {/* Header */}
          <View style={s.vetHeader}>
            <View style={s.vetAvatarBox}>
              <Text style={{ fontSize: 34 }}>👨‍⚕️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.vetNameRow}>
                <Text style={s.vetName}>Dr. Bhuvnesh Ahlawat</Text>
                <View style={s.vetBadge}>
                  <Ionicons name="checkmark-circle" size={11} color="#A8D96C" />
                  <Text style={s.vetBadgeTxt}>Verified</Text>
                </View>
              </View>
              <Text style={s.vetDeg}>B.V.Sc & A.H. — Veterinarian</Text>
              <View style={s.vetStars}>
                {[1,2,3,4,5].map((i) => <Ionicons key={i} name="star" size={12} color="#F59E0B" />)}
                <Text style={s.vetStarsTxt}>5.0 · Expert Vet</Text>
              </View>
            </View>
          </View>

          {/* Specialization chips */}
          <View style={s.vetSpecRow}>
            {["Dogs & Cats", "Surgery", "Vaccination", "Dental Care"].map((sp) => (
              <View key={sp} style={s.vetSpecChip}>
                <Text style={s.vetSpecTxt}>{sp}</Text>
              </View>
            ))}
          </View>

          {/* Info chips */}
          <View style={s.vetInfoRow}>
            <View style={s.vetInfoChip}>
              <Ionicons name="pricetag-outline" size={13} color="#3E7B27" />
              <Text style={s.vetInfoTxt}>₹500 Consult</Text>
            </View>
            <View style={s.vetInfoChip}>
              <Ionicons name="time-outline" size={13} color="#3E7B27" />
              <Text style={s.vetInfoTxt}>10 AM – 9 PM</Text>
            </View>
            <View style={s.vetInfoChip}>
              <Ionicons name="location-outline" size={13} color="#3E7B27" />
              <Text style={s.vetInfoTxt}>Jhajjar</Text>
            </View>
          </View>

          {/* Book */}
          <View style={s.vetBookBtn}>
            <Ionicons name="calendar-outline" size={15} color="#0B3D2E" />
            <Text style={s.vetBookBtnTxt}>Book Consultation</Text>
            <Ionicons name="arrow-forward" size={14} color="#0B3D2E" style={{ marginLeft: "auto" }} />
          </View>
        </TouchableOpacity>

        {/* ── Explore All ── */}
        <TouchableOpacity
          style={s.exploreBtn}
          onPress={() => router.push("/(tabs)/services")}
          activeOpacity={0.85}
        >
          <Ionicons name="grid-outline" size={18} color="#0B3D2E" />
          <Text style={s.exploreBtnTxt}>Explore All {services.length} Services</Text>
          <Ionicons name="arrow-forward" size={16} color="#0B3D2E" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { paddingBottom: 48 },

  // ── Hero ──
  hero: {
    backgroundColor: "#0B3D2E",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  heroLeft: { flex: 1 },
  heroGreeting: { fontSize: 13, color: "#A8D96C", fontFamily: "Inter_400Regular", marginBottom: 4 },
  heroName: { fontSize: 24, color: "#fff", fontFamily: "Poppins_700Bold", marginBottom: 8 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(168,217,108,0.15)",
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  heroBadgeTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  heroAvatar: {
  width: 100,
  height: 100,
  borderRadius: 35,

  backgroundColor: "#ffffff",

  borderWidth: 2,
  borderColor: "#A8D96C",

  shadowColor: "#A8D96C",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 10,

  elevation: 10,

  justifyContent: "center",
  alignItems: "center",
},
  heroAvatarPlaceholder: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: "#1A5C3A", borderWidth: 2.5, borderColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  heroAvatarInitial: { fontSize: 24, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // ── Quick Actions ──
  quickGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  quickCard: {
    width: "47.5%", borderRadius: 18, padding: 16, elevation: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 5,
  },
  quickIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "rgba(168,217,108,0.15)",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  quickValue: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  quickLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 1 },
  quickSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.6)" },

  // ── Boarding ──
  boardingCard: {
    backgroundColor: "#0B3D2E", borderRadius: 18, marginHorizontal: 16, marginTop: 14,
    padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    elevation: 3, borderWidth: 1, borderColor: "rgba(168,217,108,0.2)",
  },
  boardingCardActive: { borderColor: "#A8D96C", borderWidth: 1.5 },
  boardingInfo: { flex: 1 },
  boardingTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  boardingStatusDot: { width: 7, height: 7, borderRadius: 4 },
  boardingStatusTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C", letterSpacing: 0.6 },
  boardingBigTxt: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 3 },
  boardingSmallTxt: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginBottom: 14 },
  boardingCta: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#A8D96C", alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  boardingCtaTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  boardingEmoji: { fontSize: 50, marginLeft: 10 },

  // ── Section Header ──
  sectionRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginTop: 22, marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  sectionLink: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  // ── Service Chips ──
  chipsScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  chip: { alignItems: "center", gap: 8, width: 76 },
  chipIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
    elevation: 2,
  },
  chipLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },

  // ── Service Rows ──
  serviceRow: {
    backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8,
    borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    elevation: 1, borderWidth: 1, borderColor: "#E8F5E8",
  },
  serviceRowIcon: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  serviceRowInfo: { flex: 1 },
  serviceRowName: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 3 },
  serviceRowDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888" },
  serviceRowRight: { alignItems: "flex-end", gap: 6 },
  serviceRowPrice: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  serviceRowPriceNA: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#aaa" },
  bookBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  bookBtnTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // ── Vet Card ──
  vetCard: {
    backgroundColor: "#fff", borderRadius: 18, marginHorizontal: 16,
    elevation: 3, borderWidth: 1, borderColor: "#D4EDD4", overflow: "hidden",
  },
  vetHeader: {
    backgroundColor: "#0B3D2E", padding: 16,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  vetAvatarBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(168,217,108,0.15)",
    borderWidth: 2, borderColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  vetNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  vetName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  vetBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(168,217,108,0.2)",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20,
  },
  vetBadgeTxt: { fontSize: 9, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  vetDeg: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.8)", marginBottom: 6 },
  vetStars: { flexDirection: "row", alignItems: "center", gap: 2 },
  vetStarsTxt: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ccc", marginLeft: 4 },

  vetSpecRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  vetSpecChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  vetSpecTxt: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  vetInfoRow: {
    flexDirection: "row", gap: 8, padding: 14,
    borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  vetInfoChip: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 8,
  },
  vetInfoTxt: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  vetBookBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#A8D96C", margin: 14,
    borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16,
  },
  vetBookBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  // ── Explore All ──
  exploreBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16,
    borderRadius: 14, padding: 16,
    elevation: 1, borderWidth: 1, borderColor: "#D4EDD4",
  },
  exploreBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
