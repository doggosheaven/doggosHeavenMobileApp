import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";

const FAQS = [
  { q: "How do I book a service?", a: "Go to Services tab, select a service and tap Reserve. Our team will confirm your booking shortly." },
  { q: "How long does confirmation take?", a: "Our team reviews and confirms bookings within 2-4 hours during business hours (9 AM - 7 PM)." },
  { q: "Can I cancel my booking?", a: "Yes, you can cancel from My Bookings page as long as the status is Pending or Confirmed." },
  { q: "How do I register my pet?", a: "Go to Profile → My Pets → Register a New Pet and fill in your pet's details." },
  { q: "What payment methods are accepted?", a: "We accept UPI, credit/debit cards, and net banking via Razorpay." },
  { q: "Is my pet safe during boarding?", a: "Absolutely! Our trained staff provides 24/7 care with CCTV monitoring and regular health checks." },
];

const CONTACT = [
  { icon: "call-outline", label: "Call Us", value: "+91 84484 61071", action: () => Linking.openURL("tel:+918448461071") },
  { icon: "mail-outline", label: "Email Us", value: "care@doggosheaven.com", action: () => Linking.openURL("mailto:care@doggosheaven.com") },
  { icon: "logo-whatsapp", label: "WhatsApp", value: "+91 84484 61071", action: () => Linking.openURL("https://wa.me/918448461071") },
  { icon: "globe-outline", label: "Website", value: "www.doggosheaven.com", action: () => Linking.openURL("https://doggosheaven.com") },
];

export default function HelpSupportScreen() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <View style={styles.container}>
      <Header title="Help & Support" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Contact Us */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          {CONTACT.map((item, i) => (
            <TouchableOpacity key={i} style={styles.contactCard} onPress={item.action} activeOpacity={0.8}>
              <View style={styles.contactIconBox}>
                <Ionicons name={item.icon} size={20} color="#0B3D2E" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#A8D96C" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQS.map((faq, i) => (
            <TouchableOpacity
              key={i}
              style={styles.faqCard}
              onPress={() => setOpenFaq(openFaq === i ? null : i)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQ}>{faq.q}</Text>
                <Ionicons
                  name={openFaq === i ? "chevron-up" : "chevron-down"}
                  size={18} color="#3E7B27"
                />
              </View>
              {openFaq === i && (
                <Text style={styles.faqA}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Business Hours */}
        <View style={styles.hoursCard}>
          <View style={styles.hoursHeader}>
            <Ionicons name="time-outline" size={20} color="#A8D96C" />
            <Text style={styles.hoursTitle}>Business Hours</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Monday - Saturday</Text>
            <Text style={styles.hoursTime}>9:00 AM - 7:00 PM</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Sunday</Text>
            <Text style={styles.hoursTime}>10:00 AM - 5:00 PM</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 10 },

  contactCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    marginBottom: 8, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  contactIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center",
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  contactValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#666" },

  faqCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    marginBottom: 8, elevation: 1,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  faqQ: { flex: 1, fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginRight: 8 },
  faqA: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 20, marginTop: 10 },

  hoursCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 18, elevation: 3,
  },
  hoursHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  hoursTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#fff" },
  hoursRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  hoursDay: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#aaa" },
  hoursTime: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
