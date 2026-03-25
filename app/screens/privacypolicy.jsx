import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

const SECTIONS = [
  {
    icon: "information-circle-outline",
    title: "Information We Collect",
    content: "We collect information you provide when registering, including your name, email address, phone number, and pet details. We also collect booking and transaction data to provide our services.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "How We Use Your Information",
    content: "Your information is used to manage bookings, send service updates and reminders, process payments, and improve our services. We do not sell your personal data to third parties.",
  },
  {
    icon: "lock-closed-outline",
    title: "Data Security",
    content: "We implement industry-standard security measures to protect your personal information. All payment transactions are encrypted and processed securely through Razorpay.",
  },
  {
    icon: "paw-outline",
    title: "Pet Information",
    content: "Pet details you provide (breed, age, medical history, vaccinations) are used solely to deliver appropriate care services and are kept strictly confidential.",
  },
  {
    icon: "notifications-outline",
    title: "Communications",
    content: "We may send you booking confirmations, reminders, and promotional offers. You can opt out of promotional communications at any time from your profile settings.",
  },
  {
    icon: "people-outline",
    title: "Third-Party Services",
    content: "We use trusted third-party services like Razorpay for payments. These services have their own privacy policies and we encourage you to review them.",
  },
  {
    icon: "create-outline",
    title: "Your Rights",
    content: "You have the right to access, update, or delete your personal information at any time. Contact us at support@doggosheaven.com to exercise these rights.",
  },
  {
    icon: "refresh-outline",
    title: "Policy Updates",
    content: "We may update this privacy policy from time to time. We will notify you of significant changes via email or in-app notification.",
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
          <Text style={styles.headerSub}>Last updated: January 2025</Text>
          <Text style={styles.headerDesc}>
            At DoggosHeaven, we are committed to protecting your privacy and ensuring the security of your personal information.
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
            <Text style={styles.cardContent}>{section.content}</Text>
          </View>
        ))}

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Questions about our Privacy Policy?</Text>
          <Text style={styles.contactText}>📧 care@doggosheaven.com</Text>
          <Text style={styles.contactText}>📞 +91 84484 61071</Text>
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
  cardContent: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20 },

  contactCard: {
    backgroundColor: "#1A5C3A", borderRadius: 16, padding: 18,
    alignItems: "center", marginTop: 6,
  },
  contactTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 10 },
  contactText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 4 },
});
