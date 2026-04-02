import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

const SECTIONS = [
  {
    icon: "close-circle-outline",
    title: "Cancellation Policy",
    bullets: [
      "Cancellations will only be considered if the request is made 4 days after placing the order OR if the service you paid for is not availed.",
      "Cancellation requests for products may not be entertained if the orders have been communicated to sellers/merchants and they have initiated the process of shipping, or the product is out for delivery. In such an event, you may choose to reject the product at the doorstep.",
      "DOGGOS HEAVEN PRIVATE LIMITED does not accept cancellation requests for perishable items like flowers, eatables, etc. However, a refund/replacement can be made if the user establishes that the quality of the product delivered is not good or if the bought service is not availed.",
      "DOGGOS HEAVEN PRIVATE LIMITED does not accept cancellation requests for perishable items like toys, unsealed shampoos, etc.",
    ],
  },
  {
    icon: "cube-outline",
    title: "Damaged or Defective Products",
    content: "In case of products, on receiving damaged or defective items, please report to our customer service team. The request would be entertained once the seller/merchant listed on the Platform has checked and determined the same at its own end.",
    bullets: [
      "This should be reported within 4 days of receipt of products.",
      "If you feel the product received is not as shown on the site or as per your expectations, bring it to the notice of our customer service within 4 days of receiving the product.",
      "The customer service team, after looking into your complaint, will take an appropriate decision.",
      "The product must be returned in good condition and with all original documentation.",
    ],
  },
  {
    icon: "cash-outline",
    title: "Refund Policy",
    content: "To cover the costs associated with any product/service, the following refund policy applies:",
    bullets: [
      "Refund below ₹20,000: If a product or unutilised service below ₹20,000 is returned within 4 days of purchase, an amount of ₹5,000 will be deducted from the refund.",
      "Refunds at ₹20,000 and Above: If a product or unutilised service at ₹20,000 or above is returned within 4 days of purchase, an amount of ₹7,500 will be deducted from the refund.",
    ],
  },
  {
    icon: "shield-outline",
    title: "Warranty Claims",
    content: "In case of complaints regarding products that come with a warranty from the manufacturers, please refer the issue to them directly.",
  },
  {
    icon: "time-outline",
    title: "Refund Processing Time",
    content: "In case of any refunds approved by DOGGOS HEAVEN PRIVATE LIMITED, it will take 15 days for the refund to be processed to you.",
  },
];

export default function RefundPolicyScreen() {
  return (
    <View style={styles.container}>
      <Header title="Refund Policy" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <Ionicons name="return-up-back" size={36} color="#A8D96C" />
          <Text style={styles.headerTitle}>Refund Policy</Text>
          <Text style={styles.headerDesc}>
            This refund and cancellation policy outlines how you can cancel or seek a refund for a product/service that you have purchased through the Platform.
          </Text>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}>
                <Ionicons name={section.icon} size={20} color="#0B3D2E" />
              </View>
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            {section.content && (
              <Text style={[styles.cardContent, section.bullets && styles.paraSpacing]}>
                {section.content}
              </Text>
            )}
            {section.bullets?.map((item, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Highlight Box */}
        <View style={styles.highlightCard}>
          <Ionicons name="information-circle" size={22} color="#A8D96C" style={{ marginBottom: 8 }} />
          <Text style={styles.highlightText}>
            All refund requests are subject to review by our customer service team. For assistance, reach us at care@doggosheaven.com or call +91 8448461071.
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
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  cardContent: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20 },
  paraSpacing: { marginBottom: 10 },

  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 8, paddingRight: 4 },
  bullet: { fontSize: 13, color: "#3E7B27", marginTop: 1 },
  bulletText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20, flex: 1 },

  highlightCard: {
    backgroundColor: "#1A5C3A", borderRadius: 16, padding: 18,
    alignItems: "center", marginTop: 6,
  },
  highlightText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C", textAlign: "center", lineHeight: 18 },
});
