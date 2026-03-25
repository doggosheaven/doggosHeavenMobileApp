import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Checkbox,
  Surface,
  Divider,
  useTheme,
  Provider as PaperProvider,
  DefaultTheme,
  SegmentedButtons,
  Menu,
} from "react-native-paper";

// ─── Theme ───────────────────────────────────────────────────────────────────
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#3E7B27",
    secondary: "#85A947",
    background: "#F7F3EA",
    surface: "#FFFFFF",
    onSurface: "#123524",
    outline: "#85A947",
    error: "#D32F2F",
  },
};

// ─── Constants ────────────────────────────────────────────────────────────────
const DOG_BREEDS = [
  "Labrador Retriever",
  "German Shepherd",
  "Golden Retriever",
  "Shih Tzu",
  "Siberian Husky",
  "Poodle (Toy, Miniature, Standard)",
  "Maltipoo",
  "Pug",
  "Beagle",
  "Rottweiler",
  "Doberman Pinscher",
  "Boxer",
  "Great Dane",
  "Saint Bernard",
  "Cocker Spaniel",
  "Lhasa Apso",
  "Dachshund",
  "Chihuahua (Teacup & Standard)",
  "Pitbull Terrier",
  "Akita Inu",
  "Dalmatian",
  "French Bulldog",
  "English Bulldog",
  "Border Collie",
  "Bullmastiff",
  "Alaskan Malamute",
  "Cane Corso",
  "Belgian Malinois",
  "Pomeranian",
  "Yorkshire Terrier",
  "Maltese",
  "Samoyed",
  "Jack Russell Terrier",
  "Shiba Inu",
  "Indian Spitz",
  "Rajapalayan",
  "Indie",
  "Other",
];

const SPECIES_OPTIONS = [
  { value: "dog", label: "Dog" },
  { value: "other", label: "Other" },
];

// ─── Helper: today's date string ─────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];

// ─── Sub-components ──────────────────────────────────────────────────────────

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.dot} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const FieldLabel = ({ children }) => (
  <Text style={styles.fieldLabel}>{children}</Text>
);

// Simple dropdown using RN Paper Menu
const DropdownMenu = ({ label, value, options, onSelect }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.dropdownWrapper}>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        contentStyle={styles.menuContent}
        anchor={
          <TouchableOpacity
            onPress={() => setVisible(true)}
            style={styles.dropdownAnchor}
          >
            <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
              {value || label}
            </Text>
            <Text style={styles.dropdownChevron}>▾</Text>
          </TouchableOpacity>
        }
      >
        <ScrollView style={{ maxHeight: 240 }}>
          {options.map((opt) => {
            const optLabel = typeof opt === "string" ? opt : opt.label;
            const optValue = typeof opt === "string" ? opt : opt.value;
            return (
              <Menu.Item
                key={optValue}
                onPress={() => {
                  onSelect(optValue);
                  setVisible(false);
                }}
                title={optLabel}
                titleStyle={styles.menuItemTitle}
              />
            );
          })}
        </ScrollView>
      </Menu>
    </View>
  );
};

// Vaccination row
const VaccinationRow = ({ vaccination, onChange, onRemove }) => (
  <View style={styles.vaccinationRow}>
    <TextInput
      mode="outlined"
      placeholder="Vaccination Name"
      value={vaccination.name}
      onChangeText={(v) => onChange("name", v)}
      style={[styles.input, { flex: 1 }]}
      outlineColor="#85A947"
      activeOutlineColor="#3E7B27"
      dense
    />
    <TextInput
      mode="outlined"
      placeholder="Doses"
      value={vaccination.numberOfDose}
      onChangeText={(v) => onChange("numberOfDose", v)}
      keyboardType="numeric"
      style={[styles.input, { width: 80 }]}
      outlineColor="#85A947"
      activeOutlineColor="#3E7B27"
      dense
    />
    <Button
      mode="contained"
      onPress={onRemove}
      buttonColor="#EF5350"
      textColor="#fff"
      style={styles.removeBtn}
      compact
    >
      ✕
    </Button>
  </View>
);

