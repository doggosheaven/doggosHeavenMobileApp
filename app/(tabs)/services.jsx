import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const SERVICE_ICONS = {
  Grooming: "cut-outline", Hostel: "home-outline", "Day School": "school-outline",
  "Day Care": "sunny-outline", "Play School": "game-controller-outline",
  Veterinary: "medkit-outline", "Dog Park": "leaf-outline",
};
const SERVICE_EMOJIS = {
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

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState(FALLBACK_SERVICES);
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = async () => {
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) {
        const filtered = data.visitTypes.filter((s) => !EXCLUDED.includes(s.purpose));
        if (filtered.length > 0) setServices(filtered);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadServices(); }, []);
  const onRefresh = () => { setRefreshing(true); loadServices(); };

  const handleBook = (service) => {
    router.push({
      pathname: "/(tabs)/bookings",
      params: { serviceId: service._id, serviceName: service.purpose }
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Our Services" />
      <FlatList
        data={services}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0B3D2E" />}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Happy Pets, Happy You 🐾</Text>
            <Text style={styles.headerSub}>Choose from our wide range of services for your furry friend</Text>
          </View>
        }
        renderItem={({ item: service }) => (
          <View style={styles.card}>
            {/* Top Row */}
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{SERVICE_EMOJIS[service.purpose] || "🐾"}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.serviceName}>{service.purpose}</Text>
                <Text style={styles.serviceDetail}>{service.detail || "Professional pet care service"}</Text>
                {service.isSubscriptionAvailable && (
                  <View style={styles.subBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#3E7B27" />
                    <Text style={styles.subBadgeText}>Subscription Available</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Price + Button Row */}
            <View style={styles.bottomRow}>
              <View style={styles.priceSection}>
                {service.price ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceLabel}>Full Day</Text>
                    <Text style={styles.priceValue}>₹{service.price}</Text>
                  </View>
                ) : null}
                {service.halfdayprice ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceLabel}>Half Day</Text>
                    <Text style={styles.priceValue}>₹{service.halfdayprice}</Text>
                  </View>
                ) : null}
                {service.consultationPricePvt ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceLabel}>Consult</Text>
                    <Text style={styles.priceValue}>₹{service.consultationPricePvt}</Text>
                  </View>
                ) : null}
                {!service.price && !service.halfdayprice && !service.consultationPricePvt && (
                  <Text style={styles.priceNA}>Price on request</Text>
                )}
              </View>
              <TouchableOpacity style={styles.reserveBtn} onPress={() => handleBook(service)} activeOpacity={0.8}>
                <Text style={styles.reserveBtnText}>Reserve</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  list: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 20, marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  iconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  iconEmoji: { fontSize: 26 },
  cardInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  serviceDetail: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 6 },
  subBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#E8F5E8", alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  subBadgeText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  divider: { height: 1, backgroundColor: "#E8F5E8", marginBottom: 12 },

  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceSection: { flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 },
  priceChip: {
    backgroundColor: "#F0F7F0", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: "center",
  },
  priceLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#666" },
  priceValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  priceNA: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },

  reserveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0B3D2E", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20,
  },
  reserveBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#fff" },
});
