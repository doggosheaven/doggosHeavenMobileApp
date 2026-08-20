import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44;

const ROLE_OPTIONS = {
  admin:      [{ v: "customer", l: "Customer", i: "paw" }, { v: "staff", l: "Staff", i: "medkit" }],
  // No superadmin here on purpose — the system keeps exactly one.
  superadmin: [
    { v: "customer", l: "Customer", i: "paw" },
    { v: "staff", l: "Staff", i: "medkit" },
    { v: "admin", l: "Admin", i: "shield-checkmark" },
  ],
};

// Auto-inserts the slashes so the date matches what the API expects.
const formatDob = (val, prev) => {
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

const emptyForm = (role) => ({
  fullName: "", email: "", phone: "", address: "", role,
  password: "", sendEmail: true,
  addPet: false,
  pet: { name: "", species: "Dog", breed: "", sex: "Male", color: "", dob: "", neutered: false },
});

/**
 * One screen for bringing a person into the system, used by both the admin and
 * superadmin areas. An admin may create customers and staff; a superadmin may
 * create any role. Creating a customer can register their first pet in the same
 * step, and the server emails the new sign-in details.
 */
export default function AddUserScreen({ callerRole = "admin", accent = "#0B3D2E", onAccent = "#A8D96C" }) {
  const router = useRouter();
  const roles = ROLE_OPTIONS[callerRole] || ROLE_OPTIONS.admin;
  const [form, setForm] = useState(emptyForm(roles[0].v));
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setPet = (k, v) => setForm((p) => ({ ...p, pet: { ...p.pet, [k]: v } }));
  const isCustomer = form.role === "customer";

  const submit = async () => {
    if (!form.fullName.trim()) return Alert.alert("Error", "Full name is required.");
    if (!form.email.trim()) return Alert.alert("Error", "Email is required.");
    if (form.phone && form.phone.length !== 10) return Alert.alert("Error", "Phone must be 10 digits.");
    if (form.password && form.password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters.");
    if (isCustomer && form.addPet) {
      if (!form.pet.name.trim()) return Alert.alert("Error", "Pet name is required.");
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.pet.dob)) return Alert.alert("Error", "Pet date of birth must be DD/MM/YYYY.");
    }

    setSaving(true);
    try {
      const { token } = await getAuth();
      const body = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        role: form.role,
        sendEmail: form.sendEmail,
        ...(form.password ? { password: form.password } : {}),
        ...(isCustomer && form.addPet ? { pet: { ...form.pet, name: form.pet.name.trim() } } : {}),
      };

      const res = await fetch(`${BASE_URL}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token || "" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        const lines = [json.message];
        if (json.generatedPassword) lines.push(`\nTemporary password: ${json.generatedPassword}`);
        if (form.sendEmail && !json.emailed) lines.push("\nThe email could not be sent — share the password with them directly.");
        Alert.alert("Account ready ✅", lines.join("\n"), [
          { text: "Add another", onPress: () => setForm(emptyForm(form.role)) },
          { text: "Done", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", json.message || "Could not create the account.");
      }
    } catch { Alert.alert("Error", "Network error"); }
    finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[s.header, { backgroundColor: accent, paddingTop: STATUS_BAR_HEIGHT + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add Person</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.label}>Role</Text>
        <View style={s.roleRow}>
          {roles.map((r) => (
            <TouchableOpacity
              key={r.v}
              style={[s.rolePick, form.role === r.v && { borderColor: accent, backgroundColor: "#F0F7F0" }]}
              onPress={() => set("role", r.v)}
              activeOpacity={0.85}
            >
              <Ionicons name={r.i} size={15} color={accent} />
              <Text style={s.rolePickTxt}>{r.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.section}>DETAILS</Text>
        <Field icon="person-outline" label="Full name *" value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="Full name" />
        <Field icon="mail-outline" label="Email *" value={form.email} onChange={(v) => set("email", v)} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field icon="call-outline" label="Phone" value={form.phone} onChange={(v) => set("phone", v.replace(/\D/g, ""))} placeholder="10 digits" keyboardType="number-pad" maxLength={10} />
        {isCustomer && (
          <Field icon="location-outline" label="Address" value={form.address} onChange={(v) => set("address", v)} placeholder="Optional" />
        )}

        <Text style={s.label}>Password</Text>
        <View style={s.inputBox}>
          <Ionicons name="lock-closed-outline" size={17} color="#3E7B27" />
          <TextInput
            style={s.input}
            placeholder="Leave blank to generate and email one"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            value={form.password}
            onChangeText={(v) => set("password", v)}
          />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>Email login details</Text>
            <Text style={s.switchHint}>The new user receives their email and password by mail</Text>
          </View>
          <Switch
            value={form.sendEmail}
            onValueChange={(v) => set("sendEmail", v)}
            trackColor={{ true: onAccent, false: "#ccc" }}
            thumbColor={form.sendEmail ? accent : "#f4f3f4"}
          />
        </View>

        {/* Pet — customers only */}
        {isCustomer && (
          <>
            <Text style={s.section}>FIRST PET</Text>
            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.switchLabel}>Register their first pet now</Text>
                <Text style={s.switchHint}>So they can start booking straight away</Text>
              </View>
              <Switch
                value={form.addPet}
                onValueChange={(v) => set("addPet", v)}
                trackColor={{ true: onAccent, false: "#ccc" }}
                thumbColor={form.addPet ? accent : "#f4f3f4"}
              />
            </View>

            {form.addPet && (
              <View style={s.petBox}>
                <Field icon="paw-outline" label="Pet name *" value={form.pet.name} onChange={(v) => setPet("name", v)} placeholder="Bruno" />

                <Text style={s.label}>Sex *</Text>
                <View style={s.roleRow}>
                  {["Male", "Female"].map((sx) => (
                    <TouchableOpacity
                      key={sx}
                      style={[s.rolePick, form.pet.sex === sx && { borderColor: accent, backgroundColor: "#F0F7F0" }]}
                      onPress={() => setPet("sex", sx)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={sx === "Male" ? "male" : "female"} size={14} color={accent} />
                      <Text style={s.rolePickTxt}>{sx}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Field icon="calendar-outline" label="Date of birth *" value={form.pet.dob}
                  onChange={(v) => setPet("dob", formatDob(v, form.pet.dob))}
                  placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} />
                <Field icon="git-branch-outline" label="Species" value={form.pet.species} onChange={(v) => setPet("species", v)} placeholder="Dog" />
                <Field icon="ribbon-outline" label="Breed" value={form.pet.breed} onChange={(v) => setPet("breed", v)} placeholder="Labrador" />
                <Field icon="color-palette-outline" label="Colour" value={form.pet.color} onChange={(v) => setPet("color", v)} placeholder="Golden" />

                <View style={s.switchRow}>
                  <Text style={[s.switchLabel, { flex: 1 }]}>Neutered</Text>
                  <Switch
                    value={form.pet.neutered}
                    onValueChange={(v) => setPet("neutered", v)}
                    trackColor={{ true: onAccent, false: "#ccc" }}
                    thumbColor={form.pet.neutered ? accent : "#f4f3f4"}
                  />
                </View>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[s.submit, { backgroundColor: accent }, saving && { opacity: 0.6 }]}
          onPress={submit}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={onAccent} /> : (
            <>
              <Ionicons name="person-add-outline" size={18} color={onAccent} />
              <Text style={[s.submitTxt, { color: onAccent }]}>Create account</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, value, onChange, ...rest }) {
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputBox}>
        <Ionicons name={icon} size={17} color="#3E7B27" />
        <TextInput style={s.input} value={value} onChangeText={onChange} placeholderTextColor="#aaa" {...rest} />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  header: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 34, height: 34, justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Poppins_700Bold", color: "#fff" },

  scroll: { padding: 16 },
  section: {
    fontSize: 11, fontFamily: "Poppins_700Bold", color: "#8A9A8A",
    letterSpacing: 1.2, marginTop: 18, marginBottom: 4,
  },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginTop: 12, marginBottom: 6 },

  inputBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, height: 48,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rolePick: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: "#D4EDD4",
  },
  rolePickTxt: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  switchRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  switchLabel: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  switchHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#8A9A8A", marginTop: 1 },

  petBox: {
    backgroundColor: "#E8F5E8", borderRadius: 14, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: "#D4EDD4",
  },

  submit: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 14, paddingVertical: 15, marginTop: 24, elevation: 2,
  },
  submitTxt: { fontSize: 15, fontFamily: "Poppins_700Bold" },
});
