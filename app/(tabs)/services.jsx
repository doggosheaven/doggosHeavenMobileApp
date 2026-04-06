import { useEffect, useState, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, SectionList, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const SERVICE_EMOJIS = {
  Grooming: "✂️", Hostel: "🏠", "Day School": "🎓",
  "Day Care": "🌞", "Play School": "🎮", Veterinary: "🩺", "Dog Park": "🌳",
  Boarding: "🏠", "Day Boarding": "🌞", "Boarding Wallet (15 days)": "💳",
  "Day School (26 days)": "🎓", "Play School (26 days)": "🎮",
  "Grooming (small breed)": "✂️", "Grooming (large breed)": "✂️",
  "Full Grooming (small breed)": "🛁", "Full Grooming (large breed)": "🛁",
  "Oil Massage": "💆",
};

const FALLBACK_SERVICES = [
  { _id: "1", purpose: "Boarding", price: 900, halfdayprice: null, isSubscriptionAvailable: false, subscriptionPrice: 820, detail: "Overnight stay with meals & care" },
  { _id: "2", purpose: "Day Boarding", price: 600, halfdayprice: null, isSubscriptionAvailable: false, detail: "Full day supervised care & play" },
  { _id: "3", purpose: "Boarding Wallet (15 days)", price: 11500, halfdayprice: null, isSubscriptionAvailable: false, detail: "15-day boarding package at a great value" },
  { _id: "4", purpose: "Day School (26 days)", price: 13650, halfdayprice: null, isSubscriptionAvailable: false, detail: "26-day training & socializing program" },
  { _id: "5", purpose: "Play School (26 days)", price: 9650, halfdayprice: null, isSubscriptionAvailable: false, detail: "26-day fun activities & early training" },
  { _id: "6", purpose: "Grooming (small breed)", price: 800, halfdayprice: null, isSubscriptionAvailable: false, detail: "Bath, trim & nail clipping for small breeds" },
  { _id: "7", purpose: "Grooming (large breed)", price: 900, halfdayprice: null, isSubscriptionAvailable: false, detail: "Bath, trim & nail clipping for large breeds" },
  { _id: "8", purpose: "Full Grooming (small breed)", price: 1500, halfdayprice: null, isSubscriptionAvailable: false, detail: "Complete grooming package for small breeds" },
  { _id: "9", purpose: "Full Grooming (large breed)", price: 1600, halfdayprice: null, isSubscriptionAvailable: false, detail: "Complete grooming package for large breeds" },
  { _id: "10", purpose: "Oil Massage", price: 250, halfdayprice: null, isSubscriptionAvailable: false, detail: "Relaxing oil massage for your pet" },
];

const EXCLUDED = ["Buy Subscription", "Shop", "Inquiry"];

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadServices = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { token } = await getAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, {
        headers: { Authorization: token || "" },
      });
      const data = await res.json();
      if (data.success) {
        const filtered = data.visitTypes.filter((s) => !EXCLUDED.includes(s.purpose));
        setServices(filtered.length > 0 ? filtered : FALLBACK_SERVICES);
      } else {
        setServices(FALLBACK_SERVICES);
      }
    } catch (e) {
      console.log(e);
      setServices(FALLBACK_SERVICES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadServices(); }, []);
  const onRefresh = () => loadServices(true);

  // Group services by category
  const sections = useMemo(() => {
    const map = {};
    services.forEach((s) => {
      const cat = s.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return Object.entries(map).map(([title, data]) => ({ title, data }));
  }, [services]);

  const handleBook = (service) => {
    router.push({
      pathname: "/screens/bookingform",
      params: {
        serviceId: service._id,
        serviceName: service.purpose,
        serviceEmoji: service.emoji || "🐾",
        servicePrice: service.price || 0,
        serviceHalfPrice: service.halfdayprice || 0,
        serviceConsultPrice: service.consultationPricePvt || 0,
        serviceDescription: service.description || "",
        servicePriceTiers: service.priceTiers?.length ? encodeURIComponent(JSON.stringify(service.priceTiers)) : "",
      }
    });
  };

  const handleViewDetail = (service) => {
    router.push({
      pathname: "/screens/servicedetail",
      params: {
        serviceId: service._id,
        serviceName: service.purpose,
        serviceEmoji: service.emoji || SERVICE_EMOJIS[service.purpose] || "🐾",
        servicePrice: service.price || 0,
        serviceHalfPrice: service.halfdayprice || 0,
        serviceConsultPrice: service.consultationPricePvt || 0,
        serviceDescription: service.description || service.detail || "",
        servicePriceTiers: service.priceTiers?.length ? encodeURIComponent(JSON.stringify(service.priceTiers)) : "",
        serviceSubscriptionPrice: service.subscriptionPrice || 0,
        serviceCustomFields: service.customFields?.length ? encodeURIComponent(JSON.stringify(service.customFields)) : "",
        isSubscriptionAvailable: service.isSubscriptionAvailable ? "true" : "false",
      }
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Our Services" />
      {loading ? (
        <ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} />
      ) : (
        <SectionList
        sections={sections}
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
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item: service }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleViewDetail(service)} activeOpacity={0.88}>
            {/* Top Row */}
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{service.emoji || SERVICE_EMOJIS[service.purpose] || "🐾"}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.serviceName}>{service.purpose}</Text>
                <Text style={styles.serviceDetail}>{service.description || service.detail || "Professional pet care service"}</Text>
                {service.isSubscriptionAvailable && (
                  <View style={styles.subBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#3E7B27" />
                    <Text style={styles.subBadgeText}>Subscription Available</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A8D96C" />
            </View>

            <View style={styles.divider} />

            {/* Price + Button Row */}
            <View style={styles.bottomRow}>
              <View style={styles.priceSection}>
                {service.priceTiers?.length > 0 && service.priceTiers.map((t, i) => (
                  <View key={i} style={styles.priceChip}>
                    <Text style={styles.priceLabel}>{t.label}</Text>
                    <Text style={styles.priceValue}>₹{t.price}</Text>
                  </View>
                ))}
                {!service.priceTiers?.length && service.price ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>₹{service.price}</Text>
                  </View>
                ) : null}
                {!service.priceTiers?.length && service.halfdayprice ? (
                  <View style={styles.priceChip}>
                    <Text style={styles.priceLabel}>Half Day</Text>
                    <Text style={styles.priceValue}>₹{service.halfdayprice}</Text>
                  </View>
                ) : null}
                {!service.priceTiers?.length && !service.price && !service.halfdayprice && !service.consultationPricePvt && (
                  <Text style={styles.priceNA}>Price on request</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.reserveBtn}
                onPress={(e) => { e.stopPropagation?.(); handleBook(service); }}
                activeOpacity={0.8}
              >
                <Text style={styles.reserveBtnText}>Reserve</Text>
                <Ionicons name="arrow-forward" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {service.subscriptionPrice ? (
              <View style={styles.subscriptionRow}>
                <View style={styles.subscriptionLeft}>
                  <Ionicons name="checkmark-circle" size={14} color="#3E7B27" />
                  <Text style={styles.subscriptionLabel}>Subscription available</Text>
                </View>
                <Text style={styles.subscriptionPrice}>₹{service.subscriptionPrice}/day</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        />
      )}
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

  sectionHeader: {
    backgroundColor: "#F0F7F0", paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8, marginTop: 4,
  },
  sectionHeaderText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

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

  subscriptionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginTop: 10,
  },
  subscriptionLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  subscriptionLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  subscriptionPrice: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  customFieldsList: {
    marginTop: 8, backgroundColor: "#F8FFF8", borderRadius: 10,
    borderWidth: 1, borderColor: "#D4EDD4", overflow: "hidden",
  },
  customFieldItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  customFieldLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  customFieldValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", textAlign: "right", flex: 1 },
});
