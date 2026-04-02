import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "../../../components/Header";
import { getAuth } from "../../../utils/authStorage";
import { BASE_URL } from "../../../constants/api";

const DOG_BREEDS = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Shih Tzu",
  "Siberian Husky", "Poodle", "Maltipoo", "Pug", "Beagle", "Rottweiler",
  "Doberman Pinscher", "Boxer", "Great Dane", "Saint Bernard", "Cocker Spaniel",
  "Lhasa Apso", "Dachshund", "Chihuahua", "Pitbull Terrier", "Akita Inu",
  "Dalmatian", "French Bulldog", "English Bulldog", "Border Collie", "Bullmastiff",
  "Alaskan Malamute", "Cane Corso", "Belgian Malinois", "Pomeranian",
  "Yorkshire Terrier", "Maltese", "Samoyed", "Jack Russell Terrier", "Shiba Inu",
  "Indian Spitz", "Rajapalayan", "Indie", "Other",
];

const today = () => new Date().toISOString().split("T")[0];

const emptyPet = () => ({
  name: "", species: "dog", customSpecies: "", breed: "", sex: "Male",
  color: "", dob: "", dob_d: "", dob_m: "", dob_y: "", neutered: false, vaccinations: [], image: null,
});

const emptyVac = () => ({ name: "", date: "", serialNumber: "", nextDueDate: "" });

