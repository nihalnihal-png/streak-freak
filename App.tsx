
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRandomMeme } from "./src/memes/registry";

type ActivityType = "Gym" | "Walk" | "Run";
type Activity = {
  id: string;
  type: ActivityType;
  duration: number;
  date: string;
  notes: string;
};
type Reward = {
  id: string;
  title: string;
  description: string;
  cost: number;
  meme: string;
};



const STORAGE_KEY = "@streak_freak_activities";
const COINS_KEY = "@streak_freak_awzm_coins";
const PURCHASED_KEY = "@streak_freak_purchased_rewards";
const DAILY_GOAL = 30;
const XP_PER_LEVEL = 100;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const xpFor = (minutes: number) => Math.floor(minutes / 10) * 10;
const info: Record<ActivityType, { emoji: string; tagline: string }> = {
  Gym: { emoji: "🏋️", tagline: "Iron therapy" },
  Walk: { emoji: "🚶", tagline: "Touch grass" },
  Run: { emoji: "🏃", tagline: "Legs go brrr" },
};
const rewards: Reward[] = [
  { id: "npc", title: "NPC Energy", description: "For when the gains are on autopilot.", cost: 30, meme: "🧍‍♂️  DIALOGUE OPTION UNLOCKED\n“GYM. SLEEP. REPEAT.”" },
  { id: "sigma", title: "Budget Sigma", description: "Financially irresponsible. Physically unstoppable.", cost: 60, meme: "🗿  SIGMA MODE: 0.3%\nWALLET EMPTY. VIBES FULL." },
  { id: "grass", title: "Touch Grass Certificate", description: "A highly questionable achievement.", cost: 90, meme: "🌱  CERTIFIED GRASS TOUCHER\nTHE OUTSIDE WORLD FEARS YOU." },
];

