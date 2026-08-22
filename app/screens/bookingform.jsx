import { useState, useEffect, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import * as Location from "expo-location";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

// Doggos Heaven Pet Resort — Block J, Vatika India Next, Sector 83, Gurugram
const CLINIC_LAT = 28.391206097365302;
const CLINIC_LON = 76.97268989735072;

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

// Time slots 10AM to 9PM every 1 hour
const TIME_SLOTS = [];
for (let h = 10; h <= 21; h++) {
  const period = h < 12 ? "AM" : h === 12 ? "PM" : "PM";
  const display = h === 0 ? 12 : h <= 12 ? h : h - 12;
  TIME_SLOTS.push({ h, m: 0, label: `${display}:00 ${period}` });
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
  const [selectedSlot, setSelectedSlot] = useState({ h: 10, m: 0 });
  const [notes, setNotes] = useState("");
  const [pickupDrop, setPickupDrop] = useState(false);
  const ambulance = pickupDrop;
  const setAmbulance = setPickupDrop;
  const [vehicleAvailable, setVehicleAvailable] = useState(true);
  const [vehicleChecking, setVehicleChecking] = useState(false);
  const [ambulanceKm, setAmbulanceKm] = useState(0);
  const [loading, setLoading] = useState(false);
  const [petsLoading, setPetsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationSearching, setLocationSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [locationMode, setLocationMode] = useState(null); // "gps" | "manual"
  const [gpsError, setGpsError] = useState(null); // in-app error instead of Alert
  const [paymentMode] = useState("online");

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
    } catch (e) { __DEV__ && console.log(e); }
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
    setLocationMode("manual");
  };

  const useCurrentLocation = async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsError("Location permission denied. Please allow access in Settings or use Search Address.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      const km = haversine(latitude, longitude, CLINIC_LAT, CLINIC_LON);
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const g = geo[0] || {};
      const name = [g.name, g.street, g.district, g.city].filter(Boolean).slice(0, 3).join(", ");
      setSelectedLocation({ name: name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, lat: latitude, lon: longitude });
      setAmbulanceKm(km);
      setLocationQuery(name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setLocationSuggestions([]);
      setLocationMode("gps");
    } catch (e) {
      setGpsError("Could not fetch location. Please try Search Address instead.");
    } finally {
      setGpsLoading(false);
    }
  };

  const clearLocation = () => {
    setLocationQuery("");
    setLocationSuggestions([]);
    setSelectedLocation(null);
    setAmbulanceKm(0);
    setLocationMode(null);
    setGpsError(null);
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
    } catch (e) { __DEV__ && console.log(e); }
    finally { setPetsLoading(false); }
  };

  const checkVehicleAvailability = async (selectedDate, selectedTime) => {
    setVehicleChecking(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const timeStr = `${String(selectedTime.h).padStart(2, "0")}:${String(selectedTime.m).padStart(2, "0")}`;
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/checkvehicle?date=${dateStr}&time=${timeStr}`,
        { headers: { Authorization: token || "" } }
      );
      const data = await res.json();
      setVehicleAvailable(data.available !== false);
    } catch {
      setVehicleAvailable(true); // default available on error
    } finally {
      setVehicleChecking(false);
    }
  };

  useEffect(() => {
    if (ambulance && token) checkVehicleAvailability(date, selectedSlot);
  }, [ambulance, date, selectedSlot, token]);

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
    return `${display}:00 ${period}`;
  };

  // Generate next 14 days for calendar strip
  const calendarDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const isSameDay = (a, b) => {
    const da = new Date(a); da.setHours(0,0,0,0);
    const db = new Date(b); db.setHours(0,0,0,0);
    return da.getTime() === db.getTime();
  };

  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

  // const gstRate = 0.18; // GST disabled
  const subtotal = (consultFee || 0) + ambulanceFare;
  // const gstAmount = Math.round(subtotal * gstRate); // GST disabled
  const gstAmount = 0;
  const totalAmount = subtotal; // no GST

  const handleSubmit = async () => {
    // Profile completeness check
    if (!user?.phone || user.phone.trim().length < 10) {
      Alert.alert(
        "Profile Incomplete",
        "Please add your mobile number before booking. Staff needs your contact details.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Update Profile", onPress: () => router.push("/screens/editprofile") },
        ]
      );
      return;
    }
    if (!selectedPet) return Alert.alert("Missing", "Please select a pet.");
    if (isVaccination && !selectedVaccine) return Alert.alert("Missing", "Please select a vaccine type.");
    if (isSlotPast(selectedSlot.h, selectedSlot.m))
      return Alert.alert("Invalid Time", "Please select a future time slot.");
    if (ambulance && !selectedLocation)
      return Alert.alert("Location Required", "Please search and select your location to use Pickup & Drop service.");
    if (ambulance && !vehicleAvailable)
      return Alert.alert("Vehicle Unavailable", "Our vehicle is not available for this time slot. Please choose a different date or time.");

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
          // gstAmount, // GST disabled
          gstAmount: 0,
          paymentMode,
          pricingType: selectedOption?.label || "On Request",
          ambulanceRequired: ambulance,
          ambulanceKm: ambulance ? ambulanceKm : 0,
          ambulanceFare,
          subtotal,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Reserve Service</Text>
          {serviceName ? <Text style={styles.headerSub}>{serviceEmoji || "🐾"}  {serviceName}</Text> : null}
        </View>
      </View>
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
          {/* Section header with selected summary */}
          <View style={styles.dtHeader}>
            <View style={styles.dtHeaderLeft}>
              <Ionicons name="calendar" size={18} color="#0B3D2E" />
              <Text style={styles.dtHeaderTitle}>Date & Time</Text>
            </View>
            <View style={styles.dtSelectedBadge}>
              <Text style={styles.dtSelectedText}>
                {DAY_NAMES[date.getDay()]}, {date.getDate()} {MONTH_NAMES[date.getMonth()]}
              </Text>
              <View style={styles.dtDot} />
              <Text style={styles.dtSelectedText}>{formatSlotTime(selectedSlot.h, selectedSlot.m)}</Text>
            </View>
          </View>

          {/* Calendar Strip */}
          <Text style={styles.dtSubLabel}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarStrip}
            style={{ marginBottom: 20 }}
          >
            {calendarDays.map((d, i) => {
              const active = isSameDay(d, date);
              const isToday = i === 0;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayCard, active && styles.dayCardActive]}
                  onPress={() => {
                    setDate(d);
                    if (isSlotPast(selectedSlot.h, selectedSlot.m)) setSelectedSlot({ h: 10, m: 0 });
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayName, active && styles.dayNameActive]}>
                    {isToday ? "Today" : DAY_NAMES[d.getDay()]}
                  </Text>
                  <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.getDate()}</Text>
                  <Text style={[styles.dayMonth, active && styles.dayMonthActive]}>{MONTH_NAMES[d.getMonth()]}</Text>
                  {active && <View style={styles.dayActiveDot} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slots */}
          <Text style={styles.dtSubLabel}>Select Time</Text>
          <View style={styles.slotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const past = isSlotPast(slot.h, slot.m);
              const active = selectedSlot.h === slot.h;
              return (
                <TouchableOpacity
                  key={slot.h}
                  style={[
                    styles.slot,
                    active && styles.slotActive,
                    past && styles.slotPast,
                  ]}
                  onPress={() => { if (!past) setSelectedSlot({ h: slot.h, m: 0 }); }}
                  activeOpacity={past ? 1 : 0.75}
                  disabled={past}
                >
                  <Text style={[styles.slotTime, active && styles.slotTimeActive, past && styles.slotTimePast]}>
                    {slot.label}
                  </Text>
                  {past && <Text style={styles.slotPastLabel}>Past</Text>}
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

        {/* Pickup & Drop + Location — combined section */}
        <View style={[styles.section, ambulance && !selectedLocation && styles.sectionRequired]}>

          {/* Header with toggle */}
          <View style={styles.ambulanceHeader}>
            <View style={styles.ambulanceIconBox}>
              <Text style={{ fontSize: 22 }}>🚗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Pickup & Drop</Text>
              <Text style={styles.ambulanceSub}>Door-to-door pet transport</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleTrack, ambulance && styles.toggleTrackOn]}
              onPress={() => { setAmbulance(!ambulance); if (ambulance) clearLocation(); }}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, ambulance && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {ambulance && (
            <>
              {/* Vehicle availability */}
              {vehicleChecking ? (
                <View style={styles.vehicleStatusRow}>
                  <ActivityIndicator size="small" color="#0B3D2E" />
                  <Text style={styles.vehicleStatusText}>Checking vehicle availability...</Text>
                </View>
              ) : !vehicleAvailable ? (
                <View style={[styles.vehicleStatusRow, styles.vehicleUnavailable]}>
                  <Ionicons name="close-circle" size={15} color="#C62828" />
                  <Text style={[styles.vehicleStatusText, { color: "#C62828" }]}>Vehicle unavailable for this slot. Choose another time.</Text>
                </View>
              ) : (
                <View style={[styles.vehicleStatusRow, styles.vehicleAvailable]}>
                  <Ionicons name="checkmark-circle" size={15} color="#2E7D32" />
                  <Text style={[styles.vehicleStatusText, { color: "#2E7D32" }]}>Vehicle available for this slot ✓</Text>
                </View>
              )}

              {/* Fare info strip */}
              <View style={styles.fareStrip}>
                <View style={styles.fareStripItem}>
                  <Text style={styles.fareStripVal}>₹500</Text>
                  <Text style={styles.fareStripLabel}>Upto 5 km</Text>
                </View>
                <View style={styles.fareStripDivider} />
                <View style={styles.fareStripItem}>
                  <Text style={styles.fareStripVal}>+₹100</Text>
                  <Text style={styles.fareStripLabel}>Per 2 km after</Text>
                </View>
                <View style={styles.fareStripDivider} />
                <View style={styles.fareStripItem}>
                  <Text style={[styles.fareStripVal, { color: ambulanceFare > 0 ? "#0B3D2E" : "#bbb" }]}>
                    {ambulanceFare > 0 ? `₹${ambulanceFare}` : "—"}
                  </Text>
                  <Text style={styles.fareStripLabel}>Your fare</Text>
                </View>
              </View>

              {/* Location section */}
              <View style={styles.locLabel}>
                <Ionicons name="location" size={14} color="#0B3D2E" />
                <Text style={styles.locLabelText}>Your Pickup Location</Text>
                {ambulance && !selectedLocation && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>Required</Text>
                  </View>
                )}
              </View>

              {/* Two option buttons */}
              {!selectedLocation && (
                <View style={styles.locOptionsRow}>
                  <TouchableOpacity
                    style={styles.locOptionBtn}
                    onPress={useCurrentLocation}
                    activeOpacity={0.8}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator size="small" color="#0B3D2E" />
                    ) : (
                      <Ionicons name="navigate" size={20} color="#0B3D2E" />
                    )}
                    <Text style={styles.locOptionTitle}>Current Location</Text>
                    <Text style={styles.locOptionSub}>{gpsLoading ? "Fetching..." : "Use GPS"}</Text>
                  </TouchableOpacity>

                  <View style={styles.locOptionOr}>
                    <View style={styles.locOrLine} />
                    <Text style={styles.locOrText}>OR</Text>
                    <View style={styles.locOrLine} />
                  </View>

                  <TouchableOpacity
                    style={styles.locOptionBtn}
                    onPress={() => { setLocationMode("manual"); setGpsError(null); }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={20} color="#0B3D2E" />
                    <Text style={styles.locOptionTitle}>Search Address</Text>
                    <Text style={styles.locOptionSub}>Type manually</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* GPS error — in-app banner, no Alert popup */}
              {gpsError && (
                <View style={styles.gpsErrorBox}>
                  <Ionicons name="warning-outline" size={15} color="#B8860B" />
                  <Text style={styles.gpsErrorText}>{gpsError}</Text>
                  <TouchableOpacity onPress={() => setGpsError(null)}>
                    <Ionicons name="close" size={15} color="#B8860B" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual search input — shown when manual mode selected or typing */}
              {!selectedLocation && locationMode === "manual" && (
                <View style={{ marginTop: 10 }}>
                  <View style={styles.locationInputRow}>
                    <Ionicons name="search-outline" size={16} color="#0B3D2E" />
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Search area, colony, city..."
                      placeholderTextColor="#aaa"
                      value={locationQuery}
                      onChangeText={searchLocation}
                      returnKeyType="search"
                      autoFocus
                    />
                    {locationSearching && <ActivityIndicator size="small" color="#0B3D2E" />}
                    {locationQuery.length > 0 && !locationSearching && (
                      <TouchableOpacity onPress={() => { setLocationQuery(""); setLocationSuggestions([]); }}>
                        <Ionicons name="close-circle" size={16} color="#aaa" />
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
                          <Ionicons name="location-outline" size={13} color="#3E7B27" />
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.display_name.split(",").slice(0, 4).join(",")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Selected location display */}
              {selectedLocation && (
                <View style={styles.selectedLocCard}>
                  <View style={styles.selectedLocLeft}>
                    <View style={styles.selectedLocIcon}>
                      <Ionicons
                        name={locationMode === "gps" ? "navigate" : "location"}
                        size={16} color="#fff"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedLocName} numberOfLines={2}>{selectedLocation.name}</Text>
                      <Text style={styles.selectedLocMeta}>
                        {locationMode === "gps" ? "📡 GPS Location" : "🔍 Searched"} · {ambulanceKm} km from resort
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={clearLocation} style={styles.selectedLocChange}>
                    <Text style={styles.selectedLocChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Payment Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Mode</Text>
          <View style={[styles.paymentBtn, styles.paymentBtnActive, { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }]}>
            <Ionicons name="card-outline" size={20} color="#A8D96C" />
            <View>
              <Text style={[styles.paymentBtnText, styles.paymentBtnTextActive]}>Coordinate with staff for payment</Text>
              {/* <Text style={styles.paymentGstLabel}>18% GST applicable</Text> */}
            </View>
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
            blurOnSubmit
            returnKeyType="done"
          />
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>💰 Price Breakdown</Text>

          {/* Service fee row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelCol}>
              <Text style={styles.summaryLabel}>Service Fee</Text>
              {selectedOption && !isVaccination && (
                <Text style={styles.summaryMeta}>{selectedOption.label}</Text>
              )}
              {isVaccination && selectedVaccine && (
                <Text style={styles.summaryMeta}>Vaccine: {selectedVaccine.label}</Text>
              )}
              {isOffHours && isConsultation && (
                <Text style={[styles.summaryMeta, { color: "#B8860B" }]}>Off-hours rate applied</Text>
              )}
            </View>
            <Text style={styles.summaryValue}>{consultFee > 0 ? `₹${consultFee}` : "On Request"}</Text>
          </View>

          {/* Pickup & Drop row */}
          {ambulance && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelCol}>
                <Text style={styles.summaryLabel}>🚗 Pickup & Drop</Text>
                {ambulanceKm > 0 && (
                  <Text style={styles.summaryMeta}>
                    {ambulanceKm} km · {ambulanceKm <= 5 ? "Flat ₹500" : `₹500 + ₹${ambulanceFare - 500} extra`}
                  </Text>
                )}
                {selectedLocation && (
                  <Text style={styles.summaryMeta} numberOfLines={1}>📍 {selectedLocation.name}</Text>
                )}
              </View>
              <Text style={styles.summaryValue}>{ambulanceFare > 0 ? `₹${ambulanceFare}` : "—"}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.summaryDivider} />

          {/* Subtotal */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal}</Text>
          </View>

          {/* GST disabled
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelCol}>
              <Text style={[styles.summaryLabel, { color: "#B8860B" }]}>GST (18%)</Text>
              <Text style={styles.summaryMeta}>18% of ₹{subtotal}</Text>
            </View>
            <Text style={[styles.summaryValue, { color: "#B8860B" }]}>₹{gstAmount}</Text>
          </View>
          */}

          {/* Total */}
          <View style={styles.summaryTotalRow}>
            <View>
              <Text style={styles.summaryTotalLabel}>Total Payable</Text>
            </View>
            <Text style={styles.summaryTotalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#3E7B27" />
          <Text style={styles.infoText}>
            Your request will be sent to the Doggos Heaven team. Once confirmed, please coordinate with our staff for payment.
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 120 },

  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 16,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A8D96C", marginTop: 1 },

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

  // Date & Time
  dtHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 16,
  },
  dtHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dtHeaderTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 0 },
  dtSelectedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#0B3D2E", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  dtDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#A8D96C" },
  dtSelectedText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  dtSubLabel: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#888",
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },

  // Calendar strip
  calendarStrip: { paddingBottom: 4, gap: 8 },
  dayCard: {
    width: 62, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6,
    borderRadius: 16, backgroundColor: "#F0F7F0",
    borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  dayCardActive: {
    backgroundColor: "#0B3D2E", borderColor: "#0B3D2E",
    shadowColor: "#0B3D2E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
  dayName: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#888", marginBottom: 6 },
  dayNameActive: { color: "#A8D96C" },
  dayNum: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#0B3D2E", lineHeight: 26 },
  dayNumActive: { color: "#fff" },
  dayMonth: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#aaa", marginTop: 4 },
  dayMonthActive: { color: "rgba(168,217,108,0.7)" },
  dayActiveDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: "#A8D96C", marginTop: 6,
  },

  // Time slots — 3 per row
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "30.5%", alignItems: "center", paddingVertical: 12,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#D4EDD4",
    backgroundColor: "#F8FFF8",
  },
  slotActive: {
    backgroundColor: "#0B3D2E", borderColor: "#0B3D2E",
    shadowColor: "#0B3D2E", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  slotPast: { backgroundColor: "#F5F5F5", borderColor: "#EBEBEB", opacity: 0.45 },
  slotTime: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  slotTimeActive: { color: "#A8D96C" },
  slotTimePast: { color: "#ccc" },
  slotPastLabel: { fontSize: 9, fontFamily: "Inter_400Regular", color: "#ccc", marginTop: 2 },

  notesInput: {
    backgroundColor: "#F0F7F0", borderRadius: 10, padding: 12,
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A",
    borderWidth: 1, borderColor: "#D4EDD4",
    textAlignVertical: "top", minHeight: 80,
  },

  summaryBox: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  summaryTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  summaryLabelCol: { flex: 1, marginRight: 8 },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#444" },
  summaryMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  summaryValue: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  summaryDivider: { height: 1, backgroundColor: "#E0EEE0", marginVertical: 6 },
  summaryTotalRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#0B3D2E", borderRadius: 12, padding: 14, marginTop: 10,
  },
  summaryTotalLabel: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#fff" },
  summaryTotalMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(168,217,108,0.8)", marginTop: 2 },
  summaryTotalValue: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

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

  // Ambulance / Pickup & Drop
  ambulanceHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  ambulanceIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#E8F5E8", justifyContent: "center", alignItems: "center",
  },
  ambulanceSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },

  // iOS-style toggle
  toggleTrack: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: "#ddd", justifyContent: "center", padding: 3,
  },
  toggleTrackOn: { backgroundColor: "#0B3D2E" },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#fff",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  vehicleStatusRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 10, marginBottom: 12,
    backgroundColor: "#F0F7F0",
  },
  vehicleAvailable: { backgroundColor: "#E8F5E8" },
  vehicleUnavailable: { backgroundColor: "#FFEBEE" },
  vehicleStatusText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#0B3D2E", flex: 1 },

  // Fare strip
  fareStrip: {
    flexDirection: "row", backgroundColor: "#F0F7F0",
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  fareStripItem: { flex: 1, alignItems: "center" },
  fareStripVal: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  fareStripLabel: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  fareStripDivider: { width: 1, backgroundColor: "#D4EDD4", marginHorizontal: 4 },

  // Location label
  locLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  locLabelText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", flex: 1 },

  // Two option buttons
  locOptionsRow: { flexDirection: "row", alignItems: "stretch", gap: 0, marginBottom: 4 },
  locOptionBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F0F7F0", borderRadius: 14,
    paddingVertical: 16, gap: 4,
    borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  locOptionTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  locOptionSub: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#888" },
  locOptionOr: {
    width: 32, alignItems: "center", justifyContent: "center", gap: 4,
  },
  locOrLine: { flex: 1, width: 1, backgroundColor: "#D4EDD4" },
  locOrText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#aaa" },

  // Search input
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

  // Selected location card
  selectedLocCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#E8F5E8", borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "#A8D96C", marginTop: 4,
  },
  selectedLocLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  selectedLocIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center",
  },
  selectedLocName: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  selectedLocMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#3E7B27", marginTop: 2 },
  selectedLocChange: {
    backgroundColor: "#0B3D2E", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  selectedLocChangeText: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Required badge
  requiredBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FFEBEE", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  requiredText: { fontSize: 10, fontFamily: "Poppins_700Bold", color: "#C62828" },
  sectionRequired: { borderColor: "#FFCDD2", borderWidth: 1.5 },
  gpsErrorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFF9E6", borderRadius: 10, padding: 10,
    marginTop: 8, borderWidth: 1, borderColor: "#F0C040",
  },
  gpsErrorText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: "#7A6000", lineHeight: 16 },

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
 