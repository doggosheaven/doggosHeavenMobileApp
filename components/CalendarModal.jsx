import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const CELL = 38;
const ROWS = 6; // always six, so the sheet never resizes between months

const isSameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/**
 * Month picker used everywhere a date is chosen.
 *
 * The copies this replaced laid the days out with numColumns={7} over however
 * many cells the month happened to need, so February drew four rows and a month
 * starting on Saturday drew six — the dialog visibly grew and shrank as you
 * paged through. Here the grid is always 6x7 of fixed-size cells.
 *
 * `markedDates` takes a Set of "YYYY-MM-DD" strings to dot days that have data.
 * `onSelect(null)` fires from the "All dates" button when `allowAllDates` is set.
 */
export default function CalendarModal({
  visible,
  selectedDate,
  onSelect,
  onClose,
  markedDates,
  allowAllDates = false,
  onMonthChange,
}) {
  const [calMonth, setCalMonth] = useState(() => selectedDate || new Date());

  // Reopen on the month you are looking at, not the one you last paged to.
  useEffect(() => {
    if (visible) setCalMonth(selectedDate || new Date());
  }, [visible]);

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const goToMonth = (next) => {
    setCalMonth(next);
    onMonthChange?.(next);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length < ROWS * 7) cells.push(null);

  const key = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.box}>
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => goToMonth(new Date(year, month - 1, 1))}
              style={s.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color="#0B3D2E" />
            </TouchableOpacity>
            <Text style={s.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
            <TouchableOpacity
              onPress={() => goToMonth(new Date(year, month + 1, 1))}
              style={s.navBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color="#0B3D2E" />
            </TouchableOpacity>
          </View>

          <View style={s.dayRow}>
            {DAY_NAMES.map((d) => (
              <View key={d} style={s.cellBox}>
                <Text style={s.dayName}>{d}</Text>
              </View>
            ))}
          </View>

          {Array.from({ length: ROWS }, (_, row) => (
            <View key={row} style={s.week}>
              {Array.from({ length: 7 }, (_, col) => {
                const day = cells[row * 7 + col];
                if (!day) return <View key={col} style={s.cellBox} />;
                const thisDate = new Date(year, month, day);
                const selected = selectedDate && isSameDay(thisDate, selectedDate);
                const today = isSameDay(thisDate, new Date());
                const marked = markedDates?.has?.(key(day));
                return (
                  <View key={col} style={s.cellBox}>
                    <TouchableOpacity
                      style={[s.day, selected && s.daySelected, today && !selected && s.dayToday]}
                      onPress={() => { onSelect(thisDate); onClose(); }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          s.dayTxt,
                          selected && s.dayTxtSelected,
                          today && !selected && s.dayTxtToday,
                        ]}
                      >
                        {day}
                      </Text>
                      {marked && <View style={[s.dot, selected && s.dotSelected]} />}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={s.footer}>
            {allowAllDates && (
              <TouchableOpacity
                style={[s.footerBtn, s.footerBtnGhost]}
                onPress={() => { onSelect(null); onClose(); }}
                activeOpacity={0.85}
              >
                <Text style={[s.footerTxt, s.footerTxtGhost]}>All dates</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.footerBtn}
              onPress={() => { onSelect(new Date()); onClose(); }}
              activeOpacity={0.85}
            >
              <Text style={s.footerTxt}>Today</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  box: {
    backgroundColor: "#fff", borderRadius: 20, padding: 18,
    width: CELL * 7 + 36, elevation: 10,
  },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: "#F0F7F0",
    justifyContent: "center", alignItems: "center",
  },
  monthTxt: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  dayRow: { flexDirection: "row", marginBottom: 4 },
  week: { flexDirection: "row" },
  cellBox: { width: CELL, height: CELL, justifyContent: "center", alignItems: "center" },
  dayName: { fontSize: 11, fontFamily: "Poppins_700Bold", color: "#8A9A8A" },

  day: {
    width: CELL - 4, height: CELL - 4, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
  },
  daySelected: { backgroundColor: "#0B3D2E" },
  dayToday: { backgroundColor: "#E8F5E8", borderWidth: 1.5, borderColor: "#3E7B27" },
  dayTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  dayTxtSelected: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  dayTxtToday: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  dot: {
    position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: 2,
    backgroundColor: "#3E7B27",
  },
  dotSelected: { backgroundColor: "#A8D96C" },

  footer: { flexDirection: "row", gap: 10, marginTop: 12 },
  footerBtn: {
    flex: 1, backgroundColor: "#0B3D2E", borderRadius: 12,
    paddingVertical: 11, alignItems: "center",
  },
  footerBtnGhost: { backgroundColor: "#F0F7F0" },
  footerTxt: { fontSize: 13, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  footerTxtGhost: { color: "#0B3D2E" },
});
