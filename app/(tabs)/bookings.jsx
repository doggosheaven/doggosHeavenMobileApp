import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import {
  Text,
  Surface,
  Button,
  Divider,
  Provider as PaperProvider,
  DefaultTheme,
  Chip,
  Avatar,
  IconButton,
} from "react-native-paper";
import Header from "../../components/Header";

// ─── Theme (matches your app) ─────────────────────────────────────────────────
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
const SELECTED_SERVICE = {
  id: "s1",
  name: "Full Grooming",
  icon: "✂️",
  duration: "60 min",
  price: "₹799",
  description: "Bath, trim, nail clipping & ear cleaning",
};

const TIME_SLOTS = [
  { id: "t1", time: "09:00 AM", available: true },
  { id: "t2", time: "10:00 AM", available: true },
  { id: "t3", time: "11:00 AM", available: false },
  { id: "t4", time: "12:00 PM", available: true },
  { id: "t5", time: "01:00 PM", available: false },
  { id: "t6", time: "02:00 PM", available: true },
  { id: "t7", time: "03:00 PM", available: true },
  { id: "t8", time: "04:00 PM", available: true },
  { id: "t9", time: "05:00 PM", available: false },
  { id: "t10", time: "06:00 PM", available: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function generateCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells = [];
  // leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ day: d, date, past: date < today });
  }
  return cells;
}

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ number, title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.stepBadge}>
      <Text style={styles.stepNumber}>{number}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

// ─── Service Card (auto-filled) ───────────────────────────────────────────────
const ServiceCard = ({ service }) => (
  <Surface style={styles.serviceCard} elevation={0}>
    <View style={styles.serviceCardInner}>
      <View style={styles.serviceIconBox}>
        <Text style={styles.serviceIcon}>{service.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDesc}>{service.description}</Text>
        <View style={styles.serviceMetaRow}>
          <Chip
            icon="clock-outline"
            style={styles.chipMeta}
            textStyle={styles.chipMetaText}
            compact
          >
            {service.duration}
          </Chip>
          <Chip
            icon="tag-outline"
            style={[styles.chipMeta, styles.chipPrice]}
            textStyle={[styles.chipMetaText, styles.chipPriceText]}
            compact
          >
            {service.price}
          </Chip>
        </View>
      </View>
      <View style={styles.autoFilledBadge}>
        <Text style={styles.autoFilledText}>Auto-filled</Text>
      </View>
    </View>
  </Surface>
);

