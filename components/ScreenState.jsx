import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * The two states every list screen needs and none of them had.
 *
 * Screens used to swallow failures with `catch { if (__DEV__) console.log(e) }`,
 * leaving a blank page that looks exactly like "no data" — so nobody could tell
 * a dead network from an empty table, and there was nothing to press to retry.
 */

export function ErrorState({
  message = "Could not load this right now.",
  onRetry,
}) {
  return (
    <View style={s.wrap}>
      <View style={[s.iconBox, s.iconBoxError]}>
        <Ionicons name="cloud-offline-outline" size={26} color="#C62828" />
      </View>
      <Text style={s.title}>Something went wrong</Text>
      <Text style={s.sub}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={16} color="#A8D96C" />
          <Text style={s.btnTxt}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray-outline",
  title = "Nothing here yet",
  subtitle,
  actionLabel,
  onAction,
  actionIcon = "add",
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconBox}>
        <Ionicons name={icon} size={26} color="#3E7B27" />
      </View>
      <Text style={s.title}>{title}</Text>
      {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.85}>
          <Ionicons name={actionIcon} size={16} color="#A8D96C" />
          <Text style={s.btnTxt}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  iconBox: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: "#E8F5E8",
    justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  iconBoxError: { backgroundColor: "#FFEBEE" },
  title: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E", textAlign: "center" },
  sub: {
    fontSize: 13, fontFamily: "Inter_400Regular", color: "#8A9A8A",
    textAlign: "center", lineHeight: 19,
  },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10,
    backgroundColor: "#0B3D2E", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11,
  },
  btnTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
