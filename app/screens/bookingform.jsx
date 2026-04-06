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

// Doggos Heaven Pet Resort location
const CLINIC_LAT = 28.6000;
const CLINIC_LON = 76.6500;

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
};

// Time slots 10AM to 9PM every 30 min
const TIME_SLOTS = [];
for (let h = 10; h < 21; h++) {
  const period = h < 12 ? "AM" : "PM";
  const display = h <= 12 ? h : h - 12;
  TIME_SLOTS.push({ h, m: 0,  label: `${display}:00 ${period}` });
  if (h < 20) TIME_SLOTS.push({ h, m: 30, label: `${display}:30 ${period}` });
}

export default function BookingFormScreen() {
  const router = useRouter();
  const {
    serviceId, serviceName, serviceEmoji,
    servicePrice, serviceHalfPrice, serviceConsultPrice,
    serviceDescription, servicePriceTiers,
  } = useLocalSearchParams();

  const priceOptions = useMemo(() => {
    const opts = [];
    if (servicePriceTiers) {
      try {
        const raw = servicePriceTiers.includes("%") ? decodeURIComponent(servicePriceTiers) : servicePriceTiers;
        JSON.parse(raw).forEach((t) => {
          if (t.label && Number(t.price) > 0) opts.push({ label: t.label, price: Number(t.price) });
        });
      } catch (e) {}
    }
    if (opts.length === 0) {
      if (Number(servicePrice) > 0)       opts.push({ label: "Full Day",     price: Number(servicePrice) });
      if (Number(serviceHalfPrice) > 0)   opts.push({ label: "Half Day",     price: Number(serviceHalfPrice) });
      if (Number(serviceConsultPrice) > 0) opts.push({ label: "Consultation", price: Number(serviceConsultPrice) });
    }
    return opts;
  }, [servicePrice, serviceHalfPrice, serviceConsultPrice, servicePriceTiers]);

  const VACCINES = [
    { key: "dhppi", label: "DHPPI", price: 900, desc: "Distemper, Hepatitis, Parvovirus, Parainfluenza" },
    { key: "arv",   label: "ARV",   price: 600, desc: "Anti Rabies Vaccine" },
    { key: "ccv",   label: "CCV",   price: 800, desc: "Canine Coronavirus" },
    { key: "kcv",   label: "KCV",   price: 1200, desc: "Kennel Cough Vaccine" },
  ];

  const isVaccination = serviceName?.toLowerCase().includes("vacc");

  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Default selected slot: 10:00 AM
  const [selectedSlot, setSelectedSlot] = useState({ h: 10, m: 0 });
  const [notes, setNotes] = useState("");
  const [ambulance, setAmbulance] = useState(false);
  const [ambulanceKm, setAmbulanceKm] = useState(0);
  const [loading, setLoading] = useState(false);
  const [petsLoading, setPetsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSearching, setLocationSearching] = useState(false);
  const [paymentMode, setPaymentMode] = useState("cash");

  useEffect(() => {
    if (isVaccination && selectedVaccine) {
      setSelectedOption({ label: selectedVaccine.label, price: selectedVaccine.price });
    } else if (priceOptions.length > 0) {
      setSelectedOption(priceOptions[0]);
    }
  }, [priceOptions, selectedVaccine, isVaccination]);

  useEffect(() => { loadPets(); }, []);

  const searchLocation = async (text) => {
    setLocationQuery(text);
    setSelectedLocation(null);
    setAmbulanceKm(0);
    if (text.length < 3) { setLocationSuggestions([]); return; }
    setLocationSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=in`,
        { headers: { "Accept-Language": "en", "User-Agent": "DoggosHeavenApp/1.0" } }
      );
      const data = await res.json();
      setLocationSuggestions(data);
    } catch (e) { console.log(e); }
    finally { setLocationSearching(false); }
  };

  const selectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const km = haversine(lat, lon, CLINIC_LAT, CLINIC_LON);
    setSelectedLocation({ name: item.display_name.split(",").slice(0, 3).join(","), lat, lon });
    setAmbulanceKm(km);
    setLocationQuery(item.display_name.split(",").slice(0, 3).join(","));
    setLocationSuggestions([]);
  };

  const loadPets = async () => {
    try {
      const { user: u, token: t } = await getAuth();
      setUser(u); setToken(t);
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerpets?email=${encodeURIComponent(u?.email)}`,
        { headers: { Authorization: t || "" } }
      );
      const data = await res.json();
      if (data.success) setPets((data.pets || []).filter((p) => !p.isBlacklisted));
    } catch (e) { console.log(e); }
    finally { setPetsLoading(false); }
  };

  const isSlotPast = (h, m) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selDay = new Date(date); selDay.setHours(0, 0, 0, 0);
    if (selDay.getTime() !== today.getTime()) return false;
    const now = new Date();
    const slot = new Date(); slot.setHours(h, m, 0, 0);
    return slot <= now;
  };

  const formatSlotTime = (h, m) => {
    const period = h < 12 ? "AM" : "PM";
    const display = h === 0 ? 12 : h <= 12 ? h : h - 12;
    return `${display}:${m === 0 ? "00" : "30"} ${period}`;
  };

  // Off-hours: before 10AM or after 9PM = ₹1500 consultation fee
  const isOffHours = selectedSlot.h < 10 || selectedSlot.h >= 21;
  const isConsultation = serviceName?.toLowerCase().includes("consult") ||
    serviceName?.toLowerCase().includes("veterinary") ||
    serviceName?.toLowerCase().includes("vet") ||
    priceOptions.some((o) => o.label.toLowerCase().includes("consult"));
  const consultFee = isOffHours && isConsultation ? 1500 : (selectedOption?.price || 0);

  const calcAmbulanceFare = (km) => {
    const k = parseFloat(km);
    if (!k || k <= 0) return 0;
    if (k <= 5) return 500;
    return 500 + Math.ceil((k - 5) / 2) * 100;
  };
  const ambulanceFare = ambulance ? calcAmbulanceFare(ambulanceKm) : 0;

  const gstRate = paymentMode === "online" ? 0.18 : paymentMode === "card" ? 0.20 : 0;
  const subtotal = (consultFee || 0) + ambulanceFare;
  const gstAmount = Math.round(subtotal * gstRate);
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = async () => {
    if (!selectedPet) return Alert.alert("Missing", "Please select a pet.");
    if (isVaccination && !selectedVaccine) return Alert.alert("Missing", "Please select a vaccine type.");
    if (isSlotPast(selectedSlot.h, selectedSlot.m))
      return Alert.alert("Invalid Time", "Please select a future time slot.");

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/createappoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify({
          customerId: user?.id,
          serviceId: serviceId || null,
          serviceName: isVaccination
            ? `Vaccination (${selectedVaccine.label})`
            : `${serviceName}${selectedOption ? ` (${selectedOption.label})` : ""}`,
          appointmentDate: date.toISOString().split("T")[0],
          appointmentTime: `${String(selectedSlot.h).padStart(2, "0")}:${String(selectedSlot.m).padStart(2, "0")}`,
          petName: selectedPet.name,
          petBreed: selectedPet.breed || "",
          petAge: selectedPet.age || "N/A",
          notes: notes.trim(),
          totalAmount,
          gstAmount,
          paymentMode,
          pricingType: selectedOption?.label || "On Request",
          ambulanceRequired: ambulance,
          ambulanceKm: ambulance ? ambulanceKm : 0,
          ambulanceFare,
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
            {serviceDescription ? <Text style={styles.serviceDesc}>{serviceDescription}</Text> : null}
            {selectedOption ? (
              <Text style={styles.servicePrice}>₹{selectedOption.price}</Text>
            ) : (
              <Text style={styles.servicePriceNA}>Price on request</Text>
            )}
          </View>
        </View>

        {/* Vaccine Selection — only for Vaccination service */}
        {isVaccination && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💉 Select Vaccine</Text>
            <View style={styles.vaccineGrid}>
              {VACCINES.map((v) => {
                const active = selectedVaccine?.key === v.key;
                return (
                  <TouchableOpacity
                    key={v.key}
                    style={[styles.vaccineCard, active && styles.vaccineCardActive]}
                    onPress={() => setSelectedVaccine(v)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.vaccineCardTop}>
                      <Text style={[styles.vaccineLabel, active && styles.vaccineLabelActive]}>{v.label}</Text>
                      {active && <Ionicons name="checkmark-circle" size={16} color="#A8D96C" />}
                    </View>
                    <Text style={[styles.vaccinePrice, active && styles.vaccinePriceActive]}>₹{v.price}</Text>
                    <Text style={[styles.vaccineDesc, active && styles.vaccineDescActive]} numberOfLines={2}>{v.desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Price Selection — hide for vaccination (price auto-set by vaccine) */}
        {priceOptions.length > 0 && !isVaccination && (
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
                      <Ionicons name="pricetag-outline" size={22} color={active ? "#A8D96C" : "#0B3D2E"} />
                      {active && <Ionicons name="checkmark-circle" size={18} color="#A8D96C" />}
                    </View>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
                    <Text style={[styles.optionPrice, active && styles.optionPriceActive]}>₹{opt.price}</Text>
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
                  {selectedPet?._id === pet._id && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>

          {/* Date Picker Button */}
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <View style={styles.dateBtnLeft}>
              <Ionicons name="calendar-outline" size={20} color="#0B3D2E" />
              <View>
                <Text style={styles.dateBtnLabel}>Appointment Date</Text>
                <Text style={styles.dateBtnValue}>
                  {date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#A8D96C" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={date} mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              onChange={(e, selected) => {
                setShowDatePicker(Platform.OS === "ios");
                if (selected) {
                  setDate(selected);
                  // Reset slot if it becomes past after date change
                  if (isSlotPast(selectedSlot.h, selectedSlot.m)) {
                    setSelectedSlot({ h: 10, m: 0 });
                  }
                }
              }}
            />
          )}

          {/* Time Slots */}
          <View style={styles.timeSlotsHeader}>
            <Ionicons name="time-outline" size={16} color="#0B3D2E" />
            <Text style={styles.timeSlotsTitle}>Select Time Slot</Text>
            <View style={styles.selectedSlotBadge}>
              <Text style={styles.selectedSlotBadgeText}>{formatSlotTime(selectedSlot.h, selectedSlot.m)}</Text>
            </View>
          </View>

          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const past = isSlotPast(slot.h, slot.m);
              const active = selectedSlot.h === slot.h && selectedSlot.m === slot.m;
              return (
                <TouchableOpacity
                  key={`${slot.h}:${slot.m}`}
                  style={[styles.slot, active && styles.slotActive, past && styles.slotPast]}
                  onPress={() => { if (!past) setSelectedSlot({ h: slot.h, m: slot.m }); }}
                  activeOpacity={past ? 1 : 0.75}
                  disabled={past}
                >
                  <Text style={[styles.slotText, active && styles.slotTextActive, past && styles.slotTextPast]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Doctor Section — only for Consultation services */}
        {(serviceName?.toLowerCase().includes("consult") ||
          serviceName?.toLowerCase().includes("veterinary") ||
          serviceName?.toLowerCase().includes("vet") ||
          priceOptions.some((o) => o.label.toLowerCase().includes("consult"))) && (
          <View style={styles.doctorCard}>
            <View style={styles.doctorHeader}>
              <View style={styles.doctorAvatar}>
                <Text style={styles.doctorAvatarText}>👨‍⚕️</Text>
              </View>
              <View style={styles.doctorHeaderInfo}>
                <Text style={styles.doctorName}>Dr. Bhuvnesh Ahlawat</Text>
                <Text style={styles.doctorDeg}>B.V.Sc & A.H. — Veterinarian</Text>
                <View style={styles.doctorFeeBadge}>
                  <Ionicons name="pricetag" size={12} color="#0B3D2E" />
                  <Text style={styles.doctorFeeText}>Consultation Fee: ₹500</Text>
                </View>
              </View>
            </View>

            <View style={styles.doctorDivider} />

            <View style={styles.doctorInfoRow}>
              <Ionicons name="location-outline" size={14} color="#3E7B27" />
              <Text style={styles.doctorInfoText}>Gochhi, Jhajjar</Text>
            </View>
            <View style={styles.doctorInfoRow}>
              <Ionicons name="call-outline" size={14} color="#3E7B27" />
              <Text style={styles.doctorInfoText}>+91 70275 25213</Text>
            </View>
            <View style={styles.doctorInfoRow}>
              <Ionicons name="mail-outline" size={14} color="#3E7B27" />
              <Text style={styles.doctorInfoText}>bhuvneshahlawat11@gmail.com</Text>
            </View>

            <View style={styles.doctorDivider} />

            <Text style={styles.doctorSectionLabel}>Experience</Text>
            <View style={styles.doctorExpItem}>
              <Text style={styles.doctorExpRole}>Veterinary Consultant</Text>
              <Text style={styles.doctorExpPlace}>Dr. Ruhil's Pet Clinic</Text>
              <Text style={styles.doctorExpDate}>Apr 2025 – Jan 2026</Text>
            </View>
            <View style={styles.doctorExpItem}>
              <Text style={styles.doctorExpRole}>Internee</Text>
              <Text style={styles.doctorExpPlace}>NTR College of Veterinary Science, SVVU Tirupati</Text>
              <Text style={styles.doctorExpDate}>Mar 2024 – Mar 2025</Text>
            </View>
            <View style={[styles.doctorExpItem, { borderBottomWidth: 0 }]}>
              <Text style={styles.doctorExpRole}>Veterinarian</Text>
              <Text style={styles.doctorExpPlace}>Current Practice</Text>
              <Text style={styles.doctorExpDate}>Feb 2026 – Present</Text>
            </View>

            <View style={styles.doctorDivider} />

            <Text style={styles.doctorSectionLabel}>Specialisations</Text>
            <View style={styles.doctorSkillsRow}>
              {["Diagnosis & Treatment","Dermatology","Gastrointestinal","Urogenital","Soft Tissue Surgery","Vaccination & Deworming","OPD Management"].map((s) => (
                <View key={s} style={styles.doctorSkillChip}>
                  <Text style={styles.doctorSkillText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Off-hours warning */}
        {isOffHours && isConsultation && (
          <View style={styles.offHoursBox}>
            <Ionicons name="moon-outline" size={18} color="#B8860B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.offHoursTitle}>Off-Hours Consultation</Text>
              <Text style={styles.offHoursText}>Appointments outside 10 AM – 9 PM are charged at ₹1500 (emergency rate).</Text>
            </View>
          </View>
        )}

        {/* Location Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Your Location</Text>
          <Text style={styles.locationHint}>Enter your address to calculate ambulance distance</Text>
          <View style={styles.locationInputRow}>
            <Ionicons name="search-outline" size={18} color="#0B3D2E" />
            <TextInput
              style={styles.locationInput}
              placeholder="Search your area, city..."
              placeholderTextColor="#aaa"
              value={locationQuery}
              onChangeText={searchLocation}
            />
            {locationSearching && <ActivityIndicator size="small" color="#0B3D2E" />}
            {locationQuery.length > 0 && !locationSearching && (
              <TouchableOpacity onPress={() => { setLocationQuery(""); setLocationSuggestions([]); setSelectedLocation(null); setAmbulanceKm(0); }}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          {locationSuggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {locationSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={14} color="#3E7B27" />
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {item.display_name.split(",").slice(0, 4).join(",")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedLocation && (
            <View style={styles.selectedLocationBox}>
              <Ionicons name="checkmark-circle" size={16} color="#3E7B27" />
              <Text style={styles.selectedLocationText}>{selectedLocation.name}</Text>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>{ambulanceKm} km</Text>
              </View>
            </View>
          )}
        </View>

        {/* Ambulance Section */}
        <View style={styles.section}>
          <View style={styles.ambulanceHeader}>
            <View style={styles.ambulanceIconBox}>
              <Text style={{ fontSize: 22 }}>🚑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ambulance Service</Text>
              <Text style={styles.ambulanceSub}>Need pickup for your pet?</Text>
            </View>
            <TouchableOpacity
              style={[styles.ambulanceToggle, ambulance && styles.ambulanceToggleOn]}
              onPress={() => setAmbulance(!ambulance)}
              activeOpacity={0.8}
            >
              <Text style={[styles.ambulanceToggleText, ambulance && { color: "#A8D96C" }]}>
                {ambulance ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          {ambulance && (
            <>
              <View style={styles.ambulanceFareInfo}>
                <View style={styles.ambulanceFareRow}>
                  <Ionicons name="navigate-outline" size={14} color="#3E7B27" />
                  <Text style={styles.ambulanceFareText}>Up to 5 km — ₹500 flat</Text>
                </View>
                <View style={styles.ambulanceFareRow}>
                  <Ionicons name="add-circle-outline" size={14} color="#3E7B27" />
                  <Text style={styles.ambulanceFareText}>After 5 km — ₹100 per 2 km</Text>
                </View>
              </View>
              <View style={styles.kmAutoRow}>
                <Ionicons name="location" size={16} color="#0B3D2E" />
                <Text style={styles.kmAutoText}>
                  {ambulanceKm > 0 ? `Distance: ${ambulanceKm} km from resort` : "Search your location above first"}
                </Text>
              </View>
              {ambulanceFare > 0 && (
                <View style={styles.ambulanceFareBadge}>
                  <Ionicons name="pricetag" size={14} color="#0B3D2E" />
                  <Text style={styles.ambulanceFareBadgeText}>Ambulance Fare: ₹{ambulanceFare}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Payment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Mode</Text>
          <View style={styles.paymentRow}>
            {[{key:"cash",label:"💵 Cash"},{key:"online",label:"📱 Online"},{key:"card",label:"💳 Card"}].map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.paymentBtn, paymentMode === m.key && styles.paymentBtnActive]}
                onPress={() => setPaymentMode(m.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.paymentBtnText, paymentMode === m.key && styles.paymentBtnTextActive]}>
                  {m.label}
                </Text>
                {paymentMode === m.key && (
                  <Text style={styles.paymentGstLabel}>
                    {m.key === "cash" ? "No GST" : m.key === "online" ? "18% GST" : "20% GST"}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
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

        {/* Summary — always visible */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>💰 Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>
              {isVaccination && selectedVaccine ? `Vaccination (${selectedVaccine.label})` : (serviceName || "—")}
            </Text>
          </View>
          {isVaccination && selectedVaccine && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Vaccine</Text>
              <Text style={styles.summaryValue}>{selectedVaccine.label} — {selectedVaccine.desc}</Text>
            </View>
          )}
          {selectedOption && !isVaccination && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <Text style={styles.summaryValue}>{selectedOption.label}</Text>
            </View>
          )}
          {selectedPet && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pet</Text>
              <Text style={styles.summaryValue}>{selectedPet.name}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>
              {date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>{formatSlotTime(selectedSlot.h, selectedSlot.m)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Base Amount</Text>
            <Text style={styles.summaryValue}>{consultFee > 0 ? `₹${consultFee}` : "On Request"}</Text>
          </View>
          {isOffHours && isConsultation && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#B8860B" }]}>Off-Hours Rate</Text>
              <Text style={[styles.summaryValue, { color: "#B8860B" }]}>₹1500</Text>
            </View>
          )}
          {ambulance && ambulanceFare > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>🚑 Ambulance ({ambulanceKm} km)</Text>
              <Text style={styles.summaryValue}>₹{ambulanceFare}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: "#B8860B" }]}>
              GST ({paymentMode === "cash" ? "0%" : paymentMode === "online" ? "18%" : "20%"})
            </Text>
            <Text style={[styles.summaryValue, { color: "#B8860B" }]}>₹{gstAmount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Mode</Text>
            <Text style={styles.summaryValue}>
              {paymentMode === "cash" ? "💵 Cash" : paymentMode === "online" ? "📱 Online" : "💳 Card"}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0, marginTop: 4 }]}>
            <Text style={[styles.summaryLabel, { fontFamily: "Poppins_700Bold", color: "#0B3D2E", fontSize: 15 }]}>Total</Text>
            <Text style={[styles.summaryTotal, { fontSize: 18 }]}>₹{totalAmount}</Text>
          </View>
        </View>

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

  // Date button
  dateBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 16,
  },
  dateBtnLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateBtnLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 2 },
  dateBtnValue: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  // Time slots
  timeSlotsHeader: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
  },
  timeSlotsTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },
  selectedSlotBadge: {
    backgroundColor: "#0B3D2E", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  selectedSlotBadgeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1.5, borderColor: "#D4EDD4",
    backgroundColor: "#F8FFF8",
  },
  slotActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  slotPast: { backgroundColor: "#F5F5F5", borderColor: "#E8E8E8", opacity: 0.4 },
  slotText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  slotTextActive: { color: "#A8D96C" },
  slotTextPast: { color: "#bbb" },

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

  // Off-hours
  offHoursBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FFF9E6", borderRadius: 12, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: "#F0C040",
  },
  offHoursTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#B8860B", marginBottom: 2 },
  offHoursText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#7A6000", lineHeight: 16 },

  // Ambulance
  ambulanceHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  ambulanceIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#FFF0F0", justifyContent: "center", alignItems: "center",
  },
  ambulanceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  ambulanceToggle: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#F0F0F0", borderWidth: 1.5, borderColor: "#ddd",
  },
  ambulanceToggleOn: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  ambulanceToggleText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#888" },
  ambulanceFareInfo: {
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12, marginBottom: 12, gap: 6,
  },
  ambulanceFareRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ambulanceFareText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  kmAutoRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4", marginBottom: 10,
  },
  kmAutoText: { flex: 1, fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  locationHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginBottom: 10 },
  locationInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  locationInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  suggestionsBox: {
    marginTop: 6, borderRadius: 12, borderWidth: 1, borderColor: "#D4EDD4",
    backgroundColor: "#fff", overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  suggestionText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#333" },
  selectedLocationBox: {  
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 10, backgroundColor: "#E8F5E8", borderRadius: 10, padding: 10,
  },
  selectedLocationText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
  distanceBadge: {
    backgroundColor: "#A8D96C", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  distanceBadgeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  paymentRow: { flexDirection: "row", gap: 10 },
  paymentBtn: {
    flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#D4EDD4", backgroundColor: "#F0F7F0",
  },
  paymentBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  paymentBtnText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  paymentBtnTextActive: { color: "#A8D96C" },
  paymentGstLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 3 },
  ambulanceFareBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#A8D96C", borderRadius: 10, padding: 10,
  },
  ambulanceFareBadgeText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  // Vaccine selection
  vaccineGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  vaccineCard: {
    width: "47%", backgroundColor: "#F0F7F0", borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  vaccineCardActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  vaccineCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  vaccineLabel: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vaccineLabelActive: { color: "#A8D96C" },
  vaccinePrice: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4 },
  vaccinePriceActive: { color: "#fff" },
  vaccineDesc: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#666", lineHeight: 14 },
  vaccineDescActive: { color: "rgba(168,217,108,0.8)" },

  // Doctor Card
  doctorCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#A8D96C",
  },
  doctorHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  doctorAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#0B3D2E",
    justifyContent: "center", alignItems: "center",
  },
  doctorAvatarText: { fontSize: 26 },
  doctorHeaderInfo: { flex: 1 },
  doctorName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  doctorDeg: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555", marginBottom: 6 },
  doctorFeeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#A8D96C", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  doctorFeeText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  doctorDivider: { height: 1, backgroundColor: "#E8F5E8", marginVertical: 12 },
  doctorInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  doctorInfoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#333" },
  doctorSectionLabel: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 8 },
  doctorExpItem: {
    paddingBottom: 10, marginBottom: 10,
    borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  doctorExpRole: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  doctorExpPlace: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#555", marginTop: 2 },
  doctorExpDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 2 },
  doctorSkillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  doctorSkillChip: {
    backgroundColor: "#E8F5E8", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  doctorSkillText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#0B3D2E" },
});
 