// ─── Calendar ────────────────────────────────────────────────────────────────
const Calendar = ({ selectedDate, onSelectDate }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const cells = generateCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (date) =>
    selectedDate &&
    date.getFullYear() === selectedDate.getFullYear() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getDate() === selectedDate.getDate();

  const isToday = (date) => {
    const t = new Date();
    return (
      date.getFullYear() === t.getFullYear() &&
      date.getMonth() === t.getMonth() &&
      date.getDate() === t.getDate()
    );
  };

  return (
    <Surface style={styles.calendarCard} elevation={0}>
      {/* Month navigation */}
      <View style={styles.calendarNav}>
        <IconButton
          icon="chevron-left"
          iconColor="#3E7B27"
          size={22}
          onPress={prevMonth}
          style={styles.navBtn}
        />
        <Text style={styles.monthLabel}>
          {MONTHS[viewMonth]} {viewYear}
        </Text>
        <IconButton
          icon="chevron-right"
          iconColor="#3E7B27"
          size={22}
          onPress={nextMonth}
          style={styles.navBtn}
        />
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map((d) => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Date grid */}
      <View style={styles.dateGrid}>
        {cells.map((cell, idx) => {
          if (!cell) return <View key={`e-${idx}`} style={styles.dateCell} />;
          const selected = isSelected(cell.date);
          const todayCell = isToday(cell.date);
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dateCell,
                cell.past && styles.dateCellPast,
                todayCell && !selected && styles.dateCellToday,
                selected && styles.dateCellSelected,
              ]}
              onPress={() => !cell.past && onSelectDate(cell.date)}
              disabled={cell.past}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dateCellText,
                  cell.past && styles.dateCellTextPast,
                  todayCell && !selected && styles.dateCellTextToday,
                  selected && styles.dateCellTextSelected,
                ]}
              >
                {cell.day}
              </Text>
              {todayCell && (
                <View style={[styles.todayDot, selected && styles.todayDotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Surface>
  );
};

// ─── Time Slot Grid ───────────────────────────────────────────────────────────
const TimeSlotGrid = ({ slots, selectedSlot, onSelect }) => (
  <View style={styles.slotGrid}>
    {slots.map((slot) => {
      const selected = selectedSlot?.id === slot.id;
      return (
        <TouchableOpacity
          key={slot.id}
          style={[
            styles.slotCell,
            !slot.available && styles.slotUnavailable,
            selected && styles.slotSelected,
          ]}
          onPress={() => slot.available && onSelect(slot)}
          disabled={!slot.available}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.slotText,
              !slot.available && styles.slotTextUnavailable,
              selected && styles.slotTextSelected,
            ]}
          >
            {slot.time}
          </Text>
          {!slot.available && (
            <Text style={styles.slotBooked}>Booked</Text>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─── Booking Summary ──────────────────────────────────────────────────────────
const BookingSummary = ({ service, date, slot }) => {
  if (!date || !slot) return null;

  const formattedDate = `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

  return (
    <Surface style={styles.summaryCard} elevation={0}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>📋 Booking Summary</Text>
      </View>
      <Divider style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Service</Text>
        <Text style={styles.summaryValue}>{service.name}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Duration</Text>
        <Text style={styles.summaryValue}>{service.duration}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Date</Text>
        <Text style={styles.summaryValue}>{formattedDate}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Time</Text>
        <Text style={styles.summaryValue}>{slot.time}</Text>
      </View>
      <Divider style={[styles.summaryDivider, { marginTop: 8 }]} />
      <View style={[styles.summaryRow, { marginTop: 8 }]}>
        <Text style={styles.summaryTotalLabel}>Total Amount</Text>
        <Text style={styles.summaryTotal}>{service.price}</Text>
      </View>
    </Surface>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const BookingScreen = ({ navigation }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const canConfirm = selectedDate && selectedSlot;

  const handleConfirm = () => {
    if (!canConfirm) return;
    Alert.alert(
      "🎉 Booking Confirmed!",
      `Your appointment for ${SELECTED_SERVICE.name} is booked on ${
        DAYS[selectedDate.getDay()]
      }, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} at ${selectedSlot.time}.`,
      [
        {
          text: "OK",
          onPress: () => {
            setConfirmed(true);
          },
        },
      ]
    );
  };

  if (confirmed) {
    return (
      <PaperProvider theme={theme}>
        <View style={styles.successScreen}>
          <View style={styles.successCircle}>
            <Text style={styles.successEmoji}>🐾</Text>
          </View>
          <Text style={styles.successTitle}>All Set!</Text>
          <Text style={styles.successMsg}>
            Your booking has been confirmed. We'll see you and your furry friend soon!
          </Text>
          <Surface style={styles.successDetails} elevation={0}>
            <Text style={styles.successDetailItem}>
              📅  {DAYS[selectedDate.getDay()]}, {selectedDate.getDate()}{" "}
              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
            <Text style={styles.successDetailItem}>
              🕐  {selectedSlot.time}
            </Text>
            <Text style={styles.successDetailItem}>
              ✂️  {SELECTED_SERVICE.name} — {SELECTED_SERVICE.price}
            </Text>
          </Surface>
          <Button
            mode="contained"
            buttonColor="#3E7B27"
            textColor="#fff"
            style={styles.newBookingBtn}
            onPress={() => {
              setSelectedDate(null);
              setSelectedSlot(null);
              setConfirmed(false);
            }}
            labelStyle={{ fontWeight: "700", fontSize: 15 }}
          >
            Make Another Booking
          </Button>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F3EA" />
      <View style={styles.screenRoot}>
        <Header title="Book Appointment" showBack />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1 — Selected Service */}
          <View style={styles.stepSection}>
            <SectionHeader
              number="1"
              title="Selected Service"
              subtitle="Auto-filled from your selection"
            />
            <ServiceCard service={SELECTED_SERVICE} />
          </View>

          {/* Step 2 — Date Selection */}
          <View style={styles.stepSection}>
            <SectionHeader
              number="2"
              title="Choose a Date"
              subtitle={
                selectedDate
                  ? `${DAYS[selectedDate.getDay()]}, ${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                  : "Tap a date to select"
              }
            />
            <Calendar
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null); // reset slot on date change
              }}
            />
          </View>

          {/* Step 3 — Time Slot */}
          <View style={styles.stepSection}>
            <SectionHeader
              number="3"
              title="Choose a Time Slot"
              subtitle={selectedSlot ? `Selected: ${selectedSlot.time}` : "Pick an available slot"}
            />
            <Surface style={styles.slotCard} elevation={0}>
              <View style={styles.slotLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#3E7B27" }]} />
                  <Text style={styles.legendText}>Available</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#ccc" }]} />
                  <Text style={styles.legendText}>Booked</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EFE3C2", borderWidth: 2, borderColor: "#3E7B27" }]} />
                  <Text style={styles.legendText}>Selected</Text>
                </View>
              </View>
              <TimeSlotGrid
                slots={TIME_SLOTS}
                selectedSlot={selectedSlot}
                onSelect={setSelectedSlot}
              />
            </Surface>
          </View>

          {/* Step 4 — Summary */}
          {canConfirm && (
            <View style={styles.stepSection}>
              <SectionHeader number="4" title="Booking Summary" />
              <BookingSummary
                service={SELECTED_SERVICE}
                date={selectedDate}
                slot={selectedSlot}
              />
            </View>
          )}

          {/* Confirm Button */}
          <View style={styles.confirmWrapper}>
            {!canConfirm && (
              <Text style={styles.confirmHint}>
                {!selectedDate
                  ? "Please select a date to continue"
                  : "Please select a time slot to continue"}
              </Text>
            )}
            <Button
              mode="contained"
              onPress={handleConfirm}
              disabled={!canConfirm}
              buttonColor={canConfirm ? "#3E7B27" : "#ccc"}
              textColor="#fff"
              style={styles.confirmBtn}
              contentStyle={styles.confirmBtnContent}
              labelStyle={styles.confirmBtnLabel}
              icon={canConfirm ? "check-circle" : "clock-outline"}
            >
              Confirm Booking
            </Button>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </PaperProvider>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#F7F3EA",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  // ── Steps
  stepSection: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3E7B27",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#123524",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#85A947",
    fontWeight: "500",
    marginTop: 2,
  },

  // ── Service card
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.25)",
    overflow: "hidden",
  },
  serviceCardInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  serviceIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "rgba(133,169,71,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceIcon: { fontSize: 26 },
  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#123524",
    marginBottom: 3,
  },
  serviceDesc: {
    fontSize: 12,
    color: "#6B7C6A",
    marginBottom: 8,
    lineHeight: 17,
  },
  serviceMetaRow: { flexDirection: "row", gap: 8 },
  chipMeta: {
    backgroundColor: "rgba(133,169,71,0.12)",
    height: 26,
  },
  chipMetaText: { fontSize: 11, color: "#3E7B27", fontWeight: "600" },
  chipPrice: { backgroundColor: "rgba(62,123,39,0.1)" },
  chipPriceText: { color: "#3E7B27", fontWeight: "700" },
  autoFilledBadge: {
    backgroundColor: "#EFE3C2",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  autoFilledText: { fontSize: 10, color: "#85A947", fontWeight: "700" },

  // ── Calendar
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.25)",
    padding: 12,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#123524",
    letterSpacing: 0.2,
  },
  navBtn: { margin: 0 },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#85A947",
    textTransform: "uppercase",
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dateCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    position: "relative",
  },
  dateCellPast: { opacity: 0.3 },
  dateCellToday: {
    backgroundColor: "rgba(133,169,71,0.12)",
  },
  dateCellSelected: {
    backgroundColor: "#3E7B27",
    borderRadius: 12,
  },
  dateCellText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#123524",
  },
  dateCellTextPast: { color: "#aaa" },
  dateCellTextToday: { color: "#3E7B27", fontWeight: "700" },
  dateCellTextSelected: { color: "#fff", fontWeight: "700" },
  todayDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3E7B27",
  },
  todayDotSelected: { backgroundColor: "#EFE3C2" },

  // ── Slot Grid
  slotCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.25)",
    padding: 14,
  },
  slotLegend: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: { fontSize: 11, color: "#6B7C6A", fontWeight: "500" },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotCell: {
    width: "30%",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.35)",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  slotUnavailable: {
    backgroundColor: "#f5f5f5",
    borderColor: "#e0e0e0",
  },
  slotSelected: {
    backgroundColor: "#EFE3C2",
    borderColor: "#3E7B27",
    borderWidth: 2,
  },
  slotText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#123524",
  },
  slotTextUnavailable: { color: "#bbb" },
  slotTextSelected: { color: "#3E7B27" },
  slotBooked: {
    fontSize: 9,
    color: "#bbb",
    fontWeight: "500",
    marginTop: 1,
  },

  // ── Summary
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.25)",
    padding: 16,
  },
  summaryHeader: { marginBottom: 10 },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#123524",
  },
  summaryDivider: {
    backgroundColor: "rgba(133,169,71,0.25)",
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7C6A",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 13,
    color: "#123524",
    fontWeight: "600",
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#123524",
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3E7B27",
  },

  // ── Confirm
  confirmWrapper: {
    marginTop: 4,
    marginBottom: 8,
    alignItems: "center",
    gap: 10,
  },
  confirmHint: {
    fontSize: 12,
    color: "#85A947",
    fontWeight: "500",
  },
  confirmBtn: {
    borderRadius: 14,
    width: "100%",
    elevation: 4,
  },
  confirmBtnContent: { paddingVertical: 8 },
  confirmBtnLabel: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.4,
  },

  // ── Success Screen
  successScreen: {
    flex: 1,
    backgroundColor: "#F7F3EA",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#85A947",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    elevation: 4,
  },
  successEmoji: { fontSize: 52 },
  successTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#123524",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  successMsg: {
    fontSize: 14,
    color: "#6B7C6A",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  successDetails: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "rgba(133,169,71,0.3)",
    gap: 10,
    marginBottom: 28,
  },
  successDetailItem: {
    fontSize: 14,
    color: "#123524",
    fontWeight: "600",
    lineHeight: 22,
  },
  newBookingBtn: {
    borderRadius: 14,
    width: "100%",
  },
});

export default BookingScreen;