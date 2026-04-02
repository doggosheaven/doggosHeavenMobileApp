import { useState, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

export default function BookingFormScreen() {
  const router = useRouter();
  const {
    serviceId, serviceName, serviceEmoji,
    servicePrice, serviceHalfPrice, serviceConsultPrice,
    serviceDescription, servicePriceTiers,
  } = useLocalSearchParams();

  // Build price options — priceTiers first, then legacy fields
  const priceOptions = useMemo(() => {
    const opts = [];
    // priceTiers (new system) — highest priority
    if (servicePriceTiers) {
      try {
        const raw = servicePriceTiers.includes("%") ? decodeURIComponent(servicePriceTiers) : servicePriceTiers;
        const tiers = JSON.parse(raw);
        tiers.forEach((t) => {
          if (t.label && Number(t.price) > 0)
            opts.push({ label: t.label, price: Number(t.price) });
        });
      } catch (e) { console.log("priceTiers parse error", e); }
    }
    // Legacy fields — only if no priceTiers
    if (opts.length === 0) {
      if (Number(servicePrice) > 0)
        opts.push({ label: "Full Day", price: Number(servicePrice) });
      if (Number(serviceHalfPrice) > 0)
        opts.push({ label: "Half Day", price: Number(serviceHalfPrice) });
      if (Number(serviceConsultPrice) > 0)
        opts.push({ label: "Consultation", price: Number(serviceConsultPrice) });
    }
    return opts;
  }, [servicePrice, serviceHalfPrice, serviceConsultPrice, servicePriceTiers]);

  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    if (priceOptions.length > 0) setSelectedOption(priceOptions[0]);
  }, [priceOptions]);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [petsLoading, setPetsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => { loadPets(); }, []);

  const loadPets = async () => {
    try {
      const { user: u, token: t } = await getAuth();
      setUser(u);
      setToken(t);
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerpets?email=${encodeURIComponent(u?.email)}`,
        { headers: { Authorization: t || "" } }
      );
      const data = await res.json();
      if (data.success) setPets((data.pets || []).filter((p) => !p.isBlacklisted));
    } catch (e) { console.log(e); }
    finally { setPetsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!selectedPet) return Alert.alert("Missing", "Please select a pet.");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/createappoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({
          customerId: user?.id,
          serviceId: serviceId || null,
          serviceName: `${serviceName}${selectedOption ? ` (${selectedOption.label})` : ""}`,
          appointmentDate: date.toISOString().split("T")[0],
          appointmentTime: `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
          petName: selectedPet.name,
          petBreed: selectedPet.breed || "",
          petAge: selectedPet.age || "N/A",
          notes: notes.trim(),
          totalAmount: selectedOption?.price || 0,
          pricingType: selectedOption?.label || "On Request",
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert(
          "Request Sent! 🐾",
          "Your reservation request has been sent to the Doggos Heaven team. You will be notified once it is confirmed.",
          [{ text: "View Bookings", onPress: () => router.replace("/(tabs)/bookings") }]
        );
      } else {
        Alert.alert("Error", data.message || "Could not submit request");
      }
    } catch { Alert.alert("Error", "Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Header title="Reserve Service" showBack />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Service Info Card */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceIconBox}>
            <Text style={styles.serviceEmoji}>{serviceEmoji || "🐾"}</Text>
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName || "Service"}</Text>
            {serviceDescription ? (
              <Text style={styles.serviceDesc}>{serviceDescription}</Text>
            ) : null}
            {selectedOption ? (
              <Text style={styles.servicePrice}>₹{selectedOption.price}</Text>
            ) : (
              <Text style={styles.servicePriceNA}>Price on request</Text>
            )}
          </View>
        </View>

        {/* Price Selection — always show */}
        {priceOptions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Pricing Option</Text>
            <View style={styles.optionsGrid}>
              {priceOptions.map((opt) => {
                const active = selectedOption?.label === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.optionCard, active && styles.optionCardActive]}
                    onPress={() => setSelectedOption(opt)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.optionTop}>
                      <Ionicons
                        name="pricetag-outline"
                        size={22}
                        color={active ? "#A8D96C" : "#0B3D2E"}
                      />
                      {active && (
                        <Ionicons name="checkmark-circle" size={18} color="#A8D96C" />
                      )}
                    </View>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionPrice, active && styles.optionPriceActive]}>
                      ₹{opt.price}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Select Pet */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Pet</Text>
          {petsLoading ? (
            <ActivityIndicator size="small" color="#0B3D2E" style={{ marginVertical: 12 }} />
          ) : pets.length === 0 ? (
            <TouchableOpacity style={styles.addPetPrompt} onPress={() => router.push("/(tabs)/Pet/PetForm")}>
              <Ionicons name="add-circle-outline" size={22} color="#3E7B27" />
              <Text style={styles.addPetText}>No pets found. Add a pet first</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.petsRow}>
              {pets.map((pet, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.petChip, selectedPet?._id === pet._id && styles.petChipActive]}
                  onPress={() => setSelectedPet(pet)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.petChipEmoji}>🐶</Text>
                  <Text style={[styles.petChipName, selectedPet?._id === pet._id && styles.petChipNameActive]}>
                    {pet.name}
                  </Text>
                  {selectedPet?._id === pet._id && (
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
              <Ionicons name="calendar-outline" size={18} color="#0B3D2E" />
              <View style={styles.pickerBtnInfo}>
                <Text style={styles.pickerBtnLabel}>Date</Text>
                <Text style={styles.pickerBtnValue}>
                  {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#aaa" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
              <Ionicons name="time-outline" size={18} color="#0B3D2E" />
              <View style={styles.pickerBtnInfo}>
                <Text style={styles.pickerBtnLabel}>Time</Text>
                <Text style={styles.pickerBtnValue}>
                  {time.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#aaa" />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(e, selected) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selected) setDate(selected);
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={time} mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              is24Hour={false}
              onChange={(e, selected) => {
                setShowTimePicker(Platform.OS === "ios");
                if (selected) setTime(selected);
              }}
            />
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any special requirements or instructions..."
            placeholderTextColor="#aaa"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Summary */}
        {selectedPet && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Booking Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>{serviceName}</Text>
            </View>
            {selectedOption && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type</Text>
                <Text style={styles.summaryValue}>{selectedOption.label}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pet</Text>
              <Text style={styles.summaryValue}>{selectedPet.name}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Base Amount</Text>
              <Text style={styles.summaryTotal}>{selectedOption ? `₹${selectedOption.price}` : "On Request"}</Text>
            </View>
            {selectedOption && (
              <View style={[styles.summaryRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                <Text style={[styles.summaryLabel, { color: "#B8860B", fontSize: 11 }]}>+ 18% GST (online payment)</Text>
                <Text style={[styles.summaryValue, { color: "#B8860B", fontSize: 11 }]}>₹{Math.round(selectedOption.price * 0.18)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#3E7B27" />
          <Text style={styles.infoText}>
            Your request will be sent to the Doggos Heaven team. Once confirmed, you will receive a notification to complete the payment.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#0B3D2E" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#0B3D2E" />
              <Text style={styles.submitBtnText}>Send Reservation Request</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 40 },

  serviceCard: {
    backgroundColor: "#0B3D2E", borderRadius: 16, padding: 16,
    flexDirection: "row", alignItems: "center", marginBottom: 16, elevation: 3,
  },
  serviceIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: "rgba(168,217,108,0.2)",
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  serviceEmoji: { fontSize: 26 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 2 },
  serviceDesc: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginBottom: 4 },
  servicePrice: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  servicePriceNA: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#aaa" },

  section: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },

  // Price options
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionCard: {
    minWidth: "45%", flexGrow: 1, backgroundColor: "#F0F7F0", borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: "#D4EDD4", alignItems: "center",
  },
  optionCardActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  optionTop: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 8 },
  optionLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  optionLabelActive: { color: "#A8D96C" },
  optionPrice: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  optionPriceActive: { color: "#fff" },

  addPetPrompt: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#D4EDD4", borderStyle: "dashed",
    borderRadius: 12, padding: 14, justifyContent: "center",
  },
  addPetText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#3E7B27" },

  petsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  petChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F0F7F0", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  petChipActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  petChipEmoji: { fontSize: 14 },
  petChipName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  petChipNameActive: { color: "#fff" },

  inputRow: { gap: 10 },
  pickerBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 2,
  },
  pickerBtnInfo: { flex: 1 },
  pickerBtnLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 2 },
  pickerBtnValue: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  notesInput: {
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4",
    textAlignVertical: "top", minHeight: 80,
  },

  summaryBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  summaryTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 12 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  summaryValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  summaryTotal: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  infoBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: "#E8F5E8", borderRadius: 12, padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#3E7B27", lineHeight: 18 },

  submitBtn: {
    backgroundColor: "#A8D96C", borderRadius: 14, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, elevation: 3,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
});