// Single pet card
const PetCard = ({ pet, petIndex, onUpdate, onRemove, showRemove }) => {
  const handleField = (key, value) => onUpdate(petIndex, key, value);

  const handleVaccinationChange = (vIdx, key, value) => {
    const updated = pet.vaccinations.map((v, i) =>
      i === vIdx ? { ...v, [key]: value } : v
    );
    handleField("vaccinations", updated);
  };

  const handleAddVaccination = () => {
    handleField("vaccinations", [
      ...pet.vaccinations,
      { name: "", numberOfDose: "" },
    ]);
  };

  const handleRemoveVaccination = (vIdx) => {
    handleField(
      "vaccinations",
      pet.vaccinations.filter((_, i) => i !== vIdx)
    );
  };

  return (
    <Surface style={styles.petCard} elevation={1}>
      {/* Pet card header */}
      <View style={styles.petCardHeader}>
        <View style={styles.petCardTitleRow}>
          <View style={styles.dotSmall} />
          <Text style={styles.petCardTitle}>Pet #{petIndex + 1}</Text>
        </View>
        {showRemove && (
          <Button
            mode="contained"
            onPress={onRemove}
            buttonColor="#EF5350"
            textColor="#fff"
            icon="delete"
            compact
            style={styles.removeBtn}
          >
            Remove
          </Button>
        )}
      </View>

      {/* Pet Name */}
      <FieldLabel>Pet Name</FieldLabel>
      <TextInput
        mode="outlined"
        placeholder="Enter pet's name"
        value={pet.name}
        onChangeText={(v) => handleField("name", v)}
        style={styles.input}
        outlineColor="#85A947"
        activeOutlineColor="#3E7B27"
      />

      {/* Species */}
      <FieldLabel>Species</FieldLabel>
      <SegmentedButtons
        value={pet.species}
        onValueChange={(v) => handleField("species", v)}
        buttons={SPECIES_OPTIONS}
        style={styles.segmented}
        theme={{ colors: { secondaryContainer: "#3E7B27", onSecondaryContainer: "#fff" } }}
      />

      {/* Breed */}
      <FieldLabel>Breed</FieldLabel>
      <DropdownMenu
        label="Select a breed"
        value={pet.breed}
        options={pet.species === "dog" ? DOG_BREEDS : ["Other"]}
        onSelect={(v) => handleField("breed", v)}
      />

      {/* Sex */}
      <FieldLabel>Sex</FieldLabel>
      <SegmentedButtons
        value={pet.sex}
        onValueChange={(v) => handleField("sex", v)}
        buttons={[
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
        ]}
        style={styles.segmented}
        theme={{ colors: { secondaryContainer: "#3E7B27", onSecondaryContainer: "#fff" } }}
      />

      {/* Color */}
      <FieldLabel>Color</FieldLabel>
      <TextInput
        mode="outlined"
        placeholder="Enter pet's color"
        value={pet.color}
        onChangeText={(v) => handleField("color", v)}
        style={styles.input}
        outlineColor="#85A947"
        activeOutlineColor="#3E7B27"
      />

      {/* Date of Birth */}
      <FieldLabel>Date of Birth</FieldLabel>
      <TextInput
        mode="outlined"
        placeholder="YYYY-MM-DD"
        value={pet.dob}
        onChangeText={(v) => handleField("dob", v)}
        style={styles.input}
        outlineColor="#85A947"
        activeOutlineColor="#3E7B27"
        right={<TextInput.Icon icon="calendar" color="#3E7B27" />}
      />

      {/* Registration Date */}
      <FieldLabel>Registration Date</FieldLabel>
      <TextInput
        mode="outlined"
        placeholder="YYYY-MM-DD"
        value={pet.registrationDate}
        onChangeText={(v) => handleField("registrationDate", v)}
        style={styles.input}
        outlineColor="#85A947"
        activeOutlineColor="#3E7B27"
        right={<TextInput.Icon icon="calendar" color="#3E7B27" />}
      />

      {/* Neutered */}
      <TouchableOpacity
        onPress={() => handleField("neutered", !pet.neutered)}
        style={styles.checkboxRow}
      >
        <Checkbox
          status={pet.neutered ? "checked" : "unchecked"}
          color="#3E7B27"
          onPress={() => handleField("neutered", !pet.neutered)}
        />
        <Text style={styles.checkboxLabel}>Pet has been neutered/spayed</Text>
      </TouchableOpacity>

      {/* Vaccinations */}
      <Divider style={styles.divider} />
      <SectionHeader title="Vaccinations" />

      {pet.vaccinations.map((v, vIdx) => (
        <VaccinationRow
          key={vIdx}
          vaccination={v}
          onChange={(key, value) => handleVaccinationChange(vIdx, key, value)}
          onRemove={() => handleRemoveVaccination(vIdx)}
        />
      ))}

      <Button
        mode="outlined"
        onPress={handleAddVaccination}
        icon="plus-circle-outline"
        textColor="#3E7B27"
        style={styles.addVaccinationBtn}
      >
        Add Vaccination
      </Button>
    </Surface>
  );
};

// ─── Main Form ────────────────────────────────────────────────────────────────
const emptyPet = () => ({
  name: "",
  species: "dog",
  breed: "",
  sex: "Male",
  color: "",
  dob: "",
  registrationDate: today(),
  neutered: false,
  vaccinations: [],
});

