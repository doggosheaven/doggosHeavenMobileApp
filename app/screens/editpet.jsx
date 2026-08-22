import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../components/Header";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useApp } from "../../context/AppContext";

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

const fmtDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateInput = (val, prev) => {
  const digits = val.replace(/\D/g, "");
  if (val.length < (prev || "").length) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`;
  }
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
  return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4,8)}`;
};

const parseDMY = (str) => {
  if (!str || !str.trim()) return "";
  const parts = str.trim().split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

const emptyVac = () => ({ name: "", date: "", serialNumber: "", nextDueDate: "" });

function BreedPicker({ visible, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = DOG_BREEDS.filter((b) => b.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.box}>
          <View style={modal.header}>
            <Text style={modal.title}>Select Breed</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#0B3D2E" /></TouchableOpacity>
          </View>
          <View style={modal.searchBox}>
            <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
            <TextInput style={modal.searchInput} placeholder="Search breed..." placeholderTextColor="#aaa" value={search} onChangeText={setSearch} />
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

const Label = ({ text }) => <Text style={styles.label}>{text}</Text>;

const InputBox = ({ icon, ...props }) => (
  <View style={styles.inputBox}>
    {icon && <Ionicons name={icon} size={18} color="#3E7B27" style={styles.inputIcon} />}
    <TextInput style={styles.input} placeholderTextColor="#aaa" {...props} />
  </View>
);

const ToggleGroup = ({ options, value, onChange }) => (
  <View style={styles.toggleRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.toggleBtn, value === opt.value && styles.toggleBtnActive]}
        onPress={() => onChange(opt.value)}
        activeOpacity={0.8}
      >
        <Text style={[styles.toggleText, value === opt.value && styles.toggleTextActive]}>{opt.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function EditPetScreen() {
  const router = useRouter();
  const { pet: petParam, petId } = useLocalSearchParams();
  const { pets } = useApp();

  // Callers either hand over the whole pet (My Pets) or just its id (the
  // vaccination list). With only an id, look it up in the pets already loaded.
  const petData = (() => {
    if (petParam) {
      try { return JSON.parse(petParam); } catch { /* fall through */ }
    }
    if (petId) return (pets || []).find((p) => String(p._id) === String(petId)) || {};
    return {};
  })();

  const dobFormatted = fmtDate(petData.dob);
  const [dd, mm, yyyy] = dobFormatted ? dobFormatted.split("/") : ["", "", ""];

  const [form, setForm] = useState({
    name: petData.name || "",
    species: petData.species || "dog",
    customSpecies: ["dog"].includes(petData.species) ? "" : (petData.species || ""),
    breed: petData.breed || "",
    sex: petData.sex || "Male",
    color: petData.color || "",
    dob: petData.dob ? petData.dob.split("T")[0] : "",
    dob_d: dd || "",
    dob_m: mm || "",
    dob_y: yyyy || "",
    neutered: petData.neutered || false,
    vaccinations: (petData.vaccinations || []).map((v) => ({
      name: v.name || "",
      date: fmtDate(v.date),
      serialNumber: v.serialNumber || "",
      nextDueDate: fmtDate(v.nextDueDate),
    })),
  });

  const [image, setImage] = useState(petData.image || null);
  const [loading, setLoading] = useState(false);
  const [breedModal, setBreedModal] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);

  const pickPhoto = async (source) => {
    setPhotoModal(false);
    try {
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") return Alert.alert("Permission needed", "Please allow camera access.");
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!result.canceled) setImage(result.assets[0].uri);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") return Alert.alert("Permission needed", "Please allow photo library access.");
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
        if (!result.canceled) setImage(result.assets[0].uri);
      }
    } catch { Alert.alert("Error", "Could not open camera/gallery."); }
  };

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const addVac = () => set("vaccinations", [...form.vaccinations, emptyVac()]);
  const removeVac = (i) => set("vaccinations", form.vaccinations.filter((_, idx) => idx !== i));
  const updateVac = (i, field, val) =>
    set("vaccinations", form.vaccinations.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Pet name is required.");
    if (!form.dob) return Alert.alert("Error", "Date of birth is required.");

    setLoading(true);
    try {
      const { token } = await getAuth();
      const body = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed,
        sex: form.sex,
        color: form.color,
        dob: form.dob,
        neutered: form.neutered,
        vaccinations: JSON.stringify(
          form.vaccinations.map((v) => ({
            name: v.name,
            date: v.date,
            serialNumber: v.serialNumber,
            nextDueDate: v.nextDueDate,
          }))
        ),
      };

      const formData = new FormData();
      Object.entries(body).forEach(([k, v]) => formData.append(k, v));
      if (image && image.startsWith("file")) {
        formData.append("image", { uri: image, name: "pet.jpg", type: "image/jpeg" });
      }

      const res = await fetch(`${BASE_URL}/api/v1/customer/pet/update/${petData._id}`, {
        method: "PUT",
        headers: { Authorization: token || "" },
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert("Success 🐾", "Pet updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to update pet.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Header title="Edit Pet" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Photo */}
        <Label text="Pet Photo" />
        <TouchableOpacity style={styles.imagePicker} onPress={() => setPhotoModal(true)} activeOpacity={0.8}>
          {image ? (
            <>
              <Image source={{ uri: image }} style={styles.petImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImage(null)}>
                <Ionicons name="close-circle" size={22} color="#C62828" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.imagePickerInner}>
              <View style={styles.imageIconBox}>
                <Ionicons name="camera" size={28} color="#A8D96C" />
              </View>
              <Text style={styles.imagePickerText}>Add Pet Photo</Text>
              <Text style={styles.imagePickerSub}>Add from camera or gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        <Label text="Pet Name *" />
        <InputBox icon="paw-outline" placeholder="Pet's name" value={form.name} onChangeText={(v) => set("name", v)} />

        <Label text="Species" />
        <ToggleGroup
          options={[{ value: "dog", label: "🐶 Dog" }, { value: "other", label: "🐾 Other" }]}
          value={form.species}
          onChange={(v) => set("species", v)}
        />
        {form.species === "other" && (
          <InputBox icon="paw-outline" placeholder="Enter species (e.g. Cat, Rabbit...)" value={form.customSpecies || ""} onChangeText={(v) => set("customSpecies", v)} />
        )}

        <Label text="Breed" />
        <TouchableOpacity style={styles.selectBox} onPress={() => setBreedModal(true)} activeOpacity={0.8}>
          <Ionicons name="list-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
          <Text style={form.breed ? styles.selectValue : styles.selectPlaceholder}>
            {form.breed || "Select a breed"}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#aaa" />
        </TouchableOpacity>
        <BreedPicker visible={breedModal} onSelect={(v) => set("breed", v)} onClose={() => setBreedModal(false)} />

        <Label text="Sex" />
        <ToggleGroup
          options={[{ value: "Male", label: "♂ Male" }, { value: "Female", label: "♀ Female" }]}
          value={form.sex}
          onChange={(v) => set("sex", v)}
        />

        <Label text="Color" />
        <InputBox icon="color-palette-outline" placeholder="e.g. Golden, Black & White" value={form.color} onChangeText={(v) => set("color", v)} />

        <Label text="Date of Birth *" />
        <View style={styles.dobRow}>
          <View style={[styles.inputBox, styles.dobField]}>
            <TextInput
              style={styles.input} placeholder="DD" placeholderTextColor="#aaa"
              value={form.dob_d} keyboardType="numeric" maxLength={2}
              onChangeText={(v) => {
                if (v.length <= 2) {
                  const newD = v;
                  const newDob = (newD.length === 2 && form.dob_m.length === 2 && form.dob_y.length === 4)
                    ? `${form.dob_y}-${form.dob_m}-${newD}` : form.dob;
                  setForm((prev) => ({ ...prev, dob_d: newD, dob: newDob }));
                }
              }}
            />
          </View>
          <Text style={styles.dobSep}>/</Text>
          <View style={[styles.inputBox, styles.dobField]}>
            <TextInput
              style={styles.input} placeholder="MM" placeholderTextColor="#aaa"
              value={form.dob_m} keyboardType="numeric" maxLength={2}
              onChangeText={(v) => {
                if (v.length <= 2) {
                  const newM = v;
                  const newDob = (form.dob_d.length === 2 && newM.length === 2 && form.dob_y.length === 4)
                    ? `${form.dob_y}-${newM}-${form.dob_d}` : form.dob;
                  setForm((prev) => ({ ...prev, dob_m: newM, dob: newDob }));
                }
              }}
            />
          </View>
          <Text style={styles.dobSep}>/</Text>
          <View style={[styles.inputBox, { flex: 2 }]}>
            <TextInput
              style={styles.input} placeholder="YYYY" placeholderTextColor="#aaa"
              value={form.dob_y} keyboardType="numeric" maxLength={4}
              onChangeText={(v) => {
                if (v.length <= 4) {
                  const newY = v;
                  const newDob = (form.dob_d.length === 2 && form.dob_m.length === 2 && newY.length === 4)
                    ? `${newY}-${form.dob_m}-${form.dob_d}` : form.dob;
                  setForm((prev) => ({ ...prev, dob_y: newY, dob: newDob }));
                }
              }}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.checkRow} onPress={() => set("neutered", !form.neutered)} activeOpacity={0.8}>
          <View style={[styles.checkbox, form.neutered && styles.checkboxChecked]}>
            {form.neutered && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.checkLabel}>Pet has been neutered / spayed</Text>
        </TouchableOpacity>

        {/* Vaccinations */}
        <View style={styles.vacSection}>
          <Text style={styles.vacTitle}>💉 Vaccinations</Text>
          {form.vaccinations.map((v, i) => (
            <View key={i} style={styles.vacCard}>
              <View style={styles.vacCardHeader}>
                <Text style={styles.vacCardTitle}>Vaccine #{i + 1}</Text>
                <TouchableOpacity style={styles.vacRemoveBtn} onPress={() => removeVac(i)}>
                  <Ionicons name="close" size={16} color="#C62828" />
                </TouchableOpacity>
              </View>

              <Text style={styles.vacLabel}>Vaccine Name</Text>
              <View style={[styles.inputBox, { marginBottom: 8 }]}>
                <Ionicons name="medical-outline" size={16} color="#3E7B27" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="e.g. Rabies, Parvovirus" placeholderTextColor="#aaa" value={v.name} onChangeText={(val) => updateVac(i, "name", val)} />
              </View>

              <Text style={styles.vacLabel}>Date Given (DD/MM/YYYY)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="e.g. 10/03/2024"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={10}
                value={v.date}
                onChangeText={(val) => updateVac(i, "date", formatDateInput(val, v.date))}
              />

              <Text style={styles.vacLabel}>Serial Number</Text>
              <View style={[styles.inputBox, { marginBottom: 8 }]}>
                <Ionicons name="barcode-outline" size={16} color="#3E7B27" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="e.g. VAC-2024-001" placeholderTextColor="#aaa" value={v.serialNumber} onChangeText={(val) => updateVac(i, "serialNumber", val)} />
              </View>

              <Text style={styles.vacLabel}>Next Due Date (DD/MM/YYYY)</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="e.g. 10/03/2025"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
                maxLength={10}
                value={v.nextDueDate}
                onChangeText={(val) => updateVac(i, "nextDueDate", formatDateInput(val, v.nextDueDate))}
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addVacBtn} onPress={addVac} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={16} color="#3E7B27" />
            <Text style={styles.addVacText}>Add Vaccination</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Source Modal */}
        <Modal visible={photoModal} transparent animationType="fade" onRequestClose={() => setPhotoModal(false)}>
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setPhotoModal(false)}>
            <View style={modal.photoBox}>
              <Text style={modal.photoTitle}>Pet Photo</Text>
              <TouchableOpacity style={modal.photoBtn} onPress={() => pickPhoto("camera")} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={22} color="#0B3D2E" />
                <Text style={modal.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.photoBtn} onPress={() => pickPhoto("gallery")} activeOpacity={0.8}>
                <Ionicons name="image-outline" size={22} color="#0B3D2E" />
                <Text style={modal.photoBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.photoCancel} onPress={() => setPhotoModal(false)}>
                <Text style={modal.photoCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#A8D96C" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={22} color="#A8D96C" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 16, paddingBottom: 100 },

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

  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 2 },
  toggleBtn: {
    flex: 1, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#F0F7F0", borderWidth: 1, borderColor: "#D4EDD4",
  },
  toggleBtnActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  toggleText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#666" },
  toggleTextActive: { color: "#A8D96C" },

  dobRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  dobField: { flex: 1 },
  dobSep: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 2 },

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
  dateInput: {
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46,
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A", marginBottom: 8,
  },
  vacRemoveBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: "#FFF0F0", justifyContent: "center", alignItems: "center",
  },
  addVacBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 10, justifyContent: "center",
    borderWidth: 1, borderColor: "#A8D96C", borderRadius: 10,
    borderStyle: "dashed", marginTop: 4,
  },
  addVacText: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    elevation: 4, marginTop: 20,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  box: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "75%" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  title: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  searchBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F7F0" },
  itemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  photoBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  photoTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 16, textAlign: "center" },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#D4EDD4" },
  photoBtnText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  photoCancel: { alignItems: "center", marginTop: 6, padding: 12 },
  photoCancelText: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
});