// Auto-format DD/MM/YYYY
const formatDateInput = (val, prev) => {
  const digits = val.replace(/\D/g, "");
  if (val.length < (prev || "").length) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

// ── Breed Picker Modal ────────────────────────────────────────────────────────
function BreedPicker({ visible, breeds, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = breeds.filter((b) => b.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.box}>
          <View style={modal.header}>
            <Text style={modal.title}>Select Breed</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#0B3D2E" />
            </TouchableOpacity>
          </View>
          <View style={modal.searchBox}>
            <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
            <TextInput
              style={modal.searchInput}
              placeholder="Search breed..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((b) => (
              <TouchableOpacity key={b} style={modal.item} onPress={() => { onSelect(b); onClose(); }}>
                <Text style={modal.itemText}>{b}</Text>
                <Ionicons name="chevron-forward" size={14} color="#A8D96C" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Field Label ───────────────────────────────────────────────────────────────
const Label = ({ text, required }) => (
  <Text style={styles.label}>{text}{required && <Text style={{ color: "#C62828" }}> *</Text>}</Text>
);

// ── Input Box ─────────────────────────────────────────────────────────────────
const InputBox = ({ icon, ...props }) => (
  <View style={styles.inputBox}>
    {icon && <Ionicons name={icon} size={18} color="#3E7B27" style={styles.inputIcon} />}
    <TextInput style={styles.input} placeholderTextColor="#aaa" {...props} />
  </View>
);

// ── Toggle Buttons (Species / Sex) ────────────────────────────────────────────
const ToggleGroup = ({ options, value, onChange }) => (
  <View style={styles.toggleRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.toggleBtn, value === opt.value && styles.toggleBtnActive]}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleText, value === opt.value && styles.toggleTextActive]}>
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ── Photo Source Modal ───────────────────────────────────────────────────────
function PhotoSourceModal({ visible, onCamera, onGallery, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={modal.photoBox}>
          <Text style={modal.photoTitle}>Add Pet Photo</Text>
          <TouchableOpacity style={modal.photoBtn} onPress={onCamera} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={22} color="#0B3D2E" />
            <Text style={modal.photoBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modal.photoBtn} onPress={onGallery} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={22} color="#0B3D2E" />
            <Text style={modal.photoBtnText}>Choose from Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modal.photoCancel} onPress={onClose}>
            <Text style={modal.photoCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Pet Card ──────────────────────────────────────────────────────────────────
function PetCard({ pet, index, onUpdate, onRemove, showRemove }) {
  const [breedModal, setBreedModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);

  const set = (key, val) => onUpdate(index, key, val);

  const addVaccination = () => set("vaccinations", [...pet.vaccinations, emptyVac()]);
  const removeVaccination = (i) => set("vaccinations", pet.vaccinations.filter((_, idx) => idx !== i));
  const updateVaccination = (i, field, val) =>
    set("vaccinations", pet.vaccinations.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  return (
    <View style={styles.petCard}>
      <View style={styles.petCardHeader}>
        <View style={styles.petCardTitleRow}>
          <View style={styles.petDot} />
          <Text style={styles.petCardTitle}>Pet #{index + 1}</Text>
        </View>
        {showRemove && (
          <TouchableOpacity style={styles.removePetBtn} onPress={onRemove}>
            <Ionicons name="trash-outline" size={16} color="#C62828" />
            <Text style={styles.removePetText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pet Image */}
      <Label text="Pet Photo" />
      <TouchableOpacity
        style={styles.imagePicker}
        onPress={() => setPhotoModal(true)}
        activeOpacity={0.8}
      >
        {pet.image ? (
          <>
            <Image source={{ uri: pet.image }} style={styles.petImage} />
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => set("image", null)}>
              <Ionicons name="close-circle" size={22} color="#C62828" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.imagePickerInner}>
            <View style={styles.imageIconBox}>
              <Ionicons name="camera" size={28} color="#A8D96C" />
            </View>
            <Text style={styles.imagePickerText}>Add Pet Photo</Text>
            <Text style={styles.imagePickerSub}>Camera ya Gallery se add karo</Text>
          </View>
        )}
      </TouchableOpacity>

      <PhotoSourceModal
        visible={photoModal}
        onClose={() => setPhotoModal(false)}
        onCamera={async () => {
          setPhotoModal(false);
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow camera access."); return; }
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) set("image", result.assets[0].uri);
        }}
        onGallery={async () => {
          setPhotoModal(false);
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo library access."); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
          if (!result.canceled) set("image", result.assets[0].uri);
        }}
      />

      <Label text="Pet Name" required />
      <InputBox icon="paw-outline" placeholder="Enter pet's name" value={pet.name} onChangeText={(v) => set("name", v)} />

      <Label text="Species" />
      <ToggleGroup
        options={[{ value: "dog", label: "🐶 Dog" }, { value: "other", label: "🐾 Other" }]}
        value={pet.species} onChange={(v) => { set("species", v); set("breed", ""); set("customSpecies", ""); }}
      />
      {pet.species === "other" && (
        <InputBox icon="paw-outline" placeholder="Enter species (e.g. Cat, Rabbit...)" value={pet.customSpecies || ""} onChangeText={(v) => set("customSpecies", v)} />
      )}

      <Label text="Breed" />
      <TouchableOpacity style={styles.selectBox} onPress={() => setBreedModal(true)} activeOpacity={0.8}>
        <Ionicons name="list-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
        <Text style={pet.breed ? styles.selectValue : styles.selectPlaceholder}>
          {pet.breed || "Select a breed"}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#aaa" />
      </TouchableOpacity>
      <BreedPicker
        visible={breedModal}
        breeds={pet.species === "dog" ? DOG_BREEDS : ["Other"]}
        onSelect={(v) => set("breed", v)}
        onClose={() => setBreedModal(false)}
      />

      <Label text="Sex" />
      <ToggleGroup
        options={[{ value: "Male", label: "♂ Male" }, { value: "Female", label: "♀ Female" }]}
        value={pet.sex} onChange={(v) => set("sex", v)}
      />

      <Label text="Color" />
      <InputBox icon="color-palette-outline" placeholder="e.g. Golden, Black & White" value={pet.color} onChangeText={(v) => set("color", v)} />

      <Label text="Date of Birth" required />
      <View style={styles.dobRow}>
        <View style={[styles.inputBox, styles.dobField]}>
          <TextInput
            style={styles.input}
            placeholder="DD"
            placeholderTextColor="#aaa"
            value={pet.dob_d || ""}
            onChangeText={(v) => {
              if (v.length <= 2) {
                set("dob_d", v);
                const mm = pet.dob_m || ""; const yyyy = pet.dob_y || "";
                if (v.length === 2 && mm.length === 2 && yyyy.length === 4) set("dob", `${yyyy}-${mm}-${v}`);
              }
            }}
            keyboardType="numeric" maxLength={2}
          />
        </View>
        <Text style={styles.dobSep}>/</Text>
        <View style={[styles.inputBox, styles.dobField]}>
          <TextInput
            style={styles.input}
            placeholder="MM"
            placeholderTextColor="#aaa"
            value={pet.dob_m || ""}
            onChangeText={(v) => {
              if (v.length <= 2) {
                set("dob_m", v);
                const dd = pet.dob_d || ""; const yyyy = pet.dob_y || "";
                if (dd.length === 2 && v.length === 2 && yyyy.length === 4) set("dob", `${yyyy}-${v}-${dd}`);
              }
            }}
            keyboardType="numeric" maxLength={2}
          />
        </View>
        <Text style={styles.dobSep}>/</Text>
        <View style={[styles.inputBox, { flex: 2 }]}>
          <TextInput
            style={styles.input}
            placeholder="YYYY"
            placeholderTextColor="#aaa"
            value={pet.dob_y || ""}
            onChangeText={(v) => {
              if (v.length <= 4) {
                set("dob_y", v);
                const dd = pet.dob_d || ""; const mm = pet.dob_m || "";
                if (dd.length === 2 && mm.length === 2 && v.length === 4) set("dob", `${v}-${mm}-${dd}`);
              }
            }}
            keyboardType="numeric" maxLength={4}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.checkRow} onPress={() => set("neutered", !pet.neutered)} activeOpacity={0.8}>
        <View style={[styles.checkbox, pet.neutered && styles.checkboxChecked]}>
          {pet.neutered && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.checkLabel}>Pet has been neutered / spayed</Text>
      </TouchableOpacity>

      {/* Vaccinations */}
      <View style={styles.vacSection}>
        <Text style={styles.vacTitle}>💉 Vaccinations</Text>
        {pet.vaccinations.map((v, i) => (
          <View key={i} style={styles.vacCard}>
            <View style={styles.vacCardHeader}>
              <Text style={styles.vacCardTitle}>Vaccine #{i + 1}</Text>
              <TouchableOpacity style={styles.vacRemoveBtn} onPress={() => removeVaccination(i)}>
                <Ionicons name="close" size={16} color="#C62828" />
              </TouchableOpacity>
            </View>

            <Text style={styles.vacLabel}>Vaccine Name</Text>
            <View style={[styles.inputBox, { marginBottom: 8 }]}>
              <Ionicons name="medical-outline" size={16} color="#3E7B27" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rabies, Parvovirus"
                placeholderTextColor="#aaa"
                value={v.name}
                onChangeText={(val) => updateVaccination(i, "name", val)}
              />
            </View>

            <Text style={styles.vacLabel}>Date Given (DD/MM/YYYY)</Text>
            <View style={[styles.inputBox, { marginBottom: 8 }]}>
              <Ionicons name="calendar-outline" size={16} color="#3E7B27" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#aaa"
                value={v.date}
                onChangeText={(val) => updateVaccination(i, "date", formatDateInput(val, v.date))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <Text style={styles.vacLabel}>Serial Number</Text>
            <View style={[styles.inputBox, { marginBottom: 8 }]}>
              <Ionicons name="barcode-outline" size={16} color="#3E7B27" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. VAC-2024-001"
                placeholderTextColor="#aaa"
                value={v.serialNumber}
                onChangeText={(val) => updateVaccination(i, "serialNumber", val)}
              />
            </View>

            <Text style={styles.vacLabel}>Next Due Date (DD/MM/YYYY)</Text>
            <View style={[styles.inputBox, { marginBottom: 0 }]}>
              <Ionicons name="calendar" size={16} color="#E67E22" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#aaa"
                value={v.nextDueDate}
                onChangeText={(val) => updateVaccination(i, "nextDueDate", formatDateInput(val, v.nextDueDate))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addVacBtn} onPress={addVaccination} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={16} color="#3E7B27" />
          <Text style={styles.addVacText}>Add Vaccination</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function PetForm() {
  const router = useRouter();
  const [pets, setPets] = useState([emptyPet()]);
  const [loading, setLoading] = useState(false);

  const updatePet = (index, key, value) =>
    setPets((prev) => prev.map((p, i) => i === index ? { ...p, [key]: value } : p));

  const handleSubmit = async () => {
    for (let i = 0; i < pets.length; i++) {
      const p = pets[i];
      if (!p.name.trim()) return Alert.alert("Error", `Pet #${i + 1}: Name is required.`);
      if (!p.dob.trim()) return Alert.alert("Error", `Pet #${i + 1}: Date of birth is required.`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dob)) return Alert.alert("Error", `Pet #${i + 1}: DOB must be YYYY-MM-DD format.`);
    }

    setLoading(true);
    try {
      const { token } = await getAuth();
      const results = await Promise.all(
        pets.map((pet) => {
          const formData = new FormData();
          formData.append("name", pet.name.trim());
          formData.append("species", pet.species === "other" ? (pet.customSpecies?.trim() || "other") : pet.species);
          formData.append("breed", pet.breed || "");
          formData.append("sex", pet.sex);
          formData.append("color", pet.color || "");
          formData.append("dob", pet.dob);
          formData.append("neutered", String(pet.neutered));
          formData.append("vaccinations", JSON.stringify(pet.vaccinations));
          formData.append("registrationDate", today());
          if (pet.image) formData.append("image", { uri: pet.image, name: "pet.jpg", type: "image/jpeg" });
          return fetch(`${BASE_URL}/api/v1/customer/pet/register`, {
            method: "POST",
            headers: { Authorization: token || "" },
            body: formData,
          }).then((r) => r.json());
        })
      );

      const failed = results.find((r) => !r.success);
      if (failed) {
        Alert.alert("Error", failed.message || "Failed to register pet.");
      } else {
        Alert.alert("Success 🐾", `${pets.length > 1 ? "Pets" : "Pet"} registered successfully!`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Add Pet" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="paw" size={36} color="#A8D96C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Register Your Pet</Text>
            <Text style={styles.heroSub}>Add your furry friend to DoggosHeaven</Text>
          </View>
        </View>

        {/* Pet Cards */}
        {pets.map((pet, i) => (
          <PetCard
            key={i} pet={pet} index={i}
            onUpdate={updatePet}
            onRemove={() => setPets((prev) => prev.filter((_, idx) => idx !== i))}
            showRemove={pets.length > 1}
          />
        ))}

        {/* Add Another Pet */}
        <TouchableOpacity style={styles.addPetBtn} onPress={() => setPets((p) => [...p, emptyPet()])} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={20} color="#0B3D2E" />
          <Text style={styles.addPetText}>Add Another Pet</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#A8D96C" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#A8D96C" />
              <Text style={styles.submitText}>Register {pets.length > 1 ? `${pets.length} Pets` : "Pet"}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16 },

  hero: {
    backgroundColor: "#0B3D2E", borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20, elevation: 3,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1A5C3A", justifyContent: "center", alignItems: "center",
  },
  heroTitle: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff", marginBottom: 4 },
  heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A8D96C" },

  petCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 18,
    marginBottom: 16, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  petCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  petCardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  petDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#A8D96C" },
  petCardTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  removePetBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 6, borderRadius: 8, backgroundColor: "#FFF0F0" },
  removePetText: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#C62828" },

  imagePicker: {
    borderRadius: 14, borderWidth: 1.5, borderColor: "#D4EDD4",
    borderStyle: "dashed", overflow: "hidden", marginBottom: 2,
    backgroundColor: "#F8FFF8", minHeight: 130,
    justifyContent: "center", alignItems: "center",
  },
  imagePickerInner: { alignItems: "center", paddingVertical: 24 },
  imageIconBox: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "#0B3D2E", justifyContent: "center", alignItems: "center", marginBottom: 10,
  },
  imagePickerText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 4 },
  imagePickerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  petImage: { width: "100%", height: 180, borderRadius: 12 },
  removeImageBtn: { position: "absolute", top: 8, right: 8 },

  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 12 },

  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 48, marginBottom: 2,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  selectBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 48, marginBottom: 2,
  },
  selectValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  selectPlaceholder: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#aaa" },

  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 2 },
  toggleBtn: {
    flex: 1, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  toggleBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  toggleText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  toggleTextActive: { color: "#A8D96C" },

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, marginBottom: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: "#D4EDD4",
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F0F7F0",
  },
  checkboxChecked: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  checkLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#333", flex: 1 },

  vacSection: {
    marginTop: 16, backgroundColor: "#F8FFF8", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: "#D4EDD4",
  },
  vacTitle: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 10 },
  vacCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: "#D4EDD4",
  },
  vacCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  vacCardTitle: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  vacLabel: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27", marginBottom: 4, marginTop: 4 },
  vacRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  vacRemoveBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#FFF0F0", justifyContent: "center", alignItems: "center",
  },
  dobRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  dobField: { flex: 1 },
  dobSep: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },
  addVacBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, justifyContent: "center",
    borderWidth: 1, borderColor: "#A8D96C", borderRadius: 10,
    borderStyle: "dashed", marginTop: 4,
  },
  addVacText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  addPetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: "#0B3D2E", borderStyle: "dashed",
    marginBottom: 16,
  },
  addPetText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  submitBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    elevation: 4,
  },
  submitText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  box: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "75%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  item: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  itemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  // Photo source modal
  photoBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  photoTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 16, textAlign: "center" },
  photoBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#D4EDD4",
  },
  photoBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  photoCancel: { alignItems: "center", marginTop: 6, padding: 12 },
  photoCancelText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
});
