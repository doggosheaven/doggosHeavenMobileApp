import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { BASE_URL } from "../../constants/api";

export default function ConnectionTest() {
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");
  const [responseData, setResponseData] = useState(null);

  const testConnection = async () => {
    setStatus("loading");
    setResponseData(null);
    setMessage("");
    try {
      const res = await fetch(`${BASE_URL}/debug`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      setStatus("success");
      setMessage(`Status: ${res.status}`);
      setResponseData(text);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔌 Backend Connection Test</Text>
      <Text style={styles.url}>{BASE_URL}</Text>

      <TouchableOpacity style={styles.btn} onPress={testConnection} activeOpacity={0.8}>
        <Text style={styles.btnText}>Test Connection</Text>
      </TouchableOpacity>

      {status === "loading" && (
        <ActivityIndicator size="large" color="#7BC743" style={{ marginTop: 24 }} />
      )}

      {status === "success" && (
        <View style={[styles.resultBox, styles.successBox]}>
          <Text style={styles.successIcon}>✅ Connected</Text>
          <Text style={styles.resultMessage}>{message}</Text>
          {responseData && <Text style={styles.responseData}>{responseData}</Text>}
        </View>
      )}

      {status === "error" && (
        <View style={[styles.resultBox, styles.errorBox]}>
          <Text style={styles.errorIcon}>❌ Failed</Text>
          <Text style={styles.resultMessage}>{message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5EDE0",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
    marginBottom: 8,
    textAlign: "center",
  },
  url: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  btn: {
    backgroundColor: "#0B3D2E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  btnText: {
    color: "#fff",
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
  },
  resultBox: {
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
  },
  successBox: {
    backgroundColor: "rgba(123,199,67,0.12)",
    borderWidth: 1.5,
    borderColor: "#7BC743",
  },
  errorBox: {
    backgroundColor: "rgba(211,47,47,0.08)",
    borderWidth: 1.5,
    borderColor: "#D32F2F",
  },
  successIcon: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#3E7B27",
    marginBottom: 6,
  },
  errorIcon: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#D32F2F",
    marginBottom: 6,
  },
  resultMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#333",
    marginBottom: 8,
  },
  responseData: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
});