const getStreak = (activities: Activity[]) => {
  const days = new Set(activities.map((a) => a.date));
  let cursor = new Date(`${today()}T12:00:00`);
  if (!days.has(today())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [coins, setCoins] = useState(0);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<ActivityType>("Gym");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedLore, setSelectedLore] = useState<ActivityType | null>(null);
  const [celebration, setCelebration] = useState<{
    title: string;
    media: ReturnType<typeof getRandomMeme>;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(COINS_KEY),
      AsyncStorage.getItem(PURCHASED_KEY),
    ])
      .then(([rawActivities, rawCoins, rawPurchased]) => {
        if (rawActivities) {
          const parsed: unknown = JSON.parse(rawActivities);
          if (Array.isArray(parsed)) setActivities(parsed as Activity[]);
        }
        if (rawCoins !== null && Number.isFinite(Number(rawCoins))) setCoins(Math.max(0, Number(rawCoins)));
        if (rawPurchased) {
          const parsed: unknown = JSON.parse(rawPurchased);
          if (Array.isArray(parsed)) setPurchased(parsed.filter((x): x is string => typeof x === "string"));
        }
      })
      .catch(() => Alert.alert("Oops", "Couldn't load saved data. Your existing data has not been intentionally cleared."))
      .finally(() => setLoaded(true));
  }, []);

  const saveActivities = async (next: Activity[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setActivities(next);
  };
  const saveCoins = async (next: number) => {
    await AsyncStorage.setItem(COINS_KEY, String(next));
    setCoins(next);
  };
  const savePurchased = async (next: string[]) => {
    await AsyncStorage.setItem(PURCHASED_KEY, JSON.stringify(next));
    setPurchased(next);
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
    if (parsedDate.getFullYear() !== Number(y) || parsedDate.getMonth() !== Number(m) - 1 || parsedDate.getDate() !== Number(d)) {
      Alert.alert("Invalid date", "Please enter a real calendar date.");
      return;
    }

    setSaving(true);
    const entry: Activity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type, duration: minutes, date: cleanDate, notes: notes.trim(),
    };
    const earnedCoins = Math.max(1, Math.floor(minutes / 10));
    try {
      const nextActivities = [entry, ...activities].sort((a, b) => b.date.localeCompare(a.date));
      const nextCoins = coins + earnedCoins;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextActivities));
      await AsyncStorage.setItem(COINS_KEY, String(nextCoins));
      setActivities(nextActivities);
      setCoins(nextCoins);
      setDuration("");
      setNotes("");
      setDate(today());
      const category = type.toLowerCase();
      const meme = getRandomMeme(category);

      setCelebration({
        title: `${type} completed. Absolutely cinema!`,
        media: meme,
      });
    } catch {
      Alert.alert("Couldn't save", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = (id: string) => {
    Alert.alert("Delete activity?", "XP and activity stats will be recalculated. Coins already earned or spent won't change.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await saveActivities(activities.filter((a) => a.id !== id)); }
        catch { Alert.alert("Error", "Couldn't delete this activity."); }
      }},
    ]);
  };

  const buyReward = (reward: Reward) => {
    if (purchased.includes(reward.id)) {
      Alert.alert(reward.title, reward.meme);
      return;
    }
    if (coins < reward.cost) {
      Alert.alert("Insufficient funds 💸", `You need ${reward.cost - coins} more AWzm Coins. Get back to the grind.`);
      return;
    }
    Alert.alert("Buy this totally real asset?", `${reward.title}\nCost: ${reward.cost} AWzm Coins\n\nNo refunds. No utility. No roadmap.`, [
      { text: "Cancel", style: "cancel" },
      { text: "BUY THE DIP", onPress: async () => {
        try {
          const nextCoins = coins - reward.cost;
          const nextPurchased = [...purchased, reward.id];
          await AsyncStorage.setItem(COINS_KEY, String(nextCoins));
          await AsyncStorage.setItem(PURCHASED_KEY, JSON.stringify(nextPurchased));
          setCoins(nextCoins);
          setPurchased(nextPurchased);
          Alert.alert("Investment acquired 📉", reward.meme);
        } catch {
          Alert.alert("Transaction reverted", "Couldn't save the purchase. Try again.");
        }
      }},
    ]);
  };

  const currentDay = today();
  const todayActivities = activities.filter((a) => a.date === currentDay);
  const todayMinutes = todayActivities.reduce((sum, a) => sum + a.duration, 0);
  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalXP = activities.reduce((sum, a) => sum + xpFor(a.duration), 0);
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const levelXP = totalXP % XP_PER_LEVEL;
  const streak = getStreak(activities);
  const goalProgress = Math.min(todayMinutes / DAILY_GOAL, 1);

  if (!loaded) {
    return <SafeAreaView style={styles.safe}><Text style={styles.muted}>Loading your gains...</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>STREAK FREAK ⚡</Text>
        <Text style={styles.heading}>Beast mode.</Text>
        <Text style={styles.muted}>Your body won't update itself.</Text>

        <View style={styles.coinCard}>
          <View style={styles.coinHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>TOTALLY REAL DIGITAL ASSET</Text>
              <Text style={styles.coinTitle}>AWzm Coins 🪙</Text>
              <Text style={styles.mutedSmall}>Absolutely Worthless Zero Money</Text>
            </View>
            <Text style={styles.coinBalance}>{coins}</Text>
          </View>
          <Text style={styles.coinHint}>Earn coins by logging workouts. Spend them on premium-grade nonsense.</Text>
        </View>

        <View style={styles.levelCard}>
          <View style={styles.levelTop}>
            <View>
              <Text style={styles.eyebrow}>YOUR CURRENT FORM</Text>
              <Text style={styles.levelTitle}>LEVEL {level} 🥷</Text>
            </View>
            <Text style={styles.xpNumber}>{totalXP} XP</Text>
          </View>
          <View style={styles.track}><View style={[styles.fill, { width: `${levelXP}%` }]} /></View>
          <Text style={styles.mutedSmall}>{levelXP}/{XP_PER_LEVEL} XP to Level {level + 1}</Text>
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
          <View style={styles.track}><View style={[styles.fill, { width: `${goalProgress * 100}%` }]} /></View>
          <Text style={styles.mutedSmall}>{todayMinutes >= DAILY_GOAL ? "QUEST COMPLETE. ABSOLUTE LEGEND. 🏆" : `${DAILY_GOAL - todayMinutes} more minutes to complete today's goal.`}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>LOG YOUR SIDE QUEST</Text>
          <Text style={styles.label}>Activity type</Text>
          <View style={styles.typeRow}>
            {(["Gym", "Walk", "Run"] as ActivityType[]).map((item) => (
              <Pressable key={item} onPress={() => setType(item)} style={[styles.typeButton, type === item && styles.selected]}>
                <Text style={styles.typeEmoji}>{info[item].emoji}</Text>
                <Text style={[styles.typeText, type === item && styles.selectedText]}>{item}</Text>
                <Text style={styles.tagline}>{info[item].tagline}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput value={duration} onChangeText={setDuration} placeholder="e.g. 45" placeholderTextColor="#888" keyboardType="number-pad" maxLength={4} style={styles.input} />
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput value={date} onChangeText={setDate} placeholder="2026-10-27" placeholderTextColor="#888" maxLength={10} style={styles.input} />
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Leg day. Stairs are my enemy." placeholderTextColor="#888" multiline maxLength={300} style={[styles.input, styles.notes]} />
          <Pressable onPress={logActivity} disabled={saving} style={styles.logButton}>
            <Text style={styles.logText}>{saving ? "SAVING..." : "LOG THE W →"}</Text>
          </Pressable>
          <Text style={styles.mutedSmall}>Earn 10 XP per 10 minutes. Earn 1 AWzm Coin per 10 minutes (minimum 1 coin per log).</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>THE AWZM MARKET 📈📉</Text>
          <Text style={styles.mutedSmall}>Limited utility. Unlimited delusion.</Text>
          {rewards.map((reward) => {
            const owned = purchased.includes(reward.id);
            return (
              <View key={reward.id} style={styles.reward}>
                <View style={styles.rewardTextWrap}>
                  <Text style={styles.rewardTitle}>{reward.title} {owned ? "✓" : ""}</Text>
                  <Text style={styles.rewardDescription}>{reward.description}</Text>
                  <Text style={styles.rewardCost}>{owned ? "OWNED FOREVER" : `${reward.cost} AWzm Coins`}</Text>
                </View>
                <Pressable onPress={() => buyReward(reward)} style={[styles.buyButton, owned && styles.ownedButton]}>
                  <Text style={styles.buyText}>{owned ? "VIEW" : "BUY"}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.loreSection}>
          <Text style={styles.sectionHistory}>YOUR LORE 📜</Text>
          <Text style={styles.muted}>
            Your journey so far. Tap to inspect your stats.
          </Text>
          <View style={styles.loreCards}>
            {(["Gym", "Walk", "Run"] as ActivityType[]).map((activityType) => {
              const sessions = activities.filter((a) => a.type === activityType);
              const minutes = sessions.reduce((sum, a) => sum + a.duration, 0);
              const hours = Math.floor(minutes / 60);
              const remainingMinutes = minutes % 60;

              return (
                <Pressable
                  key={activityType}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${activityType} activity stats`}
                  onPress={() => setSelectedLore(activityType)}
                  style={styles.loreCard}
                >
                  <Text style={styles.loreCardTitle}>
                    {info[activityType].emoji} {activityType}
                  </Text>
                  <Text style={styles.loreCardTime}>
                    {hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`}
                  </Text>
                  <Text style={styles.loreCardSessions}>{sessions.length} sessions</Text>
                  <Text style={styles.loreCardAction}>VIEW STATS →</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.footer}>NO CAP. JUST CONSISTENCY. 🫡</Text>
      </ScrollView>
      <Modal
        visible={selectedLore !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLore(null)}
      >
        <View style={styles.loreModalBackdrop}>
          <View style={styles.loreModalCard}>
            {selectedLore && (() => {
              const sessions = activities.filter((a) => a.type === selectedLore);
              const totalMinutes = sessions.reduce((sum, a) => sum + a.duration, 0);
              const activeDays = new Set(sessions.map((a) => a.date)).size;

              return (
                <>
                  <Text style={styles.loreModalTitle}>
                    {selectedLore.toUpperCase()} LORE 📜
                  </Text>
                  <Text style={styles.loreTotalTime}>
                    {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                  </Text>
                  <Text style={styles.loreMuted}>Total time spent</Text>
                  <View style={styles.loreStats}>
                    <View style={styles.loreStat}>
                      <Text style={styles.loreStatValue}>{sessions.length}</Text>
                      <Text style={styles.loreMuted}>Sessions</Text>
                    </View>
                    <View style={styles.loreStat}>
                      <Text style={styles.loreStatValue}>{activeDays}</Text>
                      <Text style={styles.loreMuted}>Active days</Text>
                    </View>
                  </View>
                  <Text style={styles.loreHistoryTitle}>SESSION HISTORY</Text>
                  <ScrollView style={styles.loreHistory}>
                    {sessions.map((activity) => (
                      <View key={activity.id} style={styles.loreSession}>
                        <View style={styles.loreSessionDetails}>
                          <Text style={styles.loreSessionText}>
                            {activity.date} · {activity.duration} min
                          </Text>
                          {!!activity.notes && (
                            <Text style={styles.loreMuted}>{activity.notes}</Text>
                          )}
                        </View>
                        <Pressable
                          onPress={() => deleteActivity(activity.id)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${selectedLore} session from ${activity.date}`}
                        >
                          <Text style={styles.delete}>✕</Text>
                        </Pressable>
                      </View>
                    ))}
                    {sessions.length === 0 && (
                      <Text style={styles.loreMuted}>
                        No sessions yet. Your lore starts now.
                      </Text>
                    )}
                  </ScrollView>
                  <Pressable
                    onPress={() => setSelectedLore(null)}
                    style={styles.loreCloseButton}
                  >
                    <Text style={styles.loreCloseText}>CLOSE</Text>
                  </Pressable>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
      <Modal
        visible={celebration !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebration(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.memeCard}>
            {celebration && (
              <>
                <Text style={styles.section}>{celebration.title}</Text>
                {celebration.media && (
                  <Image
                    source={celebration.media.source}
                    style={styles.memeImage}
                    resizeMode="contain"
                  />
                )}
              </>
            )}
            <Pressable
              style={styles.logButton}
              onPress={() => setCelebration(null)}
            >
              <Text style={styles.logText}>I AM HIM. CONTINUE.</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#101010" },
  loreSection: { marginTop: 18, marginBottom: 12 },
  loreCards: { flexDirection: "row", gap: 8, marginTop: 10 },
  loreCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#1C1C1C",
    borderColor: "#393939",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  loreCardTitle: { color: "#B7FF43", fontSize: 14, fontWeight: "800" },
  loreCardTime: { color: "#FFF", fontSize: 17, fontWeight: "900", marginTop: 8 },
  loreCardSessions: { color: "#A0A0A0", fontSize: 10, marginTop: 4 },
  loreCardAction: { color: "#B7FF43", fontSize: 10, marginTop: 8 },
  loreModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  loreModalCard: {
    backgroundColor: "#191919",
    borderColor: "#B7FF43",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    maxHeight: "80%",
  },
  loreModalTitle: { color: "#B7FF43", fontSize: 22, fontWeight: "900" },
  loreTotalTime: { color: "#FFF", fontSize: 30, fontWeight: "900", marginTop: 16 },
  loreMuted: { color: "#AAA", marginTop: 4 },
  loreStats: { flexDirection: "row", marginTop: 18, marginBottom: 18 },
  loreStat: { flex: 1 },
  loreStatValue: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  loreHistoryTitle: { color: "#B7FF43", fontWeight: "800", marginBottom: 10 },
  loreHistory: { flexGrow: 0, maxHeight: 250 },
  loreSession: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomColor: "#333",
    borderBottomWidth: 1,
  },
  loreSessionDetails: { flex: 1 },
  loreSessionText: { color: "#FFF", fontWeight: "700" },
  loreCloseButton: {
    backgroundColor: "#B7FF43",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 18,
  },
  loreCloseText: { color: "#111", fontWeight: "900" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  memeCard: {
    backgroundColor: "#1B1B1B",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#B6FF4A",
  },
  memeImage: {
    width: "100%",
    height: 300,
    marginTop: 16,
  },
  container: { padding: 20, paddingBottom: 42 },
  brand: { color: "#B6FF4A", fontSize: 13, fontWeight: "900", letterSpacing: 2, marginTop: 18 },
  heading: { color: "#FFF", fontSize: 38, fontWeight: "900", marginTop: 8 },
  muted: { color: "#AAA", fontSize: 14, marginTop: 5 },
  mutedSmall: { color: "#AAA", fontSize: 12, marginTop: 10 },
  coinCard: { backgroundColor: "#202719", borderRadius: 18, padding: 18, marginTop: 22, borderWidth: 1, borderColor: "#668C32" },
  coinHeader: { flexDirection: "row", alignItems: "center" },
  coinTitle: { color: "#B6FF4A", fontSize: 22, fontWeight: "900", marginTop: 5 },
  coinBalance: { color: "#FFF", fontSize: 32, fontWeight: "900", marginLeft: 12 },
  coinHint: { color: "#C7D5B4", fontSize: 12, marginTop: 12, lineHeight: 18 },
  levelCard: { backgroundColor: "#1B1B1B", borderRadius: 18, padding: 18, marginTop: 16, borderWidth: 1, borderColor: "#353535" },
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
  reward: { flexDirection: "row", alignItems: "center", backgroundColor: "#252525", borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#393939" },
  rewardTextWrap: { flex: 1, paddingRight: 8 },
  rewardTitle: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  rewardDescription: { color: "#AAA", fontSize: 11, marginTop: 4 },
  rewardCost: { color: "#B6FF4A", fontSize: 11, fontWeight: "900", marginTop: 7 },
  buyButton: { backgroundColor: "#B6FF4A", borderRadius: 9, paddingVertical: 10, paddingHorizontal: 14 },
  ownedButton: { backgroundColor: "#444" },
  buyText: { color: "#101010", fontSize: 11, fontWeight: "900" },
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
