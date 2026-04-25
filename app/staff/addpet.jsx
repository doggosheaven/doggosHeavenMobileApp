import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch, Image, Modal,
  KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DatePickerField, { dateToISO } from "../../components/DatePickerField";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const BREEDS = [
  "Labrador Retriever","German Shepherd","Golden Retriever","Shih Tzu","Siberian Husky",
  "Poodle","Maltipoo","Pug","Beagle","Rottweiler","Doberman Pinscher","Boxer",
  "Great Dane","Saint Bernard","Cocker Spaniel","Lhasa Apso","Dachshund","Chihuahua",
  "Pitbull Terrier","Akita Inu","Dalmatian","French Bulldog","English Bulldog",
  "Border Collie","Pomeranian","Yorkshire Terrier","Maltese","Samoyed","Shiba Inu",
  "Indian Spitz","Rajapalayan","Gaddi Kutta","Indie","Other",
];

function BreedPickerModal({ visible, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = BREEDS.filter((b) => b.toLowerCase().includes(search.toLowerCase()));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.breedOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={s.breedBox}>
          <View style={s.breedHeader}>
            <Text style={s.breedTitle}>Select Breed</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#0B3D2E" /></TouchableOpacity>
          </View>
          <View style={s.breedSearch}>
            <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 6 }} />
            <TextInput style={s.breedSearchInput} placeholder="Search breed..." placeholderTextColor="#aaa" value={search} onChangeText={setSearch} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((b) => (
              <TouchableOpacity key={b} style={s.breedItem} onPress={() => { onSelect(b); onClose(); }}>
                <Text style={s.breedItemText}>{b}</Text>
                <Ionicons name="chevron-forward" size={14} color="#A8D96C" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const emptyVacc = () => ({ name: "", date: null, serialNumber: "", nextDueDate: null });
const emptyPet = () => ({
  name: "", species: "dog", customSpecies: "", breed: "", customBreed: "",
  sex: "Male", color: "", dob: null, neutered: false,
  registrationDate: new Date(),
  vaccinations: [], photo: null,
});

// Auto-format DD/MM/YYYY with slashes
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

// DD/MM/YYYY → YYYY-MM-DD
const toISO = (v) => {
  const p = v.split("/");
  if (p.length !== 3 || p[2].length !== 4) return "";
  return `${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;
};

const isValidDate = (v) => {
  const iso = toISO(v);
  if (!iso) return false;
  const d = new Date(iso);
  return !isNaN(d.getTime());
};

// ── Reusable field components ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function Input({ value, onChangeText, placeholder, keyboard, max, multiline }) {
  return (
    <TextInput
      style={[s.input, multiline && { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
      placeholder={placeholder} placeholderTextColor="#aaa"
      value={value} onChangeText={onChangeText}
      keyboardType={keyboard || "default"}
      autoCapitalize="none" maxLength={max} multiline={multiline}
    />
  );
}

function SegControl({ options, value, onChange }) {
  return (
    <View style={s.segRow}>
      {options.map((o) => (
        <TouchableOpacity key={o} style={[s.seg, value === o && s.segActive]} onPress={() => onChange(o)}>
          <Text style={[s.segTxt, value === o && s.segTxtActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function StaffAddPet() {
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pets, setPets] = useState([emptyPet()]);
  const [saving, setSaving] = useState(false);
  const [breedModal, setBreedModal] = useState(null);
  const [photoModal, setPhotoModal] = useState(null);
  const [pendingPhoto, setPendingPhoto] = useState(null); // { pi, source }

  // ask permission on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // pendingPhoto state
  useEffect(() => {
    if (!pendingPhoto) return;
    const { pi, source } = pendingPhoto;
    setPendingPhoto(null);
    openPicker(pi, source);
  }, [pendingPhoto]);

  const openPicker = async (pi, source) => {
    try {
      if (source === "camera") {
        const perm = await ImagePicker.getCameraPermissionsAsync();
        if (perm.status !== "granted") {
          const ask = await ImagePicker.requestCameraPermissionsAsync();
          if (ask.status !== "granted") {
            Alert.alert(
              "Camera Permission Required",
              "Please allow camera access in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true, aspect: [1, 1], quality: 0.7,
        });
        if (!result.canceled && result.assets?.length > 0)
          updatePet(pi, "photo", result.assets[0].uri);
      } else {
        const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
          const ask = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (ask.status !== "granted") {
            Alert.alert(
              "Photo Library Permission Required",
              "Please allow photo library access in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: () => Linking.openSettings() },
              ]
            );
            return;
          }
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true, aspect: [1, 1], quality: 0.7,
          mediaTypes: "images",
        });
        if (!result.canceled && result.assets?.length > 0)
          updatePet(pi, "photo", result.assets[0].uri);
      }
    } catch (e) {
      console.log("Photo error:", e);
      Alert.alert("Error", "Could not open camera/gallery.");
    }
  };

  const pickPhoto = (pi, source) => {
    setPhotoModal(null);
    setTimeout(() => setPendingPhoto({ pi, source }), 600);
  };

  const updatePet = (i, field, val) =>
    setPets((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const addVacc = (i) =>
    setPets((prev) => prev.map((p, idx) => idx === i
      ? { ...p, vaccinations: [...p.vaccinations, emptyVacc()] } : p));

  const updateVacc = (pi, vi, field, val) =>
    setPets((prev) => prev.map((p, idx) => {
      if (idx !== pi) return p;
      const v = [...p.vaccinations];
      v[vi] = { ...v[vi], [field]: val };
      return { ...p, vaccinations: v };
    }));

  const removeVacc = (pi, vi) =>
    setPets((prev) => prev.map((p, idx) =>
      idx !== pi ? p : { ...p, vaccinations: p.vaccinations.filter((_, i) => i !== vi) }));

  const handleSubmit = async () => {
    if (!ownerName.trim()) return Alert.alert("Error", "Owner name is required.");
    if (!/^[0-9]{10}$/.test(phone.trim())) return Alert.alert("Error", "Enter a valid 10-digit phone number.");
    if (!address.trim()) return Alert.alert("Error", "Address is required.");
    for (const p of pets) {
      if (!p.name.trim()) return Alert.alert("Error", "Pet name is required.");
      if (p.species === "other" && !p.customSpecies.trim()) return Alert.alert("Error", "Please enter the species name.");
      if (!p.breed && !p.customBreed) return Alert.alert("Error", "Pet breed is required.");
      if (!p.dob) return Alert.alert("Error", "Date of birth is required.");
    }
    setSaving(true);
    try {
      const { token } = await getAuth();
      const formData = new FormData();
      formData.append("ownerName", ownerName.trim());
      formData.append("phone", phone.trim());
      formData.append("email", email.trim());
      formData.append("address", address.trim());

      const petsPayload = pets.map((p) => ({
        name: p.name.trim(),
        species: p.species === "other" ? p.customSpecies.trim() : p.species,
        breed: p.breed === "Other" ? p.customBreed.trim() : p.breed,
        sex: p.sex,
        color: p.color.trim(),
        neutered: p.neutered,
        dob: p.dob ? dateToISO(p.dob) : "",
        registrationDate: p.registrationDate ? dateToISO(p.registrationDate) : "",
        vaccinations: p.vaccinations.map((v) => ({
          name: v.name,
          serialNumber: v.serialNumber,
          date: v.date ? dateToISO(v.date) : "",
          nextDueDate: v.nextDueDate ? dateToISO(v.nextDueDate) : "",
        })),
      }));
      formData.append("pets", JSON.stringify(petsPayload));

      pets.forEach((p, i) => {
        if (p.photo) {
          const uriLower = p.photo.toLowerCase();
          let mimeType = "image/jpeg";
          let ext = "jpg";
          if (uriLower.includes(".png")) { mimeType = "image/png"; ext = "png"; }
          else if (uriLower.includes(".webp")) { mimeType = "image/webp"; ext = "webp"; }
          formData.append(`photo_${i}`, {
            uri: p.photo,
            name: `pet_${i}.${ext}`,
            type: mimeType,
          });
        }
      });

      const res = await fetch(`${BASE_URL}/api/v1/pet/addpet`, {
        method: "POST",
        headers: { Authorization: token || "" },
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        Alert.alert("\u2705 Success", "Pet registered successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else Alert.alert("Error", json.message || "Failed to register.");
    } catch (e) { console.log(e); Alert.alert("Error", "Network error. Please try again."); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Pet & Owner</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Owner Section ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>👤 Owner Information</Text>
          <Field label="Owner Name *">
            <Input value={ownerName} onChangeText={setOwnerName} placeholder="Full name" />
          </Field>
          <Field label="Phone *">
            <Input value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboard="number-pad" max={10} />
          </Field>
          <Field label="Email">
            <Input value={email} onChangeText={setEmail} placeholder="Email address" keyboard="email-address" />
          </Field>
          <Field label="Address *">
            <Input value={address} onChangeText={setAddress} placeholder="Full address" multiline />
          </Field>
        </View>

        {/* ── Pet Sections ── */}
        {pets.map((pet, pi) => (
          <View key={pi} style={s.section}>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>🐾 Pet #{pi + 1}</Text>
              {pi > 0 && (
                <TouchableOpacity onPress={() => setPets((p) => p.filter((_, i) => i !== pi))}>
                  <Ionicons name="trash-outline" size={18} color="#C62828" />
                </TouchableOpacity>
              )}
            </View>

            {/* Photo */}
            <Field label="Pet Photo">
              <TouchableOpacity style={s.imagePicker} onPress={() => setPhotoModal(pi)} activeOpacity={0.8}>
                {pet.photo ? (
                  <>
                    <Image source={{ uri: pet.photo }} style={s.petImage} />
                    <TouchableOpacity style={s.removeImageBtn} onPress={() => updatePet(pi, "photo", null)}>
                      <Ionicons name="close-circle" size={22} color="#C62828" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={s.imagePickerInner}>
                    <View style={s.imageIconBox}>
                      <Ionicons name="camera" size={28} color="#A8D96C" />
                    </View>
                    <Text style={s.imagePickerText}>Add Pet Photo</Text>
                    <Text style={s.imagePickerSub}>Tap to add from Camera or Gallery</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Field>

            {/* Name */}
            <Field label="Pet Name *">
              <Input value={pet.name} onChangeText={(v) => updatePet(pi, "name", v)} placeholder="Pet's name" />
            </Field>

            {/* Species */}
            <Field label="Species">
              <SegControl
                options={["dog", "other"]}
                value={pet.species}
                onChange={(v) => updatePet(pi, "species", v)}
              />
              {pet.species === "other" && (
                <TextInput
                  style={[s.input, { marginTop: 8 }]}
                  placeholder="Enter species (e.g. Cat, Rabbit, Bird...)"
                  placeholderTextColor="#aaa"
                  value={pet.customSpecies}
                  onChangeText={(v) => updatePet(pi, "customSpecies", v)}
                />
              )}
            </Field>

            {/* Breed */}
            <Field label="Breed *">
              {pet.species === "dog" ? (
                <>
                  <TouchableOpacity style={s.selectBox} onPress={() => setBreedModal(pi)} activeOpacity={0.8}>
                    <Ionicons name="list-outline" size={18} color="#3E7B27" style={{ marginRight: 8 }} />
                    <Text style={pet.breed ? s.selectValue : s.selectPlaceholder}>{pet.breed || "Select a breed"}</Text>
                    <Ionicons name="chevron-down" size={16} color="#aaa" />
                  </TouchableOpacity>
                  <BreedPickerModal
                    visible={breedModal === pi}
                    onSelect={(b) => updatePet(pi, "breed", b)}
                    onClose={() => setBreedModal(null)}
                  />
                  {pet.breed === "Other" && (
                    <TextInput
                      style={[s.input, { marginTop: 8 }]}
                      placeholder="Enter custom breed"
                      placeholderTextColor="#aaa"
                      value={pet.customBreed}
                      onChangeText={(v) => updatePet(pi, "customBreed", v)}
                    />
                  )}
                </>
              ) : (
                <Input value={pet.breed} onChangeText={(v) => updatePet(pi, "breed", v)} placeholder="Enter breed" />
              )}
            </Field>

            {/* Sex */}
            <Field label="Sex">
              <SegControl options={["Male", "Female"]} value={pet.sex} onChange={(v) => updatePet(pi, "sex", v)} />
            </Field>

            {/* Color */}
            <Field label="Color *">
              <Input value={pet.color} onChangeText={(v) => updatePet(pi, "color", v)} placeholder="e.g. Golden, Black" />
            </Field>

            {/* DOB */}
            <DatePickerField
              label="Date of Birth *"
              value={pet.dob}
              onChange={(d) => updatePet(pi, "dob", d)}
              placeholder="Select date of birth"
              maxDate={new Date()}
            />

            {/* Reg Date */}
            <DatePickerField
              label="Registration Date"
              value={pet.registrationDate}
              onChange={(d) => updatePet(pi, "registrationDate", d)}
              placeholder="Select registration date"
              maxDate={new Date()}
            />

            {/* Neutered */}
            <View style={[s.field, s.switchRow]}>
              <Text style={s.label}>Neutered / Spayed</Text>
              <Switch
                value={pet.neutered}
                onValueChange={(v) => updatePet(pi, "neutered", v)}
                trackColor={{ false: "#D4EDD4", true: "#A8D96C" }}
                thumbColor={pet.neutered ? "#0B3D2E" : "#fff"}
              />
            </View>

            {/* Vaccinations */}
            <View style={s.vaccSection}>
              <View style={s.vaccHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#0B3D2E" />
                <Text style={s.vaccTitle}>Vaccinations</Text>
              </View>

              {pet.vaccinations.map((v, vi) => (
                <View key={vi} style={s.vaccCard}>
                  <View style={s.vaccCardHeader}>
                    <Text style={s.vaccCardNum}>Vaccine #{vi + 1}</Text>
                    <TouchableOpacity onPress={() => removeVacc(pi, vi)}>
                      <Ionicons name="close-circle" size={20} color="#C62828" />
                    </TouchableOpacity>
                  </View>

                  <Field label="Vaccine Name *">
                    <Input value={v.name} onChangeText={(val) => updateVacc(pi, vi, "name", val)} placeholder="e.g. Rabies, Parvovirus" />
                  </Field>
                  <DatePickerField
                    label="Date Given"
                    value={v.date}
                    onChange={(d) => updateVacc(pi, vi, "date", d)}
                    placeholder="Select date given"
                    maxDate={new Date()}
                  />
                  <Field label="Serial Number">
                    <Input value={v.serialNumber} onChangeText={(val) => updateVacc(pi, vi, "serialNumber", val)} placeholder="e.g. VAC-2024-001" />
                  </Field>
                  <DatePickerField
                    label="Next Due Date"
                    value={v.nextDueDate}
                    onChange={(d) => updateVacc(pi, vi, "nextDueDate", d)}
                    placeholder="Select next due date"
                    minDate={new Date()}
                  />
                </View>
              ))}

              <TouchableOpacity style={s.addVaccBtn} onPress={() => addVacc(pi)}>
                <Ionicons name="add-circle-outline" size={18} color="#3E7B27" />
                <Text style={s.addVaccTxt}>Add Vaccination</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Another Pet */}
        <TouchableOpacity style={s.addPetBtn} onPress={() => setPets((p) => [...p, emptyPet()])} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0B3D2E" />
          <Text style={s.addPetTxt}>Add Another Pet</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#A8D96C" /> : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
              <Text style={s.submitTxt}>Submit Registration</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Photo Source Modal */}
      <Modal visible={photoModal !== null} transparent animationType="fade" onRequestClose={() => setPhotoModal(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPhotoModal(null)}>
          <View style={s.photoModalBox}>
            <Text style={s.photoModalTitle}>Add Pet Photo</Text>
            <TouchableOpacity style={s.photoModalBtn} onPress={() => pickPhoto(photoModal, "camera")} activeOpacity={0.8}>
              <Ionicons name="camera-outline" size={22} color="#0B3D2E" />
              <Text style={s.photoModalBtnTxt}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoModalBtn} onPress={() => pickPhoto(photoModal, "gallery")} activeOpacity={0.8}>
              <Ionicons name="image-outline" size={22} color="#0B3D2E" />
              <Text style={s.photoModalBtnTxt}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoModalCancel} onPress={() => setPhotoModal(null)}>
              <Text style={s.photoModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: {
    backgroundColor: "#0B3D2E", paddingHorizontal: 20,
    paddingTop: 52, paddingBottom: 16,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#fff" },
  scroll: { padding: 16 },

  section: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: "#D4EDD4",
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 14 },

  field: { marginBottom: 14 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between",marginTop: 10 },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#D4EDD4", borderRadius: 10,
    backgroundColor: "#F0F7F0", paddingHorizontal: 12, height: 46,
    fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A",
  },

  segRow: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1, borderColor: "#D4EDD4", alignItems: "center", backgroundColor: "#F0F7F0",
  },
  segActive: { backgroundColor: "#0B3D2E", borderColor: "#0B3D2E" },
  segTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#666" },
  segTxtActive: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },



  vaccSection: {
    borderTopWidth: 1, borderTopColor: "#F0F7F0",
    paddingTop: 14, marginTop: 4,
  },
  vaccHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  vaccTitle: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  vaccCard: {
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: "#D4EDD4",
  },
  vaccCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
  },
  vaccCardNum: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  addVaccBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#E8F5E8", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  addVaccTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#3E7B27" },

  addPetBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 14, height: 50,
    borderWidth: 1.5, borderColor: "#D4EDD4", marginBottom: 12,
  },
  addPetTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  submitBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  submitTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },

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

  selectBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 10,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 46,
  },
  selectValue: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  selectPlaceholder: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#aaa" },

  breedOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  breedBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: "75%",
  },
  breedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  breedTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  breedSearch: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, height: 44, marginBottom: 12,
  },
  breedSearchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  breedItem: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F7F0",
  },
  breedItemText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  photoModalBox: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36,
  },
  photoModalTitle: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 16, textAlign: "center" },
  photoModalBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F0F7F0", borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "#D4EDD4",
  },
  photoModalBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  photoModalCancel: { alignItems: "center", marginTop: 6, padding: 12 },
  photoModalCancelTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#C62828" },
});
 