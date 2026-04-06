import { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const SERVICE_ICONS = {
  Grooming: "✂️", Hostel: "🏠", "Day School": "🎓",
  "Day Care": "🌞", "Play School": "🎮", Veterinary: "🩺", "Dog Park": "🌳",
  Boarding: "🏠", "Day Boarding": "🌞", "Boarding Wallet (15 days)": "💳",
  "Day School (26 days)": "🎓", "Play School (26 days)": "🎮",
  "Grooming (small breed)": "✂️", "Grooming (large breed)": "✂️",
  "Full Grooming (small breed)": "🛁", "Full Grooming (large breed)": "🛁",
  "Oil Massage": "💆",
};

const HEALTH_SERVICES = [
  { id: "h1", name: "24×7 Medical Services", emoji: "🏥", desc: "Round-the-clock medical care for your pet",  color: "#0B3D2E", bg: "#D4EDD4", border: "#A8D96C" },
  { id: "h2", name: "Vaccination",           emoji: "💉", desc: "Complete vaccination schedule & records",    color: "#1A5C3A", bg: "#E8F5E8", border: "#D4EDD4" },
  { id: "h3", name: "Deworming",             emoji: "🔬", desc: "Regular deworming for a healthy pet",        color: "#3E7B27", bg: "#F0F7F0", border: "#D4EDD4" },
  { id: "h4", name: "Castration",            emoji: "⚕️", desc: "Safe & professional castration procedure",   color: "#0B3D2E", bg: "#E8F5E8", border: "#A8D96C" },
  { id: "h5", name: "Surgical Treatment",    emoji: "🩺", desc: "Expert surgical care when needed",           color: "#1A5C3A", bg: "#D4EDD4", border: "#D4EDD4" },
  { id: "h6", name: "Grooming",              emoji: "✂️", desc: "Bath, trim, nail clipping & ear cleaning",   color: "#3E7B27", bg: "#E8F5E8", border: "#D4EDD4" },
  { id: "h7", name: "Emergency Services",    emoji: "🚨", desc: "Immediate care for urgent situations",        color: "#0B3D2E", bg: "#D4EDD4", border: "#A8D96C" },
];

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
  const [activeBoarding, setActiveBoarding] = useState(null);
  const [boardingHistory, setBoardingHistory] = useState([]);

  const loadData = async () => {
    try {
      const { user: savedUser, token } = await getAuth();
      setUser(savedUser);
      const [svcRes, boardRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, { headers: { Authorization: token || "" } }),
        fetch(`${BASE_URL}/api/v1/boarding-subscription/dashboard`, { headers: { Authorization: token || "" } }),
      ]);
      const svcData = await svcRes.json();
      const boardData = await boardRes.json();
      if (svcData.success) {
        const filtered = svcData.visitTypes.filter((s) => !EXCLUDED.includes(s.purpose));
        setServices(filtered.length > 0 ? filtered : FALLBACK_SERVICES);
      }
      if (boardData.success) {
        setActiveBoarding(boardData.dashboard?.activeBoarding || null);
        setBoardingHistory(boardData.dashboard?.bookings || []);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useFocusEffect(
    useCallback(() => {
      getAuth().then(({ user: u }) => setUser(u));
    }, [])
  );
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleViewAll = () => router.push("/(tabs)/services");

  const handleBookService = (service) => {
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

  const handleViewServiceDetail = (service) => {
    router.push({
      pathname: "/screens/servicedetail",
      params: {
        serviceId: service._id,
        serviceName: service.purpose,
        serviceEmoji: service.emoji || SERVICE_ICONS[service.purpose] || "🐾",
        servicePrice: service.price || 0,
        serviceHalfPrice: service.halfdayprice || 0,
        serviceConsultPrice: service.consultationPricePvt || 0,
        serviceDescription: service.description || "",
        servicePriceTiers: service.priceTiers?.length ? encodeURIComponent(JSON.stringify(service.priceTiers)) : "",
        serviceSubscriptionPrice: service.subscriptionPrice || 0,
        serviceCustomFields: service.customFields?.length ? encodeURIComponent(JSON.stringify(service.customFields)) : "",
        isSubscriptionAvailable: service.isSubscriptionAvailable ? "true" : "false",
      },
    });
  };

  const handleHealthService = (svc) => {
    const match = services.find(
      (s) => s.purpose.toLowerCase().includes(svc.name.toLowerCase()) ||
             svc.name.toLowerCase().includes(s.purpose.toLowerCase())
    );
    router.push({
      pathname: "/screens/bookingform",
      params: {
        serviceId: match?._id || "",
        serviceName: svc.name,
        serviceEmoji: svc.emoji,
        servicePrice: match?.price || "",
        serviceHalfPrice: match?.halfdayprice || "",
        serviceConsultPrice: match?.consultationPricePvt || "",
        serviceDescription: svc.desc,
        servicePriceTiers: match?.priceTiers?.length
          ? encodeURIComponent(JSON.stringify(match.priceTiers))
          : "",
      },
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
          <TouchableOpacity
            style={styles.pawCircle}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.pawProfileImg} />
            ) : (
              <Ionicons name="paw" size={32} color="#A8D96C" />
            )}
          </TouchableOpacity>
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
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/screens/walletscreen")} activeOpacity={0.8}>
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>💳</Text>
            </View>
            <Text style={styles.quickLabel}>My{"\n"}Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/screens/boardingsubscription")} activeOpacity={0.8}>
            <View style={styles.quickIconBox}>
              <Text style={styles.quickIcon}>🏠</Text>
            </View>
            <Text style={styles.quickLabel}>Boarding{"\n"}Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Boarding Status Card */}
        <TouchableOpacity style={activeBoarding ? styles.boardingActiveCard : styles.boardingBanner} onPress={() => router.push("/screens/boardingsubscription")} activeOpacity={0.88}>
          {activeBoarding ? (
            <>
              <View style={styles.boardingBannerLeft}>
                <View style={styles.boardingBadge}>
                  <Text style={styles.boardingBadgeText}>● BOARDING ACTIVE</Text>
                </View>
                <Text style={styles.boardingTitle}>{activeBoarding.numberOfPets} Pet{activeBoarding.numberOfPets > 1 ? "s" : ""} Boarded</Text>
                <Text style={styles.boardingPrice}>₹{activeBoarding.dailyCharge}/day <Text style={styles.boardingPriceSmall}>· {activeBoarding.daysRemaining} days left</Text></Text>
                <View style={styles.boardingSubscribeBtn}>
                  <Text style={styles.boardingSubscribeBtnText}>View Details →</Text>
                </View>
              </View>
              <Text style={styles.boardingEmoji}>🏡</Text>
            </>
          ) : boardingHistory.length > 0 ? (
            <>
              <View style={styles.boardingBannerLeft}>
                <View style={styles.boardingBadge}>
                  <Text style={styles.boardingBadgeText}>🐾 BOARDING HISTORY</Text>
                </View>
                <Text style={styles.boardingTitle}>Last Boarding</Text>
                <Text style={styles.boardingPrice}>
                  {boardingHistory[0]?.status?.toUpperCase()}
                  <Text style={styles.boardingPriceSmall}> · {boardingHistory[0]?.numberOfPets} pet{boardingHistory[0]?.numberOfPets > 1 ? "s" : ""}</Text>
                </Text>
                <View style={styles.boardingSubscribeBtn}>
                  <Text style={styles.boardingSubscribeBtnText}>Board Again →</Text>
                </View>
              </View>
              <Text style={styles.boardingEmoji}>🏡</Text>
            </>
          ) : (
            <>
              <View style={styles.boardingBannerLeft}>
                <View style={styles.boardingBadge}>
                  <Text style={styles.boardingBadgeText}>🐾 SUBSCRIPTION PLAN</Text>
                </View>
                <Text style={styles.boardingTitle}>15-Day Boarding Plan</Text>
                <Text style={styles.boardingPrice}>₹11,500 <Text style={styles.boardingPriceSmall}>· ₹766/day per pet</Text></Text>
                <View style={styles.boardingSubscribeBtn}>
                  <Text style={styles.boardingSubscribeBtnText}>Subscribe Now →</Text>
                </View>
              </View>
              <Text style={styles.boardingEmoji}>🏡</Text>
            </>
          )}
        </TouchableOpacity>

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

        {/* Health & Medical Services */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Health & Medical</Text>
        </View>
        <View style={styles.healthGrid}>
          {HEALTH_SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.id}
              style={[styles.healthCard, { borderColor: svc.border }]}
              onPress={() => handleHealthService(svc)}
              activeOpacity={0.82}
            >
              <View style={styles.healthCardTop}>
                <View style={[styles.healthIconBox, { backgroundColor: svc.bg }]}>
                  <Text style={styles.healthEmoji}>{svc.emoji}</Text>
                </View>
                <Text style={styles.healthName} numberOfLines={2}>{svc.name}</Text>
                <Text style={styles.healthDesc} numberOfLines={2}>{svc.desc}</Text>
              </View>
              <View style={[styles.healthBookBtn, { backgroundColor: svc.color }]}>
                <Text style={styles.healthBookTxt}>Book Now</Text>
                <Ionicons name="arrow-forward" size={12} color="#A8D96C" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Doctor Section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Our Veterinarian</Text>
        </View>
        <TouchableOpacity
          style={styles.doctorCard}
          activeOpacity={0.88}
          onPress={() => {
            const vetService = services.find((s) =>
              s.purpose.toLowerCase().includes("vet") ||
              s.purpose.toLowerCase().includes("consult")
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
          {/* Dark header banner */}
          <View style={styles.doctorBanner}>
            <View style={styles.doctorBannerLeft}>
              <View style={styles.doctorAvatarLarge}>
                <Text style={{ fontSize: 34 }}>👨⚕️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.doctorVerifiedRow}>
                  <Text style={styles.doctorNameWhite}>Dr. Bhuvnesh Ahlawat</Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#A8D96C" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                <Text style={styles.doctorDegWhite}>B.V.Sc & A.H. — Veterinarian</Text>
                <View style={styles.doctorRatingRow}>
                  {[1,2,3,4,5].map((s) => (
                    <Ionicons key={s} name="star" size={12} color="#A8D96C" />
                  ))}
                  <Text style={styles.doctorRatingText}>5.0 • Expert Vet</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Fee + timing row */}
          <View style={styles.doctorMetaRow}>
            <View style={styles.doctorMetaItem}>
              <Ionicons name="pricetag-outline" size={15} color="#0B3D2E" />
              <View>
                <Text style={styles.doctorMetaLabel}>Consultation</Text>
                <Text style={styles.doctorMetaValue}>₹500</Text>
              </View>
            </View>
            <View style={styles.doctorMetaSep} />
            <View style={styles.doctorMetaItem}>
              <Ionicons name="time-outline" size={15} color="#0B3D2E" />
              <View>
                <Text style={styles.doctorMetaLabel}>Working Hours</Text>
                <Text style={styles.doctorMetaValue}>10 AM – 9 PM</Text>
              </View>
            </View>
            <View style={styles.doctorMetaSep} />
            <View style={styles.doctorMetaItem}>
              <Ionicons name="location-outline" size={15} color="#0B3D2E" />
              <View>
                <Text style={styles.doctorMetaLabel}>Location</Text>
                <Text style={styles.doctorMetaValue}>Jhajjar</Text>
              </View>
            </View>
          </View>

          {/* Skills */}
          <View style={styles.doctorSkillsRow}>
            {["Surgery","Vaccination","Dermatology","OPD","Diagnosis"].map((s) => (
              <View key={s} style={styles.doctorSkillChip}>
                <Text style={styles.doctorSkillText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Book button */}
          <View style={styles.doctorBookBtn}>
            <Ionicons name="calendar-outline" size={16} color="#0B3D2E" />
            <Text style={styles.doctorBookBtnText}>Book Consultation</Text>
            <Ionicons name="arrow-forward" size={15} color="#0B3D2E" />
          </View>
        </TouchableOpacity>

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
            <TouchableOpacity key={service._id} style={styles.serviceCard} onPress={() => handleViewServiceDetail(service)} activeOpacity={0.88}>
              {/* Top Row */}
              <View style={styles.cardTop}>
                <View style={styles.serviceIconBox}>
                  <Text style={styles.serviceIcon}>{service.emoji || SERVICE_ICONS[service.purpose] || "🐾"}</Text>
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.purpose}</Text>
                  <Text style={styles.serviceDetail}>{service.description || service.detail || "Professional pet care"}</Text>
                  {service.isSubscriptionAvailable && (
                    <View style={styles.subBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#3E7B27" />
                      <Text style={styles.subBadgeText}>Subscription Available</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A8D96C" />
              </View>

              <View style={styles.divider} />

              {/* Price + Button Row */}
              <View style={styles.bottomRow}>
                <View style={styles.priceSection}>
                  {service.priceTiers?.length > 0 ? service.priceTiers.map((t, i) => (
                    <View key={i} style={styles.priceChip}>
                      <Text style={styles.priceLabel}>{t.label}</Text>
                      <Text style={styles.priceValue}>₹{t.price}</Text>
                    </View>
                  )) : service.price ? (
                    <View style={styles.priceChip}>
                      <Text style={styles.priceLabel}>Price</Text>
                      <Text style={styles.priceValue}>₹{service.price}</Text>
                    </View>
                  ) : service.consultationPricePvt ? (
                    <View style={styles.priceChip}>
                      <Text style={styles.priceLabel}>Consult</Text>
                      <Text style={styles.priceValue}>₹{service.consultationPricePvt}</Text>
                    </View>
                  ) : (
                    <Text style={styles.servicePriceNA}>Price on request</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.reserveBtn}
                  onPress={(e) => { e.stopPropagation?.(); handleBookService(service); }}
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
                    <Text style={styles.subscriptionLabel}>Hostel Subscription available</Text>
                  </View>
                  <Text style={styles.subscriptionPrice}>₹{service.subscriptionPrice}/day</Text>
                </View>
              ) : null}
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
    overflow: "hidden",
  },
  pawProfileImg: {
    width: 60, height: 60, borderRadius: 30,
  },
  pawEmoji: { fontSize: 30, color: "#A8D96C" },

  quickRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 10,
    alignItems: "center", elevation: 2,
    borderWidth: 1.5, borderColor: "#A8D96C",
  },
  quickIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#0B3D2E",
    justifyContent: "center", alignItems: "center", marginBottom: 6,
  },
  quickIcon: { fontSize: 18 },
  quickLabel: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center", lineHeight: 14 },

  // Boarding Plan Banner
  boardingActiveCard: {
    backgroundColor: "#1A5C3A", borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, elevation: 4,
    borderWidth: 1.5, borderColor: "#A8D96C",
  },
  boardingBanner: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 16, elevation: 4,
    borderWidth: 1.5, borderColor: "#A8D96C",
  },
  boardingBannerLeft: { flex: 1 },
  boardingBadge: {
    backgroundColor: "rgba(168,217,108,0.2)", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8,
  },
  boardingBadgeText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  boardingTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  boardingPrice: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C", marginBottom: 14 },
  boardingPriceSmall: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#aaa" },
  boardingSubscribeBtn: {
    backgroundColor: "#A8D96C", alignSelf: "flex-start",
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
  },
  boardingSubscribeBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  boardingEmoji: { fontSize: 60, marginLeft: 8 },

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
    elevation: 2, borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  serviceIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "#0B3D2E",
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  serviceIcon: { fontSize: 26 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  serviceDetail: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 6 },
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
    backgroundColor: "#E8F5E8", borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: "center",
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  priceLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#3E7B27" },
  priceValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  servicePriceNA: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
  reserveBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#3E7B27", paddingHorizontal: 16, paddingVertical: 10,
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

  viewAllCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 18,
    alignItems: "center", elevation: 2,
  },
  viewAllCardText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  viewAllCardCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  // Health & Medical
  healthGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20,
  },
  healthCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16,
    elevation: 2, borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "space-between",
    minHeight: 180,
  },
  healthCardTop: {
    flex: 1, padding: 14, paddingBottom: 10,
  },
  healthIconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  healthEmoji: { fontSize: 24 },
  healthName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4, lineHeight: 18 },
  healthDesc: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#3E7B27", lineHeight: 14 },
  healthBookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11,
  },
  healthBookTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Doctor Card
  doctorCard: {
    backgroundColor: "#fff", borderRadius: 20,
    marginBottom: 20, elevation: 4,
    borderWidth: 1.5, borderColor: "#A8D96C",
    overflow: "hidden",
  },
  doctorBanner: {
    backgroundColor: "#0B3D2E", padding: 18,
  },
  doctorBannerLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  doctorAvatarLarge: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "rgba(168,217,108,0.15)",
    borderWidth: 2, borderColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
  },
  doctorVerifiedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  doctorNameWhite: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff" },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(168,217,108,0.2)",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  verifiedText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  doctorDegWhite: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 6 },
  doctorRatingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  doctorRatingText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ccc", marginLeft: 4 },

  doctorMetaRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  doctorMetaItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  doctorMetaSep: { width: 1, height: 32, backgroundColor: "#E8F5E8" },
  doctorMetaLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#888" },
  doctorMetaValue: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  doctorSkillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  doctorSkillChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  doctorSkillText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#0B3D2E" },

  doctorBookBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#A8D96C", margin: 14, marginTop: 4,
    borderRadius: 14, paddingVertical: 13,
  },
  doctorBookBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
