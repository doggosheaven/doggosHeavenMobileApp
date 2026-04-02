import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

const COLLECTION_HOURS = [
  { day: "Monday - Friday", hours: "9:00 AM - 8:00 PM" },
  { day: "Saturday", hours: "9:00 AM - 6:00 PM" },
  { day: "Sunday", hours: "10:00 AM - 5:00 PM" },
  { day: "Public Holidays", hours: "Limited Hours" },
];

const BEFORE_COLLECTION = [
  "Wait for order confirmation email/SMS",
  "Bring valid photo identification",
  "Have order number/receipt ready",
];

const STORAGE_POLICY = [
  "Items held for maximum 30 days",
  "Perishable items: 7 days maximum",
  "Uncollected items may be disposed",
];

export default function ShippingDeliveryScreen() {
  return (
    <View style={styles.container}>
      <Header title="Shipping & Delivery" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <Ionicons name="bag-handle" size={36} color="#A8D96C" />
          <Text style={styles.headerTitle}>Shipping & Delivery Policy</Text>
          <Text style={styles.headerDesc}>
            Important information about product collection at our resort.
          </Text>
        </View>

        {/* Self-Collection Notice */}
        <View style={[styles.card, styles.noticeCard]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, styles.noticeIconBox]}>
              <Ionicons name="information-circle-outline" size={20} color="#B8860B" />
            </View>
            <Text style={[styles.cardTitle, styles.noticeTitle]}>Self-Collection Policy</Text>
          </View>
          <Text style={styles.noticeText}>
            Please note that our resort does not provide shipping or delivery services. All purchased items must be collected directly from our resort premises by the customer.
          </Text>
        </View>

        {/* Collection Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="location-outline" size={20} color="#0B3D2E" />
            </View>
            <Text style={styles.cardTitle}>Collection Details</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>Resort Reception Desk</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Required</Text>
            <Text style={styles.detailValue}>Valid ID and order confirmation</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Processing Time</Text>
            <Text style={styles.detailValue}>Items ready within 24–48 hours</Text>
          </View>
        </View>

        {/* Collection Hours */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="time-outline" size={20} color="#0B3D2E" />
            </View>
            <Text style={styles.cardTitle}>Collection Hours</Text>
          </View>
          {COLLECTION_HOURS.map((item, i) => (
            <View key={i} style={[styles.hoursRow, i < COLLECTION_HOURS.length - 1 && styles.hoursRowBorder]}>
              <Text style={styles.hoursDay}>{item.day}</Text>
              <Text style={styles.hoursTime}>{item.hours}</Text>
            </View>
          ))}
        </View>

        {/* Important Guidelines */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0B3D2E" />
            </View>
            <Text style={styles.cardTitle}>Before Collection</Text>
          </View>
          {BEFORE_COLLECTION.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Ionicons name="archive-outline" size={20} color="#0B3D2E" />
            </View>
            <Text style={styles.cardTitle}>Storage Policy</Text>
          </View>
          {STORAGE_POLICY.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need Assistance?</Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#A8D96C" />
            <View style={styles.contactInfo}>
              <Text style={styles.contactValue}>+91 8448461071</Text>
              <Text style={styles.contactNote}>Available during collection hours</Text>
            </View>
          </View>
          <View style={styles.contactDivider} />
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color="#A8D96C" />
            <View style={styles.contactInfo}>
              <Text style={styles.contactValue}>care@doggosheaven.com</Text>
              <Text style={styles.contactNote}>Response within 24 hours</Text>
            </View>
          </View>
          <Text style={styles.thankYou}>
            Thank you for choosing our resort. We appreciate your understanding of our collection policy.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  headerCard: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 24,
    alignItems: "center", marginBottom: 16, elevation: 3,
  },
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: 10, marginBottom: 12 },
  headerDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa", textAlign: "center", lineHeight: 20 },

  card: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginBottom: 10, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  noticeCard: { borderColor: "#FFE082", borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center",
  },
  noticeIconBox: { backgroundColor: "#FFF9E6" },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  noticeTitle: { color: "#B8860B" },
  noticeText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#7A5C00", lineHeight: 20 },

  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  detailLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  detailValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", flex: 1.5, textAlign: "right" },

  hoursRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 10,
  },
  hoursRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F7F0" },
  hoursDay: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333" },
  hoursTime: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 8, paddingRight: 4 },
  bullet: { fontSize: 13, color: "#3E7B27", marginTop: 1 },
  bulletText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20, flex: 1 },

  contactCard: {
    backgroundColor: "#1A5C3A", borderRadius: 16, padding: 18, marginTop: 6,
  },
  contactTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 14, textAlign: "center" },
  contactRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 4 },
  contactInfo: { flex: 1 },
  contactValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  contactNote: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.6)", marginTop: 2 },
  contactDivider: { height: 1, backgroundColor: "rgba(168,217,108,0.2)", marginVertical: 12 },
  thankYou: {
    fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)",
    textAlign: "center", marginTop: 14, lineHeight: 18,
  },
});
