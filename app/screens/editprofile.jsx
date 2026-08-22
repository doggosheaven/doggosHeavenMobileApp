import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Header from "../../components/Header";
import { getAuth, saveAuth } from "../../utils/authStorage";
import { BASE_URL } from "../../constants/api";
import { useRouter } from "expo-router";

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [form, setForm] = useState({ fullName: "", phone: "" });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    getAuth().then(({ user }) => {
      if (user) {
        setForm({ fullName: user.fullName || "", phone: user.phone || "" });
        if (user.profilePhoto || user.profileImage) setImage(user.profilePhoto || user.profileImage);
      }
      setInitialized(true);
    });
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    if (form.phone && form.phone.trim().length !== 10) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await getAuth();
      let savedPhotoUrl = user?.profilePhoto || user?.profileImage || null;

      // Step 1: Upload photo if new one selected
      const isNewPhoto = image && (image.startsWith("file") || image.startsWith("content"));
      if (isNewPhoto) {
        const photoForm = new FormData();
        photoForm.append("profilePhoto", {
          uri: image,
          name: "profile.jpg",
          type: "image/jpeg",
        });
        const photoRes = await fetch(`${BASE_URL}/api/v1/auth/updateprofilephoto`, {
          method: "PUT",
          headers: { Authorization: token || "" },
          body: photoForm,
        });
        const photoData = await photoRes.json();
        if (photoData.success) {
          savedPhotoUrl = photoData.profilePhoto;
        } else {
          Alert.alert("Error", photoData.message || "Failed to upload photo.");
          setLoading(false);
          return;
        }
      }

      // Step 2: Update name + phone
      const updateBody = JSON.stringify({ fullName: form.fullName.trim(), phone: form.phone.trim() });
      __DEV__ && console.log("Sending updateprofile body:", updateBody);
      const res = await fetch(`${BASE_URL}/api/v1/auth/updateprofile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          Authorization: token || "",
        },
        body: updateBody,
      });
      const data = await res.json();
      __DEV__ && console.log("updateprofile response:", data);

      if (data.success) {
        await saveAuth(token, {
          ...user,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          profilePhoto: savedPhotoUrl,
          profileImage: savedPhotoUrl,
        });
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }
    } catch (e) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) return <View style={styles.container}><ActivityIndicator size="large" color="#0B3D2E" style={{ flex: 1 }} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Header title="Edit Profile" showBack />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(form.fullName)}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={14} color="#0B3D2E" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.fullName}
              onChangeText={(v) => setForm({ ...form, fullName: v })}
              placeholder="Enter your full name"
              placeholderTextColor="#aaa"
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={18} color="#3E7B27" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v.replace(/[^0-9]/g, "").slice(0, 10) })}
              placeholder="Enter 10-digit phone number"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
              maxLength={10}
            />
            {form.phone.length > 0 && (
              <Text style={{ fontSize: 11, color: form.phone.length === 10 ? "#3E7B27" : "#B8860B", marginLeft: 4 }}>
                {form.phone.length}/10
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#A8D96C" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#A8D96C" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F7F0" },
  scroll: { padding: 20, paddingBottom: 100 },

  avatarSection: { alignItems: "center", marginBottom: 28 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#0B3D2E",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { fontSize: 30, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  cameraBtn: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#A8D96C",
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#F0F7F0",
  },
  avatarHint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 8 },

  card: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    marginBottom: 20, elevation: 2,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 4 },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0F7F0", borderRadius: 12,
    borderWidth: 1, borderColor: "#D4EDD4",
    paddingHorizontal: 12, marginBottom: 14, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },

  saveBtn: {
    backgroundColor: "#0B3D2E", borderRadius: 16, height: 52,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    elevation: 3,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});