const PetForm = () => {
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pets, setPets] = useState([emptyPet()]);

  const validatePhone = (val) => {
    if (!/^[0-9]{10}$/.test(val)) {
      setPhoneError("Enter a valid 10-digit phone number");
    } else {
      setPhoneError("");
    }
  };

  const handlePhoneChange = (val) => {
    if (val.length <= 10) {
      setPhone(val);
      if (val.length === 10) validatePhone(val);
      else setPhoneError("");
    }
  };

  const handlePetUpdate = (petIndex, key, value) => {
    setPets((prev) =>
      prev.map((p, i) => (i === petIndex ? { ...p, [key]: value } : p))
    );
  };

  const handleAddPet = () => setPets((prev) => [...prev, emptyPet()]);

  const handleRemovePet = (idx) =>
    setPets((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!ownerName || !phone || !address) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }
    if (phoneError) {
      Alert.alert("Validation Error", "Please fix phone number errors.");
      return;
    }
    const formData = { ownerName, phone, email, address, pets };
    console.log("Form Data:", JSON.stringify(formData, null, 2));
    Alert.alert("Success", "Pet registration submitted successfully!");
  };

  return (
    <PaperProvider theme={theme}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <View style={styles.dotMedium} />
          <Text style={styles.pageTitle}>Add New Pet & Owner</Text>
        </View>

        {/* ── Owner Information ─────────────────────────── */}
        <Surface style={styles.section} elevation={1}>
          <SectionHeader title="Owner Information" />

          <FieldLabel>Owner Name *</FieldLabel>
          <TextInput
            mode="outlined"
            placeholder="Enter owner's full name"
            value={ownerName}
            onChangeText={setOwnerName}
            style={styles.input}
            outlineColor="#85A947"
            activeOutlineColor="#3E7B27"
          />

          <FieldLabel>Phone Number *</FieldLabel>
          <TextInput
            mode="outlined"
            placeholder="10-digit phone number"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
            style={styles.input}
            outlineColor={phoneError ? "#D32F2F" : "#85A947"}
            activeOutlineColor={phoneError ? "#D32F2F" : "#3E7B27"}
            error={!!phoneError}
          />
          {!!phoneError && (
            <Text style={styles.errorText}>{phoneError}</Text>
          )}

          <FieldLabel>Email Address</FieldLabel>
          <TextInput
            mode="outlined"
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor="#85A947"
            activeOutlineColor="#3E7B27"
          />

          <FieldLabel>Address *</FieldLabel>
          <TextInput
            mode="outlined"
            placeholder="Enter complete address including city, state, and postal code"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={4}
            style={[styles.input, styles.textarea]}
            outlineColor="#85A947"
            activeOutlineColor="#3E7B27"
          />
        </Surface>

        {/* ── Pet Information ───────────────────────────── */}
        <Surface style={styles.section} elevation={1}>
          <SectionHeader title="Pet Information" />

          {pets.map((pet, idx) => (
            <PetCard
              key={idx}
              pet={pet}
              petIndex={idx}
              onUpdate={handlePetUpdate}
              onRemove={() => handleRemovePet(idx)}
              showRemove={pets.length > 1 && idx > 0}
            />
          ))}

          <Button
            mode="outlined"
            onPress={handleAddPet}
            icon="plus-circle-outline"
            textColor="#3E7B27"
            style={styles.addPetBtn}
          >
            Add Another Pet
          </Button>
        </Surface>

        {/* ── Submit ────────────────────────────────────── */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          buttonColor="#3E7B27"
          textColor="#fff"
          style={styles.submitBtn}
          contentStyle={styles.submitBtnContent}
          labelStyle={styles.submitBtnLabel}
          icon="paw"
        >
          Submit Pet Registration
        </Button>

        <View style={{ height: 40 }} />
      </ScrollView>
    </PaperProvider>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F3EA",
  },
  container: {
    padding: 16,
    paddingTop: 48,
  },

  // Page header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#123524",
    letterSpacing: -0.5,
  },
  dotMedium: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3E7B27",
  },

  // Sections
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(133,169,71,0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#123524",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#85A947",
  },
  dotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#85A947",
  },
  divider: {
    marginVertical: 16,
    backgroundColor: "rgba(133,169,71,0.3)",
  },

  // Fields
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3E7B27",
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#fff",
    marginBottom: 2,
    fontSize: 14,
  },
  textarea: {
    minHeight: 96,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },

  // Segmented
  segmented: {
    marginBottom: 4,
    borderColor: "#85A947",
  },

  // Dropdown
  dropdownWrapper: {
    marginBottom: 4,
  },
  dropdownAnchor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#85A947",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  dropdownValue: {
    color: "#123524",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownPlaceholder: {
    color: "#aaa",
    fontSize: 14,
  },
  dropdownChevron: {
    color: "#3E7B27",
    fontSize: 16,
  },
  menuContent: {
    backgroundColor: "#fff",
  },
  menuItemTitle: {
    color: "#123524",
    fontSize: 14,
  },

  // Checkbox
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#85A947",
    borderRadius: 10,
    paddingRight: 12,
    backgroundColor: "#fff",
    marginTop: 12,
  },
  checkboxLabel: {
    color: "#123524",
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },

  // Pet card
  petCard: {
    backgroundColor: "rgba(239,227,194,0.2)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(133,169,71,0.2)",
  },
  petCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  petCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  petCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#123524",
  },

  // Vaccinations
  vaccinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  addVaccinationBtn: {
    marginTop: 8,
    borderColor: "#85A947",
    borderRadius: 10,
  },

  // Buttons
  removeBtn: {
    borderRadius: 8,
  },
  addPetBtn: {
    marginTop: 8,
    borderColor: "#3E7B27",
    borderRadius: 10,
  },
  submitBtn: {
    borderRadius: 14,
    marginTop: 8,
    elevation: 4,
  },
  submitBtnContent: {
    paddingVertical: 8,
  },
  submitBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default PetForm;