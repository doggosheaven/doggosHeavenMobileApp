import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

const SECTIONS = [
  {
    icon: "person-outline",
    title: "Personal Information",
    content: "The types of personal information we may collect about you either directly from you or from third parties includes:",
    bullets: [
      "Your name",
      "Your contact details, including email address, mailing address, street address and/or telephone number",
      "Your age and/or date of birth",
      "Your credit card details",
      "Your car registration details",
      "Your driver's licence number or 18+ card",
      "Your demographic information, such as postcode",
      "Your preferences and/or opinions",
      "Details of products and services we have provided to you and/or that you have enquired about, and our response to you",
      "Additional personal information that you provide to us, directly or indirectly, and/or accounts from which you permit us to collect information",
    ],
  },
  {
    icon: "settings-outline",
    title: "Collection and Use of Personal Information",
    bullets: [
      "To contact and communicate with you",
      "To enable us to perform the contracted services, associated applications and associated technical platforms",
      "To provide to regulators or government authorities",
      "For internal record keeping and administrative purposes",
      "For analytics, market research and business development, including to operate and improve our business, associated applications and associated platforms",
      "To comply with our legal obligations and resolve any disputes that we may have",
    ],
  },
  {
    icon: "share-social-outline",
    title: "Disclosure of Personal Information to Third Parties",
    bullets: [
      "Third party service providers (e.g., IT service providers, data storage, web-hosting, server providers, marketing or advertising providers, professional advisors, payment systems operators)",
      "Our employees, contractors and/or related entities",
      "Our existing or potential agents or business partners",
      "Any party to whom our business or assets may be transferred",
      "Courts, tribunals and regulatory authorities in the event of non-payment",
      "Law enforcement and regulatory authorities as required by law",
      "Third parties assisting in providing information, products, or services (may include international data storage)",
      "Third parties that collect and process data (may include international data processors)",
    ],
  },
  {
    icon: "hand-left-outline",
    title: "Your Rights and Controlling Your Personal Information",
    bullets: [
      "Choice and consent: You provide us with personal information knowingly and voluntarily",
      "Information from third parties: If we receive personal information about you from a third party, we will protect it as set out in this Privacy Policy",
      "Restrict: You may choose to restrict the collection or use of your personal information",
      "Access: You may request details of personal information held about you",
      "Correction: You may request to correct any inaccurate or outdated information",
      "Complaints: You may submit a complaint regarding breaches of the Australian Privacy Principles",
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.container}>
      <Header title="Privacy Policy" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <Ionicons name="shield-checkmark" size={36} color="#A8D96C" />
          <Text style={styles.headerTitle}>Your Privacy Matters</Text>
          <Text style={styles.headerSub}>Last updated: March 2026</Text>
          <Text style={styles.headerDesc}>
            This Privacy Policy sets out our commitment to protecting the privacy of personal information provided to us, or otherwise collected by us, offline or online, including through our website, in accordance with all applicable privacy laws and regulations.
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
              <Text style={styles.cardContent}>{section.content}</Text>
            )}
            {section.bullets?.map((item, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact Details</Text>
          <Text style={styles.contactName}>Doggos Heaven</Text>
          <Text style={styles.contactText}>📞 +91 8448461071</Text>
          <Text style={styles.contactText}>📧 care@doggosheaven.com</Text>
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
  headerTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginTop: 10, marginBottom: 4 },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 12 },
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
  cardContent: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20, marginBottom: 8 },

  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6, paddingRight: 4 },
  bullet: { fontSize: 13, color: "#3E7B27", marginTop: 1 },
  bulletText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20, flex: 1 },

  contactCard: {
    backgroundColor: "#1A5C3A", borderRadius: 16, padding: 18,
    alignItems: "center", marginTop: 6,
  },
  contactTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 6 },
  contactName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C", marginBottom: 8 },
  contactText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 4 },
});
