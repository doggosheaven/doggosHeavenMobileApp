import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const PURPOSE_EMOJI = {
  Veterinary: "🩺", Grooming: "✂️", Hostel: "🏠",
  "Day Care": "🌞", "Day School": "🎓", "Play School": "🎮",
  "Dog Park": "🌳", Inquiry: "💬", Shop: "🛒",
};

const PURPOSE_COLOR = {
  Veterinary: "#C62828", Grooming: "#1A5C3A", Hostel: "#0B3D2E",
  "Day Care": "#3E7B27", "Day School": "#1A5C3A", "Play School": "#0B3D2E",
  "Dog Park": "#3E7B27", Inquiry: "#F59E0B", Shop: "#0B3D2E",
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function VisitDetailScreen() {
  const router = useRouter();
  const { visitId, purpose: paramPurpose, petName: paramPetName } = useLocalSearchParams();

  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisit = async () => {
      try {
        const { token } = await getAuth();
        const res = await fetch(`${BASE_URL}/api/v1/visit/getvisitdetailspublic/${visitId}`, {
          headers: { Authorization: token || "" },
        });
        const data = await res.json();
        if (data.success) setVisit(data.data);
        else setError(data.message || "Visit not found");
      } catch (e) {
        setError("Could not load visit details");
      } finally {
        setLoading(false);
      }
    };
    if (visitId) fetchVisit();
    else { setError("Invalid visit"); setLoading(false); }
  }, [visitId]);

  const purpose = visit?.visitType?.purpose || paramPurpose || "Visit";
  const accentColor = PURPOSE_COLOR[purpose] || "#0B3D2E";
  const emoji = PURPOSE_EMOJI[purpose] || "🐾";

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0B3D2E" />
        <Text style={s.loadingTxt}>Loading visit details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#C62828" />
        <Text style={s.errorTxt}>{error}</Text>
        <TouchableOpacity style={s.backBtnCenter} onPress={() => router.back()}>
          <Text style={s.backBtnCenterTxt}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const details = visit?.details || {};
  const pet = visit?.pet || {};
  const owner = pet?.owner || {};

  return (
    <View style={s.container}>
      {/* Hero */}
      <View style={[s.hero, { backgroundColor: accentColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.heroEmoji}>{emoji}</Text>
        <Text style={s.heroTitle}>{purpose} Visit</Text>
        <Text style={s.heroSub}>Recorded on {fmtDate(visit?.createdAt)}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Pet Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🐾 Pet Details</Text>
          <Row label="Name" value={pet?.name || paramPetName || "—"} />
          <Row label="Species" value={pet?.species || "—"} />
          <Row label="Breed" value={pet?.breed || "—"} />
          <Row label="Sex" value={pet?.sex || "—"} last />
        </View>

        {/* Visit Info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Visit Details</Text>
          <Row label="Purpose" value={purpose} highlight />
          <Row label="Date" value={fmtDate(visit?.createdAt)} />
          {details?.customerType ? <Row label="Customer Type" value={details.customerType} /> : null}
          {details?.note ? <Row label="Note" value={details.note} /> : null}
          {details?.selectedPayment ? <Row label="Payment Mode" value={details.selectedPayment} last /> : <Row label="Payment Mode" value="Cash" last />}
        </View>

        {/* Payment */}
        {(details?.price > 0 || details?.finalPrice > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💰 Payment Summary</Text>
            {details?.price > 0 && <Row label="Price" value={`₹${details.price}`} />}
            {details?.discount > 0 && <Row label="Discount" value={`- ₹${details.discount}`} valueStyle={{ color: "#C62828" }} />}
            <View style={[s.row, s.rowFinal]}>
              <Text style={s.rowKeyBold}>Amount Paid</Text>
              <Text style={s.rowValBold}>₹{details?.finalPrice || details?.price || 0}</Text>
            </View>
          </View>
        )}

        {/* Follow-up */}
        {visit?.nextFollowUp && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📅 Follow-up Scheduled</Text>
            <Row label="Date" value={fmtDate(visit.nextFollowUp)} />
            {visit?.followUpPurpose ? <Row label="Purpose" value={visit.followUpPurpose} last /> : null}
          </View>
        )}

        {/* Vet specific — medicines/vaccines if any */}
        {details?.medicines?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💊 Medicines Prescribed</Text>
            {details.medicines.map((m, i) => (
              <Row key={i} label={m.name || `Medicine ${i + 1}`} value={m.dose ? `Dose: ${m.dose}` : ""} last={i === details.medicines.length - 1} />
            ))}
          </View>
        )}

        {details?.vaccines?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>💉 Vaccines Given</Text>
            {details.vaccines.map((v, i) => (
              <Row key={i} label={v.name || `Vaccine ${i + 1}`} value={v.manufacturer || ""} last={i === details.vaccines.length - 1} />
            ))}
          </View>
        )}

        {/* Doggos note */}
        <View style={s.noteCard}>
          <Ionicons name="heart" size={18} color="#A8D96C" />
          <Text style={s.noteText}>Thank you for trusting Doggos Heaven with {pet?.name || "your pet"}'s care! 🐾</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, highlight, last, valueStyle }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowKey}>{label}</Text>
      <Text style={[s.rowVal, highlight && s.rowValHighlight, valueStyle]}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 30, backgroundColor: "#F0F7F0" },
  loadingTxt: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#666" },
  errorTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#C62828", textAlign: "center" },
  backBtnCenter: { backgroundColor: "#0B3D2E", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtnCenterTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  hero: {
    paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20, alignItems: "center",
  },
  backBtn: { position: "absolute", top: 52, left: 16, padding: 6 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },

  body: { padding: 16 },

  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionTitle: {
    fontSize: 12, fontFamily: "Poppins_700Bold", color: "#3E7B27",
    marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5,
  },

  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  rowFinal: {
    borderBottomWidth: 0, paddingTop: 10, marginTop: 4,
    borderTopWidth: 1, borderTopColor: "#D4EDD4",
  },
  rowKey: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#888", flex: 1 },
  rowVal: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#222", flex: 1, textAlign: "right" },
  rowValHighlight: { color: "#0B3D2E" },
  rowKeyBold: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  rowValBold: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#3E7B27", textAlign: "right" },

  noteCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#0B3D2E", borderRadius: 14, padding: 16, marginTop: 4,
  },
  noteText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#A8D96C", flex: 1, lineHeight: 20 },
});
