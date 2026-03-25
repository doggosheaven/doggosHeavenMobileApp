import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topBackground} />

      <Text style={styles.appName}>DoggosHeaven</Text>

      <View style={styles.contentContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri: "https://tse4.mm.bing.net/th/id/OIP.uifVnbtiY86BFPPPCSN8oQHaHx?pid=Api&P=0&h=180",
            }}
            style={styles.dogImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Meet your</Text>
          <Text style={styles.highlightedText}>new furry best friend</Text>
          <Text style={styles.description}>
            Discover your ideal furry friend and bring joy to your home. Explore loving pets waiting to become your perfect companion.
          </Text>
          <View style={styles.pawContainer}>
            <Text style={styles.paw}>🐾</Text>
            <Text style={styles.paw}>🐾</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => router.replace("/(tabs)/home")}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: 40,
  },
  topBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.15,
    backgroundColor: "#FFFFFF",
  },
  appName: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#0B3D2E",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 24,
  },
  imageWrapper: {
    width: width - 40,
    height: 260,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  dogImage: {
    width: "100%",
    height: "100%",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    elevation: 2,
  },
  heading: {
    fontSize: 20,
    fontFamily: "Inter_400Regular",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  highlightedText: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#7BC743",
    marginBottom: 16,
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  pawContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 60,
    marginTop: 4,
  },
  paw: { fontSize: 24 },
  getStartedButton: {
    backgroundColor: "#0B3D2E",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
    elevation: 5,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
});
