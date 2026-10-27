
import React, { useEffect, useState } from "react";
iimport {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ActivityType = "Gym" | "Walk" | "Run";

type Activity = {
  id: string;
  type: ActivityType;
  duration: number;
  date: string;
  notes: string;
};

const STORAGE_KEY = "@streak_freak_activities";
const DAILY_GOAL = 30;
const XP_PER_LEVEL = 100;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const info: Record<ActivityType, { emoji: string; tagline: string }> = {
  Gym: { emoji: "🏋️", tagline: "Iron therapy" },
  Walk: { emoji: "🚶", tagline: "Touch grass" },
  Run: { emoji: "🏃", tagline: "Legs go brrr" },
};

const xpFor = (minutes: number) => Math.floor(minutes / 10) * 10;

const getStreak = (activities: Activity[]) => {
  const days = new Set(activities.map((a) => a.date));
  let cursor = new Date(`${today()}T12:00:00`);

  // Allow a streak to remain alive if today isn't logged yet.
  if (!days.has(today())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(
    `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`
  )) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<ActivityType>("Gym");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) setActivities(parsed as Activity[]);
        }
      })
      .catch(() => Alert.alert("Oops", "Couldn't load saved activities."))
      .finally(() => setLoaded(true));
  }, []);

  const saveActivities = async (next: Activity[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActivities(next);
  };

  const logActivity = async () => {
    const minutes = Number(duration);
    const cleanDate = date.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      Alert.alert("Duration needed", "Enter a whole number of minutes from 1 to 1440.");
      return;
    }

    if (!match) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD, for example 2026-10-23.");
      return;
    }

    const [, y, m, d] = match;
    const parsedDate = new Date(Number(y), Number(m) - 1, Number(d));
    if (
      parsedDate.getFullYear() !== Number(y) ||
      parsedDate.getMonth() !== Number(m) - 1 ||
      parsedDate.getDate() !== Number(d)
    ) {
      Alert.alert("Invalid date", "Please enter a real calendar date.");
      return;
    }

    setSaving(true);
    const entry: Activity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      duration: minutes,
      date: cleanDate,
      notes: notes.trim(),
    };

    try {
      await saveActivities(
        [entry, ...activities].sort((a, b) => b.date.localeCompare(a.date))
      );
      setDuration("");
      setNotes("");
      setDate(today());
      Alert.alert("W secured! 🔥", `You earned ${xpFor(minutes)} XP.`);
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = (id: string) => {
    Alert.alert("Delete activity?", "Its XP and progress will be recalculated.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await saveActivities(activities.filter((a) => a.id !== id));
          } catch {
            Alert.alert("Error", "Couldn't delete this activity.");
          }
        },
      },
    ]);
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.muted}>Loading your gains...</Text>
      </SafeAreaView>
    );
  }

  const currentDay = today();
  const todayActivities = activities.filter((a) => a.date === currentDay);
  const todayMinutes = todayActivities.reduce((sum, a) => sum + a.duration, 0);
  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalXP = activities.reduce((sum, a) => sum + xpFor(a.duration), 0);
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const levelXP = totalXP % XP_PER_LEVEL;
  const streak = getStreak(activities);
  const goalProgress = Math.min(todayMinutes / DAILY_GOAL, 1);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>STREAK FREAK ⚡</Text>
        <Text style={styles.heading}>Beast mode.</Text>
        <Text style={styles.muted}>Your body won't update itself.</Text>

        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.eyebrow}>YOUR CURRENT FORM</Text>
              <Text style={styles.levelTitle}>LEVEL {level} 🥷</Text>
            </View>
            <Text style={styles.xpNumber}>{totalXP} XP</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${levelXP}%` }]} />
          </View>
          <Text style={styles.mutedSmall}>
            {levelXP}/{XP_PER_LEVEL} XP to Level {level + 1}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{(totalMinutes / 60).toFixed(1)}</Text>
            <Text style={styles.statLabel}>TOTAL HOURS</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>DAILY SIDE QUEST 🎯</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalText}>Today's active minutes</Text>
            <Text style={styles.goalValue}>{todayMinutes}/{DAILY_GOAL}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${goalProgress * 100}%` }]} />
          </View>
          <Text style={styles.mutedSmall}>
            {todayMinutes >= DAILY_GOAL
              ? "QUEST COMPLETE. ABSOLUTE LEGEND. 🏆"
              : `${DAILY_GOAL - todayMinutes} more minutes to complete today's goal.`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>LOG YOUR SIDE QUEST</Text>
          <Text style={styles.label}>Activity type</Text>
          <View style={styles.typeRow}>
            {(["Gym", "Walk", "Run"] as ActivityType[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setType(item)}
                style={[styles.typeButton, type === item && styles.selected]}
              >
                <Text style={styles.typeEmoji}>{info[item].emoji}</Text>
                <Text style={[styles.typeText, type === item && styles.selectedText]}>{item}</Text>
                <Text style={styles.tagline}>{info[item].tagline}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="e.g. 45"
            placeholderTextColor="#888"
            keyboardType="number-pad"
            maxLength={4}
            style={styles.input}
          />

          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="2026-10-23"
            placeholderTextColor="#888"
            maxLength={10}
            style={styles.input}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Leg day. Stairs are my enemy."
            placeholderTextColor="#888"
            multiline
            maxLength={300}
            style={[styles.input, styles.notes]}
          />

          <Pressable onPress={logActivity} disabled={saving} style={styles.logButton}>
            <Text style={styles.logText}>{saving ? "SAVING..." : "LOG THE W →"}</Text>
          </Pressable>
          <Text style={styles.mutedSmall}>Earn 10 XP for every 10 minutes per activity.</Text>
        </View>

        <Text style={styles.sectionHistory}>YOUR LORE 📜</Text>
        {activities.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.empty}>No lore yet. Start your training arc. 🫡</Text>
          </View>
        ) : (
          activities.map((a) => (
            <View key={a.id} style={styles.activity}>
              <Text style={styles.historyEmoji}>{info[a.type]?.emoji ?? "💪"}</Text>
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{a.type}</Text>
                <Text style={styles.activityMeta}>{a.date} · {a.duration} min · +{xpFor(a.duration)} XP</Text>
                {!!a.notes && <Text style={styles.note}>{a.notes}</Text>}
              </View>
              <Pressable onPress={() => deleteActivity(a.id)} hitSlop={8}>
                <Text style={styles.delete}>✕</Text>
              </Pressable>
            </View>
          ))
        )}
        <Text style={styles.footer}>NO CAP. JUST CONSISTENCY. 🫡</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101010" },
  container: { padding: 20, paddingBottom: 42 },
  brand: { color: "#B6FF4A", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: 18 },
  heading: { color: "#FFF", fontSize: 38, fontWeight: "900", marginTop: 8 },
  muted: { color: "#AAA", fontSize: 14, marginTop: 5 },
  mutedSmall: { color: "#AAA", fontSize: 12, marginTop: 10 },
  levelCard: { backgroundColor: "#1B1B1B", borderRadius: 18, padding: 18, marginTop: 22, borderWidth: 1, borderColor: "#353535" },
  levelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#AAA", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  levelTitle: { color: "#FFF", fontSize: 25, fontWeight: "900", marginTop: 5 },
  xpNumber: { color: "#B6FF4A", fontSize: 18, fontWeight: "900" },
  track: { height: 9, borderRadius: 9, backgroundColor: "#383838", overflow: "hidden", marginTop: 13 },
  fill: { height: "100%", backgroundColor: "#B6FF4A", borderRadius: 9 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 12 },
  stat: { flex: 1, backgroundColor: "#1B1B1B", borderRadius: 15, padding: 16, borderWidth: 1, borderColor: "#353535" },
  statEmoji: { fontSize: 22 },
  statValue: { color: "#FFF", fontSize: 27, fontWeight: "900", marginTop: 5 },
  statLabel: { color: "#AAA", fontSize: 10, fontWeight: "800", marginTop: 3 },
  card: { backgroundColor: "#1B1B1B", borderRadius: 18, padding: 18, marginTop: 16, borderWidth: 1, borderColor: "#353535" },
  section: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  goalText: { color: "#DDD", fontSize: 13 },
  goalValue: { color: "#B6FF4A", fontWeight: "900" },
  label: { color: "#DDD", fontSize: 13, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeButton: { flex: 1, minWidth: 0, alignItems: "center", backgroundColor: "#282828", borderWidth: 1, borderColor: "#3A3A3A", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 3 },
  selected: { backgroundColor: "#29351C", borderColor: "#B6FF4A" },
  typeEmoji: { fontSize: 22 },
  typeText: { color: "#DDD", fontWeight: "800", marginTop: 5 },
  selectedText: { color: "#B6FF4A" },
  tagline: { color: "#AAA", fontSize: 9, marginTop: 4, textAlign: "center" },
  input: { color: "#FFF", backgroundColor: "#282828", borderColor: "#3A3A3A", borderWidth: 1, borderRadius: 11, padding: 13, fontSize: 15 },
  notes: { minHeight: 75, textAlignVertical: "top" },
  logButton: { backgroundColor: "#B6FF4A", padding: 16, alignItems: "center", borderRadius: 12, marginTop: 20 },
  logText: { color: "#101010", fontWeight: "900", letterSpacing: 1 },
  sectionHistory: { color: "#FFF", fontSize: 16, fontWeight: "900", marginTop: 28, marginBottom: 12 },
  empty: { color: "#AAA", textAlign: "center", paddingVertical: 10 },
  activity: { flexDirection: "row", alignItems: "center", backgroundColor: "#1B1B1B", borderRadius: 14, borderWidth: 1, borderColor: "#353535", padding: 13, marginBottom: 10 },
  historyEmoji: { fontSize: 26, marginRight: 12 },
  activityBody: { flex: 1 },
  activityTitle: { color: "#FFF", fontSize: 15, fontWeight: "900" },
  activityMeta: { color: "#B6FF4A", fontSize: 11, marginTop: 4 },
  note: { color: "#AAA", fontSize: 12, marginTop: 5 },
  delete: { color: "#FF7777", fontSize: 16, fontWeight: "900", padding: 5 },
  footer: { color: "#777", textAlign: "center", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginTop: 25 },
});
