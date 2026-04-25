import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const WHAT_YOU_GET = {
  Grooming:     ["Bath & blow dry", "Nail clipping", "Ear cleaning", "Coat trimming", "Teeth brushing"],
  Hostel:       ["Overnight stay", "Meals included", "24×7 supervision", "Play time", "Health monitoring"],
  "Day Care":   ["Full day care", "Supervised play", "Meals & snacks", "Nap time", "Health check"],
  "Day School": ["Training sessions", "Socializing", "Meals included", "Progress updates", "Expert trainers"],
  "Play School":["Fun activities", "Early training", "Socializing", "Meals included", "Expert care"],
  Veterinary:   ["Expert consultation", "Health checkup", "Diagnosis & advice", "Prescription", "Follow-up support"],
  "Dog Park":   ["Open play area", "Supervised play", "Socializing", "Fresh water", "Safe environment"],
};

const SERVICE_COLORS = {
  Grooming: "#1A5C3A", Hostel: "#0B3D2E", "Day Care": "#3E7B27",
  "Day School": "#1A5C3A", "Play School": "#0B3D2E", Veterinary: "#C62828", "Dog Park": "#3E7B27",
};

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const {
    serviceId, serviceName, serviceEmoji,
    servicePrice, serviceHalfPrice, serviceConsultPrice,
    serviceDescription, servicePriceTiers,
    serviceSubscriptionPrice, serviceCustomFields,
    isSubscriptionAvailable,
  } = params;

  const priceTiers = servicePriceTiers ? JSON.parse(decodeURIComponent(servicePriceTiers)) : [];
  const customFields = serviceCustomFields ? JSON.parse(decodeURIComponent(serviceCustomFields)) : [];
  const accentColor = SERVICE_COLORS[serviceName] || "#0B3D2E";
  const features = WHAT_YOU_GET[serviceName] || [];

  const handleBook = () => {
    router.push({
      pathname: "/screens/bookingform",
      params: {
        serviceId, serviceName,
        serviceEmoji: serviceEmoji || "🐾",
        servicePrice: servicePrice || 0,
        serviceHalfPrice: serviceHalfPrice || 0,
        serviceConsultPrice: serviceConsultPrice || 0,
        serviceDescription: serviceDescription || "",
        servicePriceTiers: servicePriceTiers || "",
      },
    });
  };

  return (
    <View style={s.container}>
      {/* Header — same as totalvisits */}
      <View style={[s.header, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{serviceEmoji || "🐾"}  {serviceName}</Text>
          {serviceDescription ? <Text style={s.headerSub} numberOfLines={1}>{serviceDescription}</Text> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Pricing */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>💰 Pricing</Text>
          <View style={s.priceGrid}>
            {priceTiers.length > 0 ? priceTiers.map((t, i) => (
              <View key={i} style={s.priceCard}>
                <Text style={s.priceCardLabel}>{t.label}</Text>
                <Text style={s.priceCardValue}>₹{t.price}</Text>
              </View>
            )) : (
              <>
                {Number(servicePrice) > 0 && (
                  <View style={s.priceCard}>
                    <Text style={s.priceCardLabel}>Per Session</Text>
                    <Text style={s.priceCardValue}>₹{servicePrice}</Text>
                  </View>
                )}
                {Number(serviceHalfPrice) > 0 && (
                  <View style={s.priceCard}>
                    <Text style={s.priceCardLabel}>Half Day</Text>
                    <Text style={s.priceCardValue}>₹{serviceHalfPrice}</Text>
                  </View>
                )}
                {Number(serviceConsultPrice) > 0 && (
                  <View style={s.priceCard}>
                    <Text style={s.priceCardLabel}>Consultation</Text>
                    <Text style={s.priceCardValue}>₹{serviceConsultPrice}</Text>
                  </View>
                )}
                {!Number(servicePrice) && !Number(serviceHalfPrice) && !Number(serviceConsultPrice) && (
                  <Text style={s.priceNA}>Price on request — contact us</Text>
                )}
              </>
            )}
          </View>

          {Number(serviceSubscriptionPrice) > 0 && (
            <View style={s.subRow}>
              <Ionicons name="checkmark-circle" size={16} color="#3E7B27" />
              <Text style={s.subRowText}>Subscription available at ₹{serviceSubscriptionPrice}/day</Text>
            </View>
          )}
          {isSubscriptionAvailable === "true" && !Number(serviceSubscriptionPrice) && (
            <View style={s.subRow}>
              <Ionicons name="checkmark-circle" size={16} color="#3E7B27" />
              <Text style={s.subRowText}>Subscription plans available</Text>
            </View>
          )}
        </View>

        {/* What you get */}
        {features.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>✅ What's Included</Text>
            {features.map((f, i) => (
              <View key={i} style={s.featureRow}>
                <View style={[s.featureDot, { backgroundColor: accentColor }]} />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Custom fields */}
        {customFields.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📋 Details</Text>
            {customFields.map((f, i) => (
              <View key={i} style={[s.cfRow, i === customFields.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.cfLabel}>{f.label}</Text>
                {f.value ? <Text style={s.cfValue}>{f.value}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* Why choose us */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🐾 Why Doggos Heaven?</Text>
          {[
            "Experienced & certified staff",
            "Safe & hygienic environment",
            "Real-time updates to pet parents",
            "Affordable pricing with no hidden charges",
          ].map((item, i) => (
            <View key={i} style={s.featureRow}>
              <Ionicons name="paw" size={14} color={accentColor} />
              <Text style={s.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Book Button */}
      <View style={s.stickyBar}>
        <View style={s.stickyPrice}>
          {Number(servicePrice) > 0 ? (
            <>
              <Text style={s.stickyPriceLabel}>Starting from</Text>
              <Text style={s.stickyPriceValue}>₹{servicePrice}</Text>
            </>
          ) : (
            <Text style={s.stickyPriceLabel}>Contact for pricing</Text>
          )}
        </View>
        <TouchableOpacity style={[s.bookBtn, { backgroundColor: accentColor }]} onPress={handleBook} activeOpacity={0.85}>
          <Ionicons name="calendar" size={18} color="#A8D96C" />
          <Text style={s.bookBtnText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  header: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginTop: 2 },

  body: { padding: 16 },

  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },

  priceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceCard: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    alignItems: "center", minWidth: 100, flex: 1,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  priceCardLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginBottom: 4 },
  priceCardValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  priceNA: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },

  subRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10, marginTop: 12,
  },
  subRowText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27", flex: 1 },

  featureRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  featureDot: { width: 8, height: 8, borderRadius: 4 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333", flex: 1 },

  cfRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E8F5E8",
  },
  cfLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  cfValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27", textAlign: "right", flex: 1 },

  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#D4EDD4", elevation: 10,
  },
  stickyPrice: {},
  stickyPriceLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888" },
  stickyPriceValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  bookBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16,
  },
  bookBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
});
