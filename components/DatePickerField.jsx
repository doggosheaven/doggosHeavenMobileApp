import { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

export const dateToDisplay = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

export const dateToISO = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const parseDisplayDate = (str) => {
  if (!str) return null;
  const parts = str.split("/");
  if (parts.length !== 3 || parts[2].length !== 4) return null;
  const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  return isNaN(d.getTime()) ? null : d;
};

export default function DatePickerField({
  label, value, onChange, placeholder, maxDate, minDate, style,
}) {
  const [visible, setVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(value || new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);

  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const isSameDay = (a, b) => a && b && new Date(a).toDateString() === new Date(b).toDateString();

  const isDisabled = (day) => {
    const d = new Date(year, month, day);
    if (maxDate && d > maxDate) return true;
    if (minDate && d < minDate) return true;
    return false;
  };

  // Build calendar grid rows
  const buildRows = () => {
    const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  };

  // Year range: 1950 to maxYear 
  const currentYear = new Date().getFullYear();
  const maxYear = maxDate ? maxDate.getFullYear() : currentYear;
  const years = Array.from({ length: maxYear - 1950 + 1 }, (_, i) => 1950 + i).reverse();

  const openPicker = () => {
    setCalMonth(value || new Date());
    setShowYearPicker(false);
    setVisible(true);
  };

  return (
    <>
      {label ? <Text style={[s.label, style?.label]}>{label}</Text> : null}
      <TouchableOpacity style={[s.field, style?.field]} onPress={openPicker} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={16} color="#3E7B27" />
        <Text style={[s.fieldTxt, !value && s.placeholder]}>
          {value ? dateToDisplay(value) : (placeholder || "Select date")}
        </Text>
        {value ? (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color="#C62828" />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color="#999" />
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={s.box}>

            {/* Header — Month/Year nav */}
            <View style={s.header}>
              <TouchableOpacity
                onPress={() => setCalMonth(new Date(year, month - 1, 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color="#0B3D2E" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowYearPicker(!showYearPicker)} activeOpacity={0.8} style={s.monthYearBtn}>
                <Text style={s.monthTxt}>{MONTH_NAMES[month]} {year}</Text>
                <Ionicons name={showYearPicker ? "chevron-up" : "chevron-down"} size={14} color="#0B3D2E" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setCalMonth(new Date(year, month + 1, 1))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={20} color="#0B3D2E" />
              </TouchableOpacity>
            </View>

            {/* Year Picker */}
            {showYearPicker ? (
              <ScrollView style={s.yearList} showsVerticalScrollIndicator={false}>
                {years.map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[s.yearItem, y === year && s.yearItemActive]}
                    onPress={() => { setCalMonth(new Date(y, month, 1)); setShowYearPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.yearTxt, y === year && s.yearTxtActive]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <>
                {/* Day names */}
                <View style={s.dayRow}>
                  {DAY_NAMES.map(d => <Text key={d} style={s.dayName}>{d}</Text>)}
                </View>

                {/* Calendar grid — plain View rows, no FlatList */}
                {buildRows().map((row, ri) => (
                  <View key={ri} style={s.calRow}>
                    {row.map((day, ci) => {
                      if (!day) return <View key={ci} style={s.dayEmpty} />;
                      const thisDate = new Date(year, month, day);
                      const isSel    = isSameDay(thisDate, value);
                      const isToday  = isSameDay(thisDate, new Date());
                      const disabled = isDisabled(day);
                      return (
                        <TouchableOpacity
                          key={ci}
                          style={[s.day, isSel && s.daySelected, isToday && !isSel && s.dayToday, disabled && s.dayDisabled]}
                          onPress={() => { if (!disabled) { onChange(thisDate); setVisible(false); } }}
                          disabled={disabled}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.dayTxt, isSel && s.dayTxtSelected, isToday && !isSel && s.dayTxtToday, disabled && s.dayTxtDisabled]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                {/* Today button */}
                <TouchableOpacity
                  style={s.todayBtn}
                  onPress={() => { onChange(new Date()); setVisible(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={s.todayBtnTxt}>Today</Text>
                </TouchableOpacity>
              </>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 12, fontFamily: "Poppins_700Bold", color: "#0B3D2E", marginBottom: 6, marginTop: 14 },
  field: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#F0F7F0", borderRadius: 10, paddingHorizontal: 12, height: 46,
    borderWidth: 1, borderColor: "#D4EDD4",
  },
  fieldTxt: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  placeholder: { color: "#aaa" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  box: { backgroundColor: "#fff", borderRadius: 20, padding: 16, width: "88%", elevation: 10 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  monthYearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  monthTxt: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#0B3D2E" },

  // Year picker
  yearList: { maxHeight: 220, marginBottom: 8 },
  yearItem: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  yearItemActive: { backgroundColor: "#0B3D2E" },
  yearTxt: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#1A1A1A", textAlign: "center" },
  yearTxtActive: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },

  // Calendar grid
  dayRow: { flexDirection: "row", marginBottom: 4 },
  dayName: { flex: 1, textAlign: "center", fontSize: 11, fontFamily: "Poppins_700Bold", color: "#3E7B27" },
  calRow: { flexDirection: "row", marginBottom: 2 },
  day: { flex: 1, height: 36, justifyContent: "center", alignItems: "center", borderRadius: 8 },
  dayEmpty: { flex: 1, height: 36 },
  daySelected: { backgroundColor: "#0B3D2E" },
  dayToday: { backgroundColor: "#E8F5E8", borderWidth: 1.5, borderColor: "#3E7B27" },
  dayDisabled: { opacity: 0.3 },
  dayTxt: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#1A1A1A" },
  dayTxtSelected: { fontFamily: "Poppins_700Bold", color: "#A8D96C" },
  dayTxtToday: { fontFamily: "Poppins_700Bold", color: "#0B3D2E" },
  dayTxtDisabled: { color: "#ccc" },

  todayBtn: { backgroundColor: "#0B3D2E", borderRadius: 12, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  todayBtnTxt: { fontSize: 14, fontFamily: "Poppins_700Bold", color: "#A8D96C" },
});
