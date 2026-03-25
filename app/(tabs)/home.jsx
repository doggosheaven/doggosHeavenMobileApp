import { useEffect, useState, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const SERVICE_ICONS = {
  Grooming: "✂️", Hostel: "🏠", "Day School": "🎓",
  "Day Care": "🌞", "Play School": "🎮", Veterinary: "🩺", "Dog Park": "🌳",
};

const FALLBACK_SERVICES = [
  { _id: "1", purpose: "Grooming", price: 900, halfdayprice: null, isSubscriptionAvailable: true, detail: "Bath, trim, nail clipping & ear cleaning" },
  { _id: "2", purpose: "Hostel", price: 1000, halfdayprice: 500, isSubscriptionAvailable: true, detail: "Overnight stay with meals & care" },
  { _id: "3", purpose: "Day School", price: 350, halfdayprice: null, isSubscriptionAvailable: false, detail: "Training & socializing for your pet" },
  { _id: "4", purpose: "Day Care", price: 600, halfdayprice: null, isSubscriptionAvailable: false, detail: "Full day supervised care & play" },
  { _id: "5", purpose: "Play School", price: 500, halfdayprice: null, isSubscriptionAvailable: true, detail: "Fun activities & early training" },
  { _id: "6", purpose: "Veterinary", price: null, halfdayprice: null, consultationPricePvt: 400, isSubscriptionAvailable: false, detail: "Expert vet consultation & checkup" },
  { _id: "7", purpose: "Dog Park", price: 667, halfdayprice: null, isSubscriptionAvailable: false, detail: "Open play area for your dog" },
];

const EXCLUDED = ["Buy Subscription", "Shop", "Inquiry"];

export default function HomeScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const servicesY = useRef(0);
  const [user, setUser] = useState(null);
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { user: savedUser, token } = await getAuth();
      setUser(savedUser);
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) {
        const filtered = data.visitTypes.filter((s) => !EXCLUDED.includes(s.purpose));
        setServices(filtered.length > 0 ? filtered : FALLBACK_SERVICES);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleViewAll = () => router.push("/(tabs)/services");

  const handleBookService = (service) => {
    router.push({
      pathname: "/(tabs)/bookings",
      params: { serviceId: service._id, serviceName: service.purpose }
    });
  };

  const featuredServices = services.slice(0, 3);

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeGreeting}>Welcome back 👋</Text>
            <Text style={styles.userName}>{user?.fullName || "Pet Parent"}</Text>
            <Text style={styles.welcomeSub}>Ready to care for your furry friend?</Text>
          </View>
          <View style={styles.pawCircle}>
            <Text style={styles.pawEmoji}>🐾</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/bookings")} activeOpacity={0.8}>
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>📅</Text>
            </View>
            <Text style={styles.quickLabel}>My{"\n"}Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/Pet/PetForm")} activeOpacity={0.8}>
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>➕</Text>
            </View>
            <Text style={styles.quickLabel}>Add{"\n"}Pet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/(tabs)/bookings")} activeOpacity={0.8}>
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>📋</Text>
            </View>
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerLeft}>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>🔥 LIMITED TIME</Text>
            </View>
            <Text style={styles.bannerDiscount}>15% OFF</Text>
            <Text style={styles.bannerSub}>On all grooming services</Text>
            <TouchableOpacity style={styles.bannerBtn} onPress={handleViewAll}>
              <Text style={styles.bannerBtnText}>Book Now →</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerEmoji}>🐕</Text>
        </View>

        {/* Services Section */}
        <View
          style={styles.sectionRow}
          onLayout={(e) => { servicesY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionTitle}>Our Services</Text>
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.viewAllBtn}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesGrid}>
          {featuredServices.map((service) => (
            <TouchableOpacity
              key={service._id}
              style={styles.serviceCard}
              activeOpacity={0.8}
              onPress={() => handleBookService(service)}
            >
              <View style={styles.serviceIconBox}>
                <Text style={styles.serviceIcon}>{SERVICE_ICONS[service.purpose] || "🐾"}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.purpose}</Text>
                <Text style={styles.serviceDetail}>{service.detail || "Professional pet care"}</Text>
                {service.price ? (
                  <Text style={styles.servicePrice}>Starting ₹{service.price}</Text>
                ) : service.consultationPricePvt ? (
                  <Text style={styles.servicePrice}>Consult ₹{service.consultationPricePvt}</Text>
                ) : (
                  <Text style={styles.servicePriceNA}>Price on request</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.viewAllCard} onPress={handleViewAll} activeOpacity={0.8}>
            <Text style={styles.viewAllCardText}>View All Services</Text>
            <Text style={styles.viewAllCardCount}>{services.length} services available</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  welcomeCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, elevation: 3,
  },
  welcomeLeft: { flex: 1 },
  welcomeGreeting: { fontSize: 12, color: "#A8D96C", fontFamily: "Inter_400Regular", marginBottom: 4 },
  userName: { fontSize: 22, color: "#fff", fontFamily: "Poppins_700Bold", marginBottom: 4 },
  welcomeSub: { fontSize: 12, color: "#aaa", fontFamily: "Inter_400Regular" },
  pawCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#1A5C3A",
    justifyContent: "center", alignItems: "center",
  },
  pawEmoji: { fontSize: 30 },

  quickRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14,
    alignItems: "center", elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  quickIconBox: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center", marginBottom: 8,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center", lineHeight: 16 },

  banner: {
    backgroundColor: "#1A5C3A", borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20, elevation: 3,
  },
  bannerLeft: { flex: 1 },
  bannerBadge: {
    backgroundColor: "rgba(168,217,108,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8,
  },
  bannerBadgeText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  bannerDiscount: { fontSize: 32, fontFamily: "Poppins_700Bold", color: "#fff", lineHeight: 36 },
  bannerSub: { fontSize: 12, color: "#aaa", fontFamily: "Inter_400Regular", marginBottom: 12 },
  bannerBtn: {
    backgroundColor: "#A8D96C", alignSelf: "flex-start",
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  bannerBtnText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  bannerEmoji: { fontSize: 56, marginLeft: 8 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  viewAllBtn: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  servicesGrid: { gap: 10 },
  serviceCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  serviceIconBox: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  serviceIcon: { fontSize: 24 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  serviceDetail: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 4 },
  servicePrice: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  servicePriceNA: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },

  viewAllCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 18,
    alignItems: "center", elevation: 2,
  },
  viewAllCardText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  viewAllCardCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },
});
