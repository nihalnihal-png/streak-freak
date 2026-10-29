import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
  ViewStyle,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMemesByCategory,
  getRandomMeme,
  memeRegistry,
} from "./src/memes/registry";

/* ───────────────────────── types ───────────────────────── */

type ActivityType = "Gym" | "Walk" | "Run";
type Activity = {
  id: string;
  type: ActivityType;
  duration: number;
  date: string;
  notes: string;
  xpEarned?: number;
};
type Reward = {
  id: string;
  title: string;
  description: string;
  cost: number;
  meme: string;
  icon: string;
  kind: "consumable" | "collectible";
};
type Celebration = {
  title: string;
  media: ReturnType<typeof getRandomMeme> | null;
  xp: number;
  coins: number;
  boosted: boolean;
  levelUp: number | null;
  streak: number;
  questDone: boolean;
  quip: string;
};

type ThemedDialogButton = {
  text: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "danger";
};

type ThemedDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  buttons: ThemedDialogButton[];
  onClose: () => void;
};

function ThemedDialog({
  visible,
  title,
  message,
  buttons,
  onClose,
}: ThemedDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{title}</Text>

          <Text style={styles.dialogMessage}>{message}</Text>

          <View style={styles.dialogButtons}>
            {buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                onPress={() => {
                  onClose();
                  button.onPress?.();
                }}
                style={[
                  styles.dialogButton,
                  button.variant === "primary" &&
                    styles.dialogPrimary,
                  button.variant === "danger" &&
                    styles.dialogDanger,
                  (!button.variant ||
                    button.variant === "secondary") &&
                    styles.dialogSecondary,
                ]}
              >
                <Text
                  style={[
                    styles.dialogButtonText,
                    button.variant === "primary" &&
                      styles.dialogPrimaryText,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ───────────────────────── constants ───────────────────────── */

// Storage keys are unchanged, so existing saved data keeps working.
const STORAGE_KEY = "@streak_freak_activities";
const COINS_KEY = "@streak_freak_awzm_coins";
const PURCHASED_KEY = "@streak_freak_purchased_rewards";
const INVENTORY_KEY = "@streak_freak_market_inventory";
const BOOST_KEY = "@streak_freak_npc_boost_expiry";
const RECOVERY_KEY = "@streak_freak_streak_recovery_dates";
const SHOWCASE_KEY = "@streak_freak_showcase";
const XP_PER_LEVEL = 100;
const NPC_BOOST_MS = 30 * 60 * 1000;
const QUICK_MINUTES = [15, 30, 45, 60];
const ACTIVITY_TYPES: ActivityType[] = ["Gym", "Walk", "Run"];
const TOP_PAD = Platform.OS === "ios" ? 54 : (StatusBar.currentHeight ?? 28) + 6;

const C = {
  bg: "#0A0A12",
  card: "#14141F",
  card2: "#1C1C2B",
  line: "#2D2D45",
  green: "#B6FF4A",
  purple: "#A855F7",
  pink: "#FF3EA5",
  yellow: "#FFE14A",
  cyan: "#3CF2FF",
  text: "#FFFFFF",
  sub: "#B2B2C8",
  dim: "#7C7C96",
  red: "#FF6B6B",
  ink: "#0A0A12",
};

const info: Record<ActivityType, { emoji: string; tagline: string; color: string }> = {
  Gym: { emoji: "🏋️", tagline: "Iron therapy", color: C.green },
  Walk: { emoji: "🚶", tagline: "Touch grass", color: C.cyan },
  Run: { emoji: "🏃", tagline: "Legs go brrr", color: C.pink },
};

const rewards: Reward[] = [
  { id: "npc", title: "NPC Energy", description: "A suspiciously neon energy drink. Doubles XP from newly logged workouts for 30 minutes.", cost: 75, meme: "⚡ NPC MODE ACTIVATED. SIDE QUESTS FEAR YOU.", icon: "🥤", kind: "consumable" },
  { id: "sigma", title: "Budget Sigma", description: "Financially irresponsible. Physically unstoppable. Equip this badge in your showcase.", cost: 60, meme: "🗿 SIGMA MODE: 0.3%\nWALLET EMPTY. VIBES FULL.", icon: "🗿", kind: "collectible" },
  { id: "grass", title: "Touch Grass Certificate", description: "A highly questionable, officially unofficial achievement certificate.", cost: 90, meme: "🌱 CERTIFIED GRASS TOUCHER\nTHE OUTSIDE WORLD FEARS YOU.", icon: "📜", kind: "collectible" },
  { id: "streak-insurance", title: "Streak Insurance", description: "Recover yesterday's missed day if your previous streak ended two days ago. One use.", cost: 120, meme: "🛟 YOUR STREAK HAS BEEN RESCUED.", icon: "🛟", kind: "consumable" },
  { id: "noob-trophy", title: "Certified Noob Trophy", description: "A premium plastic trophy for a deeply unserious champion.", cost: 45, meme: "🏆 CERTIFIED NOOB. UNLIMITED POTENTIAL.", icon: "🏆", kind: "collectible" },
  { id: "ohio-passport", title: "Ohio Passport", description: "Proof of residency in Ohio. Valid nowhere. Cannot be revoked. Cannot be explained.", cost: 55, meme: "🛂 OFFICIAL OHIO CITIZEN.\nYOU CAN NEVER LEAVE.", icon: "🛂", kind: "collectible" },
  { id: "rizz-license", title: "Rizz License", description: "Expired in 2019. Still not accepted anywhere. Looks great in a showcase.", cost: 80, meme: "🪪 LICENSED TO RIZZ.\nEXPIRED. STILL RIZZING.", icon: "🪪", kind: "collectible" },
];

const RANKS = [
  "BACKGROUND NPC",
  "SKIBIDI INTERN",
  "ASPIRING RIZZLER",
  "FANUM TAX EVADER",
  "AURA FARMER",
  "MEWING MENACE",
  "SIGMA GRINDSET",
  "OHIO FINAL BOSS",
  "LOCKED-IN LEGEND",
  "GIGACHAD (UNEMPLOYED)",
];

const WIN_TITLES: Record<ActivityType, string[]> = {
  Gym: ["GYM LOGGED. IRON THERAPY COMPLETE. 🏋️", "Weights lifted. Aura gained. Absolutely cinema.", "Your gym bro arc is officially canon."],
  Walk: ["GRASS: TOUCHED. 🌱", "Outside survived. Absolutely cinema.", "Background NPC walked. Main character unlocked."],
  Run: ["LEGS WENT BRRR. 🏃", "You ran. The couch is in shambles.", "Cardio cooked. You're him."],
};

const COIN_QUIPS = [
  "AWzm to the moon! The moon has declined your application.",
  "Your portfolio is up 400%. Its actual value remains zero.",
  "Congratulations. You are now the CEO of absolutely nothing.",
  "Diamond hands. Paper wallet. Negative financial literacy.",
  "Not financial advice. Not even advice.",
];

const BANNER_LINES = [
  "⚠️ NOT FINANCIAL ADVICE. NOT EVEN ADVICE.",
  "📈 AWzm UP 6,900%. REAL VALUE: $0.00",
  "🚨 BREAKING: LOCAL NPC TOUCHES GRASS",
  "🗿 SIGMA GRINDSET LOADING... 69%",
  "🧠 BRAIN ROT: CRITICAL. GAINS: ALSO CRITICAL.",
  "🔒 LOCKED IN. NO CAP. FR FR.",
  "💀 LEG DAY IS NOT A SUGGESTION",
];

const TAGLINES = [
  "Your body won't update itself.",
  "Locked in. No cap.",
  "Aura farming in progress.",
  "Skibidi cardio. Ohio gains.",
];

/* ───────────────────────── helpers ───────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dayKey(new Date());
// Noon avoids daylight-saving edge cases when stepping across days.
const shiftDay = (key: string, delta: number) => {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + delta, 12));
};
const isRealDate = (key: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
};
const xpFor = (minutes: number) => Math.floor(minutes / 10) * 10;
const coinsFor = (minutes: number) => Math.max(1, Math.floor(minutes / 10));
const rankFor = (level: number) => RANKS[Math.min(Math.max(level, 1), RANKS.length) - 1];

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Current streak: consecutive active days ending today, or yesterday if today isn't logged yet.
const getStreak = (days: Set<string>, todayKey: string) => {
  let cursor = days.has(todayKey) ? todayKey : shiftDay(todayKey, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
};

const getBestStreak = (days: Set<string>, todayKey: string) => {
  const sorted = Array.from(days).filter((d) => d <= todayKey).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && shiftDay(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
};

const streakLine = (streak: number, activeToday: boolean) => {
  if (streak === 0) return "No streak. You're cooked. Log one W to start the aura.";
  if (!activeToday) return `${streak}-day streak on life support. Log today or get ratio'd by yesterday.`;
  if (streak === 1) return "Day 1. Every NPC starts here.";
  if (streak < 4) return "Cooking. Do not stop.";
  if (streak < 7) return "Locked in. The grindset is loading.";
  if (streak < 14) return "One week plus. Certified sigma behaviour.";
  if (streak < 30) return "Two weeks plus. Your aura has its own zip code.";
  return "30+ days. You are the final boss of Ohio.";
};

const safeParse = (raw: string | null): unknown => {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const isActivityType = (v: unknown): v is ActivityType => v === "Gym" || v === "Walk" || v === "Run";

const cleanActivity = (v: unknown): Activity | null => {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (typeof a.id !== "string" || !isActivityType(a.type) || typeof a.date !== "string" || !isRealDate(a.date)) return null;
  const duration = Number(a.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const xp = typeof a.xpEarned === "number" && Number.isFinite(a.xpEarned) ? a.xpEarned : undefined;
  return {
    id: a.id,
    type: a.type,
    duration,
    date: a.date,
    notes: typeof a.notes === "string" ? a.notes : "",
    ...(xp !== undefined ? { xpEarned: xp } : {}),
  };
};

// Writes several keys in one native call when the installed AsyncStorage supports it
// (v2 has multiSet, v3 has setMany); falls back to one-by-one writes otherwise.
type BatchWriter = {
  multiSet?: (pairs: [string, string][]) => Promise<void>;
  setMany?: (entries: Record<string, string>) => Promise<void>;
};
const saveAll = async (pairs: [string, string][]): Promise<void> => {
  const store = AsyncStorage as unknown as BatchWriter;
  if (typeof store.multiSet === "function") {
    await store.multiSet(pairs);
  } else if (typeof store.setMany === "function") {
    await store.setMany(Object.fromEntries(pairs));
  } else {
    for (const [key, value] of pairs) await AsyncStorage.setItem(key, value);
  }
};

const buzz = (pattern: number | number[]) => {
  try {
    Vibration.vibrate(pattern);
  } catch {
    // vibration is a bonus, never a requirement
  }
};

/* ───────────────────────── small components ───────────────────────── */

// A sticker-style hard shadow: a coloured block peeking out behind a card.
function Hard({ color, children, style, radius = 18 }: { color: string; children: React.ReactNode; style?: StyleProp<ViewStyle>; radius?: number }) {
  return <View style={[{ backgroundColor: color, borderRadius: radius, paddingRight: 5, paddingBottom: 5 }, style]}>{children}</View>;
}

function RotatingBanner({ lines }: { lines: string[] }) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setIndex((n) => (n + 1) % lines.length);
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [fade, lines.length]);
  return (
    <View style={styles.banner}>
      <Animated.Text numberOfLines={2} style={[styles.bannerText, { opacity: fade }]}>
        {lines[index]}
      </Animated.Text>
    </View>
  );
}

function Flame({ mood }: { mood: "dead" | "cold" | "hot" }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (mood !== "hot") {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mood, scale]);
  const face = mood === "hot" ? "🔥" : mood === "cold" ? "🥶" : "💀";
  return <Animated.Text style={[styles.flame, { transform: [{ scale }] }]}>{face}</Animated.Text>;
}

function CelebrationModal({ data, onClose }: { data: Celebration | null; onClose: () => void }) {
  const pop = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    if (!data) return;
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [data, pop]);

  return (
    <Modal visible={data !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {data && (
          <Animated.View style={[styles.celebCard, { transform: [{ scale: pop }] }]}>
            <View style={styles.stickerW}>
              <Text style={styles.stickerWText}>W</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip reaction" style={styles.skip}>
              <Text style={styles.skipText}>✕</Text>
            </Pressable>
            <ScrollView style={styles.celebScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.celebTitle}>{data.title}</Text>
              {data.media && <Image source={data.media.source} style={styles.memeImage} resizeMode="contain" accessibilityLabel="Meme reaction" />}
              <View style={styles.chipRow}>
                <View style={[styles.chip, { borderColor: C.green }]}>
                  <Text style={[styles.chipText, { color: C.green }]}>+{data.xp} XP{data.boosted ? " (2×)" : ""}</Text>
                </View>
                <View style={[styles.chip, { borderColor: C.yellow }]}>
                  <Text style={[styles.chipText, { color: C.yellow }]}>+{data.coins} AWzm 🪙</Text>
                </View>
                <View style={[styles.chip, { borderColor: C.pink }]}>
                  <Text style={[styles.chipText, { color: C.pink }]}>🔥 {data.streak}-day streak</Text>
                </View>
              </View>
              {data.levelUp !== null && (
                <View style={styles.levelUpBanner}>
                  <Text style={styles.levelUpTitle}>LEVEL UP → {data.levelUp}</Text>
                  <Text style={styles.levelUpRank}>{rankFor(data.levelUp)}</Text>
                </View>
              )}
              {data.questDone && <Text style={styles.questDone}>🎯 Daily side quest complete.</Text>}
              <Text style={styles.quip}>{data.quip}</Text>
              <Hard color={C.pink} radius={14} style={{ marginTop: 16 }}>
                <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.logButton, pressed && styles.pressed]}>
                  <Text style={styles.logText}>I AM HIM. CONTINUE.</Text>
                </Pressable>
              </Hard>
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

/* ───────────────────────── app ───────────────────────── */

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [coins, setCoins] = useState(0);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [npcBoostExpiry, setNpcBoostExpiry] = useState<number | null>(null);
  const [recoveryDates, setRecoveryDates] = useState<string[]>([]);
  const [showcase, setShowcase] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Reward | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<Reward | null>(null);
  const [purchaseMeme, setPurchaseMeme] =
    useState<ReturnType<typeof getRandomMeme> | null>(null);
  const [pendingItemUse, setPendingItemUse] = useState<Reward | null>(null);
  const [itemUseMeme, setItemUseMeme] =
    useState<ReturnType<typeof getRandomMeme> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [memeGalleryOpen, setMemeGalleryOpen] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState("all");
  const [marketOpen, setMarketOpen] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [devStreakOverride, setDevStreakOverride] = useState<number | null>(null);
  const [devStreakInput, setDevStreakInput] = useState("7");
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    buttons: ThemedDialogButton[];
  } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [type, setType] = useState<ActivityType>("Gym");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedLore, setSelectedLore] = useState<ActivityType | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<Celebration[]>([]);
  const [now, setNow] = useState(Date.now());

  const savingRef = useRef(false);
  const txRef = useRef(false);
  const showNotice = (title: string, message: string) => {
    setDialog({
      title,
      message,
      buttons: [{ text: "OK", variant: "primary" }],
    });
  };
  const tagline = useMemo(() => pick(TAGLINES), []);
  const chart = useMemo(() => Array.from({ length: 16 }, () => 0.25 + Math.random() * 0.75), []);
  const pump = useMemo(() => 100 + Math.floor(Math.random() * 9000), []);
  const memeGroups = useMemo(() => getMemesByCategory(), []);
  const galleryMemes =
    galleryCategory === "all"
      ? memeRegistry
      : memeGroups[galleryCategory] ?? [];
  const galleryCategories = Object.keys(memeGroups).sort();

  // Always holds the newest state, so confirm-dialog callbacks never act on stale values.
  const latest = useRef({ activities, coins, purchased, inventory, npcBoostExpiry, recoveryDates, showcase });
  latest.current = { activities, coins, purchased, inventory, npcBoostExpiry, recoveryDates, showcase };

  /* load saved data */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawActivities, rawCoins, rawPurchased, rawInventory, rawBoost, rawRecoveries, rawShowcase] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(COINS_KEY),
          AsyncStorage.getItem(PURCHASED_KEY),
          AsyncStorage.getItem(INVENTORY_KEY),
          AsyncStorage.getItem(BOOST_KEY),
          AsyncStorage.getItem(RECOVERY_KEY),
          AsyncStorage.getItem(SHOWCASE_KEY),
        ]);

        let acts: Activity[] = [];
        if (rawActivities) {
          const parsed = safeParse(rawActivities);
          let needsBackup = false;
          if (Array.isArray(parsed)) {
            acts = parsed.map(cleanActivity).filter((a): a is Activity => a !== null);
            needsBackup = acts.length !== parsed.length;
          } else needsBackup = true;
          // If anything looked off, keep a copy of the raw data before it can be overwritten.
          if (needsBackup) AsyncStorage.setItem(`${STORAGE_KEY}_backup`, rawActivities).catch(() => {});
        }

        const coinNum = rawCoins !== null && Number.isFinite(Number(rawCoins)) ? Math.max(0, Math.floor(Number(rawCoins))) : 0;

        let purchasedIds: string[] = [];
        const parsedPurchased = safeParse(rawPurchased);
        if (Array.isArray(parsedPurchased)) purchasedIds = parsedPurchased.filter((x): x is string => typeof x === "string");

        let inv: Record<string, number> = {};
        const parsedInv = safeParse(rawInventory);
        if (parsedInv && typeof parsedInv === "object" && !Array.isArray(parsedInv)) {
          inv = Object.fromEntries(
            Object.entries(parsedInv as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === "number" && Number.isFinite(e[1]) && e[1] >= 0)
          );
        }

        // Old versions sold NPC Energy as a one-time collectible. Convert it to one drink, once, and save the result.
        if (purchasedIds.includes("npc")) {
          purchasedIds = purchasedIds.filter((id) => id !== "npc");
          const migration: [string, string][] = [[PURCHASED_KEY, JSON.stringify(purchasedIds)]];
          if (rawInventory === null) {
            inv = { ...inv, npc: 1 };
            migration.push([INVENTORY_KEY, JSON.stringify(inv)]);
          }
          saveAll(migration).catch(() => {});
        }

        const boostNum = Number(rawBoost);
        const boost = rawBoost !== null && Number.isFinite(boostNum) && boostNum > Date.now() ? boostNum : null;

        const recoveries = safeParse(rawRecoveries);
        const showcaseIds = safeParse(rawShowcase);

        if (cancelled) return;
        setActivities(acts);
        setCoins(coinNum);
        setPurchased(purchasedIds);
        setInventory(inv);
        setNpcBoostExpiry(boost);
        if (Array.isArray(recoveries)) setRecoveryDates(recoveries.filter((x): x is string => typeof x === "string" && isRealDate(x)));
        if (Array.isArray(showcaseIds)) setShowcase(showcaseIds.filter((x): x is string => typeof x === "string"));
      } catch {
        showNotice("Oops", "Couldn't load saved data. Your existing data has not been intentionally cleared.");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* keep "today" and the boost timer fresh */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  /* derived values (always calculated from the saved records) */
  const todayKey = dayKey(new Date(now));
  const totalMinutes = activities.reduce((sum, a) => sum + a.duration, 0);
  const totalXP = activities.reduce((sum, a) => sum + (typeof a.xpEarned === "number" ? a.xpEarned : xpFor(a.duration)), 0);
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const levelXP = totalXP % XP_PER_LEVEL;
  const activeDays = useMemo(() => new Set([...activities.map((a) => a.date), ...recoveryDates]), [activities, recoveryDates]);
  const streak = getStreak(activeDays, todayKey);
  const bestStreak = getBestStreak(activeDays, todayKey);
  const displayedStreak = devStreakOverride ?? streak;
  const activeToday = activeDays.has(todayKey);
  const mood: "dead" | "cold" | "hot" = streak === 0 ? "dead" : activeToday ? "hot" : "cold";
  const boostRemaining = npcBoostExpiry !== null && npcBoostExpiry > now ? Math.ceil((npcBoostExpiry - now) / 60000) : 0;
  const QUEST_TARGET = 60;
  const questMinutes: Record<ActivityType, number> = {
    Gym: activities
      .filter((a) => a.date === todayKey && a.type === "Gym")
      .reduce((sum, a) => sum + a.duration, 0),

    Walk: activities
      .filter((a) => a.date === todayKey && a.type === "Walk")
      .reduce((sum, a) => sum + a.duration, 0),

    Run: activities
      .filter((a) => a.date === todayKey && a.type === "Run")
      .reduce((sum, a) => sum + a.duration, 0),
  };

  const questComplete: Record<ActivityType, boolean> = {
    Gym: questMinutes.Gym >= QUEST_TARGET,
    Walk: questMinutes.Walk >= QUEST_TARGET,
    Run: questMinutes.Run >= QUEST_TARGET,
  };

  const completedQuests = ACTIVITY_TYPES.filter(
    (activity) => questComplete[activity]
  ).length;

  const allQuestsComplete = completedQuests === 3;

  const previewMinutes = Number(duration);
  const previewValid = duration.trim() !== "" && Number.isInteger(previewMinutes) && previewMinutes >= 1 && previewMinutes <= 1440;
  const previewXP = previewValid ? xpFor(previewMinutes) * (boostRemaining > 0 ? 2 : 1) : 0;
  const previewCoins = previewValid ? coinsFor(previewMinutes) : 0;

  /* actions */
  const logActivity = async () => {
    if (savingRef.current) return;
    const minutes = Number(duration.trim());
    const cleanDate = date.trim();
    if (duration.trim() === "" || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      showNotice("Duration needed", "Enter a whole number of minutes from 1 to 1440.");
      return;
    }
    if (!isRealDate(cleanDate)) {
      showNotice("Invalid date", "Use YYYY-MM-DD, for example 2026-10-23. It has to be a real calendar date.");
      return;
    }
    if (cleanDate > today()) {
      showNotice("Future date", "You can't log workouts that haven't happened yet. Time travel is not on the roadmap.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const s = latest.current;
      const nowMs = Date.now();
      const boosted = s.npcBoostExpiry !== null && s.npcBoostExpiry > nowMs;
      const baseXP = xpFor(minutes);
      const xp = boosted ? baseXP * 2 : baseXP;
      const earnedCoins = coinsFor(minutes);
      const entry: Activity = {
        id: `${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        duration: minutes,
        date: cleanDate,
        notes: notes.trim(),
        xpEarned: xp,
      };
      const nextActivities = [entry, ...s.activities].sort((a, b) => b.date.localeCompare(a.date));
      const nextCoins = s.coins + earnedCoins;

      // One write for both values, so a failure can't leave activity and coins out of step.
      await saveAll([
        [STORAGE_KEY, JSON.stringify(nextActivities)],
        [COINS_KEY, String(nextCoins)],
      ]);

      // Everything below only runs after the save succeeded.
      const todayNow = today();
      const levelBefore = Math.floor(totalXP / XP_PER_LEVEL) + 1;
      const levelAfter = Math.floor((totalXP + xp) / XP_PER_LEVEL) + 1;
      const streakAfter = getStreak(new Set([...nextActivities.map((a) => a.date), ...s.recoveryDates]), todayNow);
      setActivities(nextActivities);
      setCoins(nextCoins);
      setDuration("");
      setNotes("");
      setDate(todayNow);
      setNow(Date.now());

      const minutesBefore = s.activities
        .filter((a) => a.date === todayNow && a.type === type)
        .reduce((sum, a) => sum + a.duration, 0);

      const minutesAfter = nextActivities
        .filter((a) => a.date === todayNow && a.type === type)
        .reduce((sum, a) => sum + a.duration, 0);

      const questJustCompleted =
        cleanDate === todayNow &&
        minutesBefore < QUEST_TARGET &&
        minutesAfter >= QUEST_TARGET;

      const allBefore = ACTIVITY_TYPES.every((activity) => {
        const minutes = s.activities
          .filter((a) => a.date === todayNow && a.type === activity)
          .reduce((sum, a) => sum + a.duration, 0);

        return minutes >= QUEST_TARGET;
      });

      const allAfter = ACTIVITY_TYPES.every((activity) => {
        const minutes = nextActivities
          .filter((a) => a.date === todayNow && a.type === activity)
          .reduce((sum, a) => sum + a.duration, 0);

        return minutes >= QUEST_TARGET;
      });

      const moggedJustCompleted =
        cleanDate === todayNow && !allBefore && allAfter;

      const getMemeSafely = (
        category: string
      ): ReturnType<typeof getRandomMeme> | null => {
        try {
          return (
            getRandomMeme(category) ??
            (category.startsWith("daily-goal-")
              ? getRandomMeme("daily-goal")
              : null)
          );
        } catch {
          return null;
        }
      };

      const logCelebration: Celebration = {
        title: pick(WIN_TITLES[type]),
        media: getMemeSafely(type.toLowerCase()),
        xp,
        coins: earnedCoins,
        boosted,
        levelUp: levelAfter > levelBefore ? levelAfter : null,
        streak: streakAfter,
        questDone: false,
        quip: pick(COIN_QUIPS),
      };

      const followUps: Celebration[] = [];

      if (questJustCompleted) {
        const questCategories: Record<ActivityType, string> = {
          Gym: "daily-goal-gym",
          Walk: "daily-goal-walk",
          Run: "daily-goal-run",
        };

        followUps.push({
          title: `${type.toUpperCase()} MAXED! 🎯`,
          media: getMemeSafely(questCategories[type]),
          xp: 0,
          coins: 0,
          boosted: false,
          levelUp: null,
          streak: streakAfter,
          questDone: false,
          quip: "60 minutes. Certified maxing behaviour.",
        });
      }

      if (moggedJustCompleted) {
        followUps.push({
          title: "MOGGED THE DAY. 🗿👑",
          media: getMemeSafely("daily-goal-mogged"),
          xp: 0,
          coins: 0,
          boosted: false,
          levelUp: null,
          streak: streakAfter,
          questDone: true,
          quip: "Gym. Walk. Run. All maxed. Absolute final boss.",
        });
      }

      setCelebrationQueue(followUps);
      setCelebration(logCelebration);
      buzz([0, 40, 70, 40]);
    } catch {
      showNotice("Couldn't save", "Nothing was logged and no coins were added. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const deleteActivity = (id: string) => {
    setDialog({
      title: "Delete activity?",
      message: "XP and activity stats will be recalculated. Coins already earned or spent won't change.",
      buttons: [
        { text: "CANCEL", variant: "secondary" },
        {
          text: "DELETE",
          variant: "danger",
          onPress: async () => {
          try {
            const next = latest.current.activities.filter((a) => a.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            setActivities(next);
          } catch {
            showNotice("Error", "Couldn't delete this activity.");
          }
        },
        },
      ],
    });
  };

  const completePurchase = async (reward: Reward) => {
    if (txRef.current) return;
    const s = latest.current;
    if (reward.kind === "collectible" && s.purchased.includes(reward.id)) return;
    if (s.coins < reward.cost) {
      showNotice("Insufficient funds 💸", `You need ${reward.cost - s.coins} more AWzm Coins. Get back to the grind.`);
      return;
    }
    txRef.current = true;
    try {
      const nextCoins = s.coins - reward.cost;
      const pairs: [string, string][] = [[COINS_KEY, String(nextCoins)]];
      let nextInventory = s.inventory;
      let nextPurchased = s.purchased;
      let nextShowcase = s.showcase;
      if (reward.kind === "consumable") {
        nextInventory = { ...s.inventory, [reward.id]: (s.inventory[reward.id] || 0) + 1 };
        pairs.push([INVENTORY_KEY, JSON.stringify(nextInventory)]);
      } else {
        nextPurchased = [...s.purchased, reward.id];
        nextShowcase = s.showcase.includes(reward.id) ? s.showcase : [...s.showcase, reward.id];
        pairs.push([PURCHASED_KEY, JSON.stringify(nextPurchased)], [SHOWCASE_KEY, JSON.stringify(nextShowcase)]);
      }
      await saveAll(pairs);
      setCoins(nextCoins);
      setInventory(nextInventory);
      setPurchased(nextPurchased);
      setShowcase(nextShowcase);
      showNotice("Investment acquired 📉", `${reward.title} added to ${reward.kind === "consumable" ? "your inventory" : "your showcase"}.`);
    } catch {
      showNotice("Transaction reverted", "Couldn't save the purchase. No coins were spent. Try again.");
    } finally {
      txRef.current = false;
    }
  };

  const buyReward = (reward: Reward) => {
    if (reward.kind === "collectible" && purchased.includes(reward.id)) {
      setSelectedItem(reward);
      return;
    }
    if (coins < reward.cost) {
      showNotice("Insufficient funds 💸", `You need ${reward.cost - coins} more AWzm Coins. Get back to the grind.`);
      return;
    }
    let meme: ReturnType<typeof getRandomMeme> | null = null;

    try {
      meme = getRandomMeme("market-confirm");
    } catch {
      meme = null;
    }

    setPurchaseMeme(meme);
    setPendingPurchase(reward);
  };

  const requestItemUse = (reward: Reward) => {
    const category =
      reward.id === "npc"
        ? "energy-drink-confirm"
        : reward.id === "streak-insurance"
          ? "streak-insurance-confirm"
          : null;

    if (!category) return;

    let meme: ReturnType<typeof getRandomMeme> | null = null;
    try {
      meme = getRandomMeme(category);
    } catch {
      meme = null;
    }

    setItemUseMeme(meme);
    setPendingItemUse(reward);
  };

  const confirmItemUse = () => {
    const reward = pendingItemUse;
    setPendingItemUse(null);
    if (reward) void useItem(reward);
  };

  const useItem = async (reward: Reward) => {
    if (txRef.current) return;
    const s = latest.current;
    const quantity = s.inventory[reward.id] || 0;
    if (quantity < 1) {
      showNotice("Out of stock", "Buy this item from the market first.");
      return;
    }
    if (reward.id === "npc") {
      txRef.current = true;
      try {
        const nextExpiry = Math.max(Date.now(), s.npcBoostExpiry || 0) + NPC_BOOST_MS;
        const nextInventory = { ...s.inventory, npc: quantity - 1 };
        await saveAll([
          [INVENTORY_KEY, JSON.stringify(nextInventory)],
          [BOOST_KEY, String(nextExpiry)],
        ]);
        setInventory(nextInventory);
        setNpcBoostExpiry(nextExpiry);
        setNow(Date.now());
        buzz(60);
        showNotice("NPC ENERGY ACTIVATED ⚡", "2× XP on newly logged workouts for 30 minutes. The timer keeps running if you close the app.");
      } catch {
        showNotice("Couldn't use item", "Please try again.");
      } finally {
        txRef.current = false;
      }
      return;
    }
    if (reward.id === "streak-insurance") {
      const days = new Set([...s.activities.map((a) => a.date), ...s.recoveryDates]);
      const yesterday = shiftDay(today(), -1);
      const twoDays = shiftDay(today(), -2);
      if (days.has(yesterday) || !days.has(twoDays)) {
        showNotice("Insurance denied 🧾", "This item only repairs a gap for yesterday when you had an activity two days ago. No fake workouts will be added.");
        return;
      }

      if (txRef.current) return;
      txRef.current = true;
      try {
        const cur = latest.current;
        const left = cur.inventory["streak-insurance"] || 0;
        if (left < 1) {
          showNotice("Out of stock", "Buy this item from the market first.");
          return;
        }
        const nextRecovery = [...new Set([...cur.recoveryDates, yesterday])];
        const nextInventory = { ...cur.inventory, "streak-insurance": left - 1 };
        await saveAll([
          [RECOVERY_KEY, JSON.stringify(nextRecovery)],
          [INVENTORY_KEY, JSON.stringify(nextInventory)],
        ]);
        setRecoveryDates(nextRecovery);
        setInventory(nextInventory);
        showNotice("STREAK SAVED 🛟", "Yesterday is covered. Go earn the next day for real.");
      } catch {
        showNotice("Couldn't recover", "Please try again.");
      } finally {
        txRef.current = false;
      }
    }
  };

  const setTestStreak = () => {
    const value = Number(devStreakInput.trim());

    if (
      devStreakInput.trim() === "" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 10000
    ) {
      showNotice("Invalid streak", "Enter a whole number from 0 to 10000.");
      return;
    }

    setDevStreakOverride(value);
    setDevPanelOpen(false);
  };

  const resetTestStreak = () => {
    setDevStreakOverride(null);
    setDevStreakInput("7");
  };

  const clearLore = () => {
    setDialog({
      title: "Clear all lore?",
      message: "This deletes activities, XP progress, streak history, coins, purchases, inventory and showcase data from this app.",
      buttons: [
        { text: "CANCEL", variant: "secondary" },
        {
          text: "CLEAR EVERYTHING",
          variant: "danger",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                STORAGE_KEY,
                COINS_KEY,
                PURCHASED_KEY,
                INVENTORY_KEY,
                BOOST_KEY,
                RECOVERY_KEY,
                SHOWCASE_KEY,
              ]);

              setActivities([]);
              setCoins(0);
              setPurchased([]);
              setInventory({});
              setNpcBoostExpiry(null);
              setRecoveryDates([]);
              setShowcase([]);
              setCelebration(null);
              setSelectedLore(null);
              setSelectedItem(null);
              setCelebrationQueue([]);
              setNow(Date.now());
              resetTestStreak();

              showNotice("Fresh save", "Your local Streak Freak data has been reset.");
            } catch {
              showNotice("Reset failed", "Some data could not be cleared. Please try again.");
            }
          },
        },
      ],
    });
  };

  const closeCelebration = () => {
    if (celebrationQueue.length > 0) {
      setCelebration(celebrationQueue[0]);
      setCelebrationQueue((queue) => queue.slice(1));
    } else {
      setCelebration(null);
    }
  };

  if (!loaded) {
    return (
      <View style={[styles.safe, styles.center]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingEmoji}>🧠</Text>
        <Text style={styles.loadingText}>Loading your gains...</Text>
        <Text style={styles.muted}>(lagging in Ohio)</Text>
      </View>
    );
  }

  const ownedCollectibles = rewards.filter((r) => r.kind === "collectible" && purchased.includes(r.id));

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <RotatingBanner lines={BANNER_LINES} />

        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={({ pressed }) => [
            styles.hamburgerButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Pressable
              onLongPress={() => {
                if (__DEV__) setDevPanelOpen(true);
              }}
              delayLongPress={1200}
              accessibilityRole="button"
              accessibilityLabel="Open developer tools"
            >
              <Text style={styles.brand}>STREAK FREAK ⚡</Text>
            </Pressable>
            <Text style={styles.heading}>
              BEAST <Text style={{ color: C.green }}>MODE.</Text>
            </Text>
            <Text style={styles.muted}>{tagline}</Text>
          </View>
        </View>

        {/* streak hero */}
        <Hard color={C.purple} style={styles.gap}>
          <View style={[styles.card, styles.streakCard]}>
            <Flame mood={mood} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>Current streak</Text>
              <Text style={styles.streakNum}>
                {displayedStreak}
                <Text style={styles.streakUnit}> {displayedStreak === 1 ? "day" : "days"}</Text>
              </Text>
              <Text style={styles.streakLine}>{streakLine(displayedStreak, activeToday)}</Text>
              <Text style={styles.mutedSmall}>Best ever: {bestStreak} {bestStreak === 1 ? "day" : "days"}</Text>
            </View>
            <View style={{ alignItems: "center", marginLeft: 8 }}>
              <Text style={styles.mutedSmall}>
                ×{inventory["streak-insurance"] || 0}
              </Text>

              <Pressable
                disabled={(inventory["streak-insurance"] || 0) < 1}
                onPress={() => {
                  const item = rewards.find(
                    (reward) => reward.id === "streak-insurance"
                  );

                  if (!item) return;

                  requestItemUse(item);
                }}
                accessibilityRole="button"
                accessibilityLabel="Use Streak Insurance"
                style={({ pressed }) => [
                  styles.buyButton,
                  (inventory["streak-insurance"] || 0) < 1 &&
                    styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buyText}>USE 🛟</Text>
              </Pressable>
            </View>
          </View>
        </Hard>

        {/* level */}
        <View style={[styles.card, styles.gap]}>
          <View style={styles.levelTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelTitle}>LEVEL {level} 🥷</Text>
              <Text style={styles.rank}>{rankFor(level)}</Text>
            </View>
            <Text style={styles.xpNumber}>{totalXP} XP</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${levelXP}%` }]} />
          </View>
          <Text style={styles.mutedSmall}>
            {levelXP}/{XP_PER_LEVEL} XP to Level {level + 1}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              gap: 8,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.green, fontWeight: "800" }}>
                🥤 NPC Energy ×{inventory.npc || 0}
              </Text>

              <Text style={styles.mutedSmall}>
                {boostRemaining > 0
                  ? `2× XP active · ${boostRemaining} min left`
                  : "Double XP for 30 minutes"}
              </Text>
            </View>

            <Pressable
              disabled={(inventory.npc || 0) < 1}
              onPress={() => {
                const item = rewards.find(
                  (reward) => reward.id === "npc"
                );

                if (!item) return;

                requestItemUse(item);
              }}
              accessibilityRole="button"
              accessibilityLabel="Drink NPC Energy"
              style={({ pressed }) => [
                styles.buyButton,
                (inventory.npc || 0) < 1 && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.buyText}>
                {boostRemaining > 0 ? "DRINK +" : "DRINK"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* coins */}
        <Hard color={C.yellow} style={styles.gap}>
          <View style={[styles.card, styles.coinCard]}>
            <View style={styles.coinHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.coinTitle}>AWzm Coins 🪙</Text>
                <Text style={styles.mutedSmall}>Absolutely Worthless Zero Money</Text>
              </View>
              <Text style={styles.coinBalance}>{coins}</Text>
            </View>
            <View style={styles.chartRow}>
              {chart.map((h, i) => (
                <View key={i} style={[styles.chartBar, { height: 8 + h * 34, backgroundColor: i > 0 && h < chart[i - 1] ? C.pink : C.green }]} />
              ))}
            </View>
            <Text style={styles.coinTicker}>24H ▲ +{pump}% · REAL VALUE: $0.00</Text>
            <Text style={styles.coinHint}>Earn coins by logging workouts. Spend them on premium-grade nonsense. Not real money, not an investment.</Text>
          </View>
        </Hard>

        {/* stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>⏱️</Text>
            <Text style={styles.statValue}>{(totalMinutes / 60).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Hours total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>📒</Text>
            <Text style={styles.statValue}>{activities.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statEmoji}>🏅</Text>
            <Text style={styles.statValue}>{bestStreak}</Text>
            <Text style={styles.statLabel}>Best streak</Text>
          </View>
        </View>

        {/* daily quests */}
        <View style={[styles.card, styles.gap]}>
          <View style={styles.goalHeader}>
            <Text style={styles.section}>Daily Maxing 🎯</Text>
            <Text style={styles.mutedSmall}>
              {completedQuests}/3
            </Text>
          </View>

          <View style={styles.questRow}>
            {ACTIVITY_TYPES.map((activity) => {
              const progress = Math.min(
                questMinutes[activity] / QUEST_TARGET,
                1
              );
              const complete = questComplete[activity];

              return (
                <View key={activity} style={styles.questTile}>
                  <Text style={styles.questIcon}>
                    {complete ? "✅" : info[activity].emoji}
                  </Text>

                  <Text
                    style={[
                      styles.questName,
                      { color: info[activity].color },
                    ]}
                    numberOfLines={1}
                  >
                    {activity.toUpperCase()}
                  </Text>

                  <View style={styles.questTrack}>
                    <View
                      style={[
                        styles.questFill,
                        {
                          width: `${progress * 100}%`,
                          backgroundColor: complete
                            ? C.yellow
                            : info[activity].color,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.questMinutes}>
                    {Math.min(questMinutes[activity], QUEST_TARGET)}/60
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.mutedSmall}>
            {allQuestsComplete
              ? "MOGGED THE DAY. ABSOLUTE FINAL BOSS. 🗿"
              : "60 minutes each. Max all three to mog the day."}
          </Text>
        </View>

        {/* log */}
        <Hard color={C.green} style={styles.gap}>
          <View style={styles.card}>
            <Text style={styles.section}>Log your side quest</Text>
            <Text style={styles.label}>Activity type</Text>
            <View style={styles.typeRow}>
              {ACTIVITY_TYPES.map((item) => {
                const on = type === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setType(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={({ pressed }) => [styles.typeButton, on && { borderColor: info[item].color, backgroundColor: C.card2 }, pressed && styles.pressed]}
                  >
                    <Text style={styles.typeEmoji}>{info[item].emoji}</Text>
                    <Text style={[styles.typeText, on && { color: info[item].color }]}>{item}</Text>
                    <Text style={styles.tagline}>{info[item].tagline}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput value={duration} onChangeText={setDuration} placeholder="e.g. 45" placeholderTextColor={C.dim} keyboardType="number-pad" maxLength={4} style={styles.input} />
            <View style={styles.chipRowLeft}>
              {QUICK_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setDuration(String(m))}
                  accessibilityRole="button"
                  accessibilityLabel={`Set duration to ${m} minutes`}
                  style={({ pressed }) => [styles.quick, duration === String(m) && styles.quickOn, pressed && styles.pressed]}
                >
                  <Text style={[styles.quickText, duration === String(m) && styles.quickTextOn]}>{m} min</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput value={date} onChangeText={setDate} placeholder="2026-10-27" placeholderTextColor={C.dim} maxLength={10} style={styles.input} />
            <View style={styles.chipRowLeft}>
              <Pressable onPress={() => setDate(today())} accessibilityRole="button" style={({ pressed }) => [styles.quick, date === todayKey && styles.quickOn, pressed && styles.pressed]}>
                <Text style={[styles.quickText, date === todayKey && styles.quickTextOn]}>Today</Text>
              </Pressable>
              <Pressable onPress={() => setDate(shiftDay(today(), -1))} accessibilityRole="button" style={({ pressed }) => [styles.quick, date === shiftDay(todayKey, -1) && styles.quickOn, pressed && styles.pressed]}>
                <Text style={[styles.quickText, date === shiftDay(todayKey, -1) && styles.quickTextOn]}>Yesterday</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Leg day. Stairs are my enemy." placeholderTextColor={C.dim} multiline maxLength={300} style={[styles.input, styles.notes]} />

            <Text style={styles.preview}>
              {previewValid ? `This log pays +${previewXP} XP and +${previewCoins} AWzm${boostRemaining > 0 ? " (NPC 2× active)" : ""}.` : "Enter your minutes to see the payout."}
            </Text>
            <Hard color={C.pink} radius={14} style={{ marginTop: 14 }}>
              <Pressable onPress={logActivity} disabled={saving} accessibilityRole="button" style={({ pressed }) => [styles.logButton, saving && styles.disabledButton, pressed && styles.pressed]}>
                <Text style={styles.logText}>{saving ? "SAVING..." : "LOG THE W"}</Text>
              </Pressable>
            </Hard>
            <Text style={styles.mutedSmall}>Earn 10 XP per 10 minutes. Earn 1 AWzm Coin per 10 minutes (minimum 1 coin per log). Self-reported, so the only person you're fooling is you.</Text>
          </View>
        </Hard>

        {boostRemaining > 0 && (
          <View style={styles.boostBanner}>
            <Text style={styles.boostTitle}>🥤 NPC ENERGY ACTIVE · 2× XP</Text>
            <Text style={styles.mutedSmall}>{boostRemaining} minute(s) remaining. Log a workout before the buff expires.</Text>
          </View>
        )}

        {/* compact AWzm Market entry */}
        <Pressable
          onPress={() => setMarketOpen(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.card,
            styles.marketCard,
            styles.gap,
            {
              borderColor: C.pink,
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 20,
            },
            pressed && styles.pressed,
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.section, { color: C.pink }]}>
              Snoop Around the AWzm Market 📈
            </Text>
            <Text style={styles.mutedSmall}>
              Power-ups, questionable assets and premium nonsense.
            </Text>
            <Text style={[styles.rewardCost, { marginTop: 10 }]}>
              OPEN MARKET →
            </Text>
          </View>

          <Text style={{ fontSize: 32 }}>🛒</Text>
        </Pressable>

        {/* compact showcase */}
        <View style={[styles.card, styles.gap]}>
          <Text style={styles.section}>Your Showcase 🏆</Text>
          <Text style={styles.mutedSmall}>
            Your collection, minus the museum-sized scroll. Tap an item to inspect it.
          </Text>

          {ownedCollectibles.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
            >
              {ownedCollectibles.map((reward) => (
                <Pressable
                  key={reward.id}
                  onPress={() => setSelectedItem(reward)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${reward.title}`}
                  style={({ pressed }) => [
                    styles.showcaseBadge,
                    {
                      width: 66,
                      height: 66,
                      justifyContent: "center",
                      padding: 6,
                      borderColor: showcase.includes(reward.id)
                        ? C.green
                        : C.purple,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.showcaseEmoji}>{reward.icon}</Text>
                  {showcase.includes(reward.id) && (
                    <View
                      style={{
                        position: "absolute",
                        right: 3,
                        top: 3,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: C.green,
                      }}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Pressable
              onPress={() => setMarketOpen(true)}
              style={({ pressed }) => [
                styles.showcasePreview,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.mutedSmall}>
                No collectibles yet. Visit the AWzm Market to unlock your first item →
              </Text>
            </Pressable>
          )}
        </View>

        {/* lore */}
        <View style={styles.loreSection}>
          <Text style={styles.sectionHistory}>Your lore 📜</Text>
          <Text style={styles.muted}>Your journey so far. Tap to inspect your stats.</Text>
          <View style={styles.loreCards}>
            {ACTIVITY_TYPES.map((activityType) => {
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
                  style={({ pressed }) => [styles.loreCard, { borderColor: info[activityType].color }, pressed && styles.pressed]}
                >
                  <Text style={[styles.loreCardTitle, { color: info[activityType].color }]}>
                    {info[activityType].emoji} {activityType}
                  </Text>
                  <Text style={styles.loreCardTime}>{hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`}</Text>
                  <Text style={styles.loreCardSessions}>{sessions.length} sessions</Text>
                  <Text style={[styles.loreCardAction, { color: info[activityType].color }]}>View stats →</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.footer}>NO CAP. JUST CONSISTENCY. 🫡</Text>
      </ScrollView>

      {/* lore modal */}
      <Modal visible={selectedLore !== null} transparent animationType="fade" onRequestClose={() => setSelectedLore(null)}>
        <View style={styles.backdrop}>
          <View style={styles.loreModalCard}>
            {selectedLore &&
              (() => {
                const sessions = activities.filter((a) => a.type === selectedLore);
                const loreMinutes = sessions.reduce((sum, a) => sum + a.duration, 0);
                const loreDays = new Set(sessions.map((a) => a.date)).size;
                return (
                  <>
                    <Text style={[styles.loreModalTitle, { color: info[selectedLore].color }]}>{selectedLore.toUpperCase()} LORE 📜</Text>
                    <Text style={styles.loreTotalTime}>
                      {Math.floor(loreMinutes / 60)}h {loreMinutes % 60}m
                    </Text>
                    <Text style={styles.loreMuted}>Total time spent</Text>
                    <View style={styles.loreStats}>
                      <View style={styles.loreStat}>
                        <Text style={styles.loreStatValue}>{sessions.length}</Text>
                        <Text style={styles.loreMuted}>Sessions</Text>
                      </View>
                      <View style={styles.loreStat}>
                        <Text style={styles.loreStatValue}>{loreDays}</Text>
                        <Text style={styles.loreMuted}>Active days</Text>
                      </View>
                    </View>
                    <Text style={styles.loreHistoryTitle}>Session history</Text>
                    <ScrollView style={styles.loreHistory}>
                      {sessions.map((activity) => (
                        <View key={activity.id} style={styles.loreSession}>
                          <View style={styles.loreSessionDetails}>
                            <Text style={styles.loreSessionText}>
                              {activity.date} · {activity.duration} min
                            </Text>
                            {!!activity.notes && <Text style={styles.loreMuted}>{activity.notes}</Text>}
                          </View>
                          <Pressable onPress={() => deleteActivity(activity.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Delete ${selectedLore} session from ${activity.date}`}>
                            <Text style={styles.delete}>✕</Text>
                          </Pressable>
                        </View>
                      ))}
                      {sessions.length === 0 && <Text style={styles.loreMuted}>No sessions yet. Your lore starts now.</Text>}
                    </ScrollView>
                    <Pressable onPress={() => setSelectedLore(null)} accessibilityRole="button" style={({ pressed }) => [styles.loreCloseButton, pressed && styles.pressed]}>
                      <Text style={styles.loreCloseText}>CLOSE</Text>
                    </Pressable>
                  </>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* full AWzm Market screen */}
      <Modal
        visible={marketOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMarketOpen(false)}
      >
        <View style={styles.safe}>
          <StatusBar barStyle="light-content" />

          <View
            style={{
              paddingHorizontal: 18,
              paddingTop: TOP_PAD,
              paddingBottom: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>STREAK FREAK ⚡</Text>
              <Text style={[styles.heading, { color: C.pink }]}>AWZM MARKET</Text>
              <Text style={styles.muted}>
                Balance: {coins} AWzm Coins 🪙
              </Text>
            </View>

            <Pressable
              onPress={() => setMarketOpen(false)}
              accessibilityRole="button"
              style={styles.buyButton}
            >
              <Text style={styles.buyText}>CLOSE ✕</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.mutedSmall}>
              Limited utility. Unlimited delusion. Tap an item to inspect it.
            </Text>

            {rewards.map((reward) => {
              const count = inventory[reward.id] || 0;
              const owned =
                reward.kind === "collectible"
                  ? purchased.includes(reward.id)
                  : count > 0;

              return (
                <View key={reward.id} style={styles.reward}>
                  <Pressable
                    onPress={() => {
                      if (reward.kind === "collectible" && owned) {
                        setSelectedItem(reward);
                      } else {
                        showNotice(reward.title, reward.description);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${reward.title}`}
                    style={({ pressed }) => [
                      styles.itemIcon,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.itemIconText}>{reward.icon}</Text>
                  </Pressable>

                  <View style={styles.rewardTextWrap}>
                    <Text style={styles.rewardTitle}>
                      {reward.title}
                      {owned && reward.kind === "collectible" ? " ✓" : ""}
                    </Text>

                    <Text style={styles.rewardDescription}>
                      {reward.description}
                    </Text>

                    <Text style={styles.rewardCost}>
                      {reward.kind === "consumable"
                        ? `${count} owned · ${reward.cost} AWzm Coins`
                        : owned
                          ? "OWNED · COLLECTED"
                          : `${reward.cost} AWzm Coins`}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => buyReward(reward)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.buyButton,
                      owned &&
                        reward.kind === "collectible" &&
                        styles.ownedButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.buyText,
                        owned &&
                          reward.kind === "collectible" && { color: C.text },
                      ]}
                    >
                      {owned
                        ? reward.kind === "collectible"
                          ? "VIEW"
                          : "BUY +"
                        : "BUY"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={styles.section}>Your Inventory 🎒</Text>
              <Text style={styles.mutedSmall}>
                Use consumables here. Collectibles live in your showcase.
              </Text>

              {rewards
                .filter((reward) => reward.kind === "consumable")
                .map((reward) => {
                  const count = inventory[reward.id] || 0;

                  return (
                    <View key={reward.id} style={styles.inventoryRow}>
                      <Text style={styles.inventoryIcon}>{reward.icon}</Text>

                      <View style={styles.rewardTextWrap}>
                        <Text style={styles.rewardTitle}>
                          {reward.title} × {count}
                        </Text>
                        <Text style={styles.rewardDescription}>
                          {reward.description}
                        </Text>
                      </View>

                      <Pressable
                        disabled={count < 1}
                        onPress={() => requestItemUse(reward)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.buyButton,
                          count < 1 && styles.disabledButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.buyText}>
                          {reward.id === "npc" ? "DRINK" : "USE"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* collectible modal */}
      <Modal visible={selectedItem !== null} transparent animationType="fade" onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.backdrop}>
          <View style={styles.certificateCard}>
            {selectedItem && (
              <>
                {selectedItem.id === "grass" ? (
                  <>
                    <Text style={styles.certificateEyebrow}>THE TOTALLY UNOFFICIAL ACADEMY OF TOUCHING GRASS</Text>
                    <Text style={styles.certificatePlant}>🌿</Text>
                    <Text style={styles.certificateTitle}>CERTIFICATE</Text>
                    <Text style={styles.certificateSubtitle}>OF OUTSIDE-ENJOYMENT</Text>
                    <View style={styles.certificateRule} />
                    <Text style={styles.certificateBody}>This certifies that the holder has achieved the legendary status of</Text>
                    <Text style={styles.certificateAward}>CERTIFIED GRASS TOUCHER</Text>
                    <Text style={styles.certificateBody}>For bravery beyond the loading screen and contact with the natural world.</Text>
                    <Text style={styles.certificateDate}>AWARDED {todayKey}</Text>
                    <Text style={styles.certificateSeal}>✓ CERTIFIED NONSENSE ✓</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.certificatePlant}>{selectedItem.icon}</Text>
                    <Text style={styles.certificateTitle}>{selectedItem.title.toUpperCase()}</Text>
                    <Text style={styles.certificateBody}>{selectedItem.meme}</Text>
                    <Text style={styles.certificateDate}>UNLOCKED IN STREAK FREAK</Text>
                  </>
                )}
                <Pressable onPress={() => setSelectedItem(null)} accessibilityRole="button" style={({ pressed }) => [styles.loreCloseButton, pressed && styles.pressed]}>
                  <Text style={styles.loreCloseText}>CLOSE COLLECTION</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* main menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>MENU ☰</Text>
              <Pressable
                onPress={() => setMenuOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close menu"
              >
                <Text style={styles.menuClose}>✕</Text>
              </Pressable>
            </View>

            {[
              { icon: "👤", label: "Login" },
              { icon: "⚙️", label: "Settings" },
              { icon: "🪪", label: "Account" },
              { icon: "🥷", label: "Profile" },
            ].map(({ icon, label }) => (
              <Pressable
                key={label}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setMenuOpen(false);
                  setTimeout(() => {
                    showNotice(
                      `${label} 🔒`,
                      "This feature hasn't been unlocked yet. The dev is still cooking."
                    );
                  }, 250);
                }}
              >
                <Text style={styles.menuItemText}>
                  {icon}  {label}
                </Text>
                <Text style={styles.menuPlaceholder}>SOON™</Text>
              </Pressable>
            ))}

            <View style={styles.menuDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.galleryButton,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setMenuOpen(false);
                setGalleryCategory("all");
                setMemeGalleryOpen(true);
              }}
            >
              <Text style={styles.galleryButtonText}>
                🕵️ THE FORBIDDEN MEME VAULT
              </Text>
              <Text style={styles.galleryHint}>
                Every meme. Every reaction. No explanation.
              </Text>
            </Pressable>

            <Text style={styles.menuFooter}>
              STREAK FREAK · DEFINITELY A REAL APP
            </Text>
          </View>
        </View>
      </Modal>

      {/* registered meme gallery */}
      <Modal
        visible={memeGalleryOpen}
        animationType="slide"
        onRequestClose={() => setMemeGalleryOpen(false)}
      >
        <View style={styles.galleryScreen}>
          <StatusBar barStyle="light-content" />
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>THE MEME VAULT 🗃️</Text>
            <Pressable
              onPress={() => setMemeGalleryOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close meme vault"
            >
              <Text style={styles.menuClose}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.mutedSmall}>
            Internal assets exposed to the public. Absolutely intentional.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryFilters}
          >
            {["all", ...galleryCategories].map((category) => (
              <Pressable
                key={category}
                onPress={() => setGalleryCategory(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: galleryCategory === category }}
                style={[
                  styles.galleryFilter,
                  galleryCategory === category && styles.galleryFilterOn,
                ]}
              >
                <Text
                  style={[
                    styles.galleryFilterText,
                    galleryCategory === category &&
                      styles.galleryFilterTextOn,
                  ]}
                >
                  {category === "all" ? "ALL" : category.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.galleryGrid}
            showsVerticalScrollIndicator={false}
          >
            {galleryMemes.map((meme) => (
              <View key={meme.id} style={styles.galleryTile}>
                {meme.type === "image" || meme.type === "gif" ? (
                  <Image
                    source={meme.source}
                    style={styles.galleryImage}
                    resizeMode="cover"
                    accessibilityLabel={meme.filename}
                  />
                ) : (
                  <View style={styles.galleryMediaFallback}>
                    <Text style={styles.galleryMediaIcon}>
                      {meme.type === "video" ? "🎬" : "🔊"}
                    </Text>
                    <Text style={styles.galleryMediaType}>
                      {meme.type.toUpperCase()} ASSET
                    </Text>
                  </View>
                )}
                <Text style={styles.galleryCategory}>
                  {meme.category.toUpperCase()}
                </Text>
                <Text style={styles.galleryFilename} numberOfLines={2}>
                  {meme.filename}
                </Text>
              </View>
            ))}
            {galleryMemes.length === 0 && (
              <Text style={styles.mutedSmall}>
                No registered memes in this category yet.
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* consumable use confirmation */}
      <Modal
        visible={pendingItemUse !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingItemUse(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.purchaseConfirmCard}>
            <Text style={styles.purchaseConfirmTitle}>
              {pendingItemUse?.id === "npc"
                ? "DRINK NPC ENERGY? 🥤"
                : "USE STREAK INSURANCE? 🛟"}
            </Text>

            <Text style={styles.purchaseConfirmItem}>
              {pendingItemUse?.icon} {pendingItemUse?.title}
            </Text>

            <Text style={styles.rewardDescription}>
              {pendingItemUse?.description}
            </Text>

            {itemUseMeme && (
              <Image
                source={itemUseMeme.source}
                style={styles.purchaseConfirmMeme}
                resizeMode="contain"
              />
            )}

            <Pressable
              style={styles.purchaseConfirmBuy}
              onPress={confirmItemUse}
            >
              <Text style={styles.purchaseConfirmBuyText}>
                {pendingItemUse?.id === "npc" ? "DRINK" : "USE ITEM"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.purchaseConfirmCancel}
              onPress={() => setPendingItemUse(null)}
            >
              <Text style={styles.purchaseConfirmCancelText}>
                CANCEL
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* market purchase confirmation */}
      <Modal
        visible={pendingPurchase !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPurchase(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.purchaseConfirmCard}>
            <Text style={styles.purchaseConfirmTitle}>
              ARE YOU SURE? 📉
            </Text>

            <Text style={styles.purchaseConfirmItem}>
              {pendingPurchase?.icon} {pendingPurchase?.title}
            </Text>

            <Text style={styles.purchaseConfirmCost}>
              {pendingPurchase?.cost} AWzm Coins
            </Text>

            {purchaseMeme && (
              <Image
                source={purchaseMeme.source}
                style={styles.purchaseConfirmMeme}
                resizeMode="contain"
              />
            )}

            <Text style={styles.purchaseConfirmDisclaimer}>
              No refunds. No utility. No roadmap.
            </Text>

            <Pressable
              style={styles.purchaseConfirmBuy}
              onPress={() => {
                const reward = pendingPurchase;
                if (!reward) return;

                setPendingPurchase(null);
                void completePurchase(reward);
              }}
            >
              <Text style={styles.purchaseConfirmBuyText}>
                TAKE MY MONEY 💸
              </Text>
            </Pressable>

            <Pressable
              style={styles.purchaseConfirmCancel}
              onPress={() => setPendingPurchase(null)}
            >
              <Text style={styles.purchaseConfirmCancelText}>
                CANCEL
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ThemedDialog
        visible={dialog !== null}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        buttons={dialog?.buttons ?? []}
        onClose={() => setDialog(null)}
      />

      {__DEV__ && (
        <Modal
          visible={devPanelOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDevPanelOpen(false)}
        >
          <View style={styles.backdrop}>
            <View style={[styles.card, { width: "90%", maxWidth: 420 }]}>
              <Text style={styles.section}>🛠️ DEVELOPER MODE</Text>
              <Text style={styles.mutedSmall}>
                Testing controls — development builds only.
              </Text>

              <Text style={styles.label}>Override displayed streak</Text>
              <TextInput
                value={devStreakInput}
                onChangeText={setDevStreakInput}
                keyboardType="number-pad"
                placeholder="Enter streak"
                placeholderTextColor={C.dim}
                style={styles.input}
              />

              <Pressable
                onPress={setTestStreak}
                style={styles.devButton}
              >
                <Text style={styles.logText}>SET TEST STREAK</Text>
              </Pressable>

              <Pressable
                onPress={resetTestStreak}
                style={styles.devButton}
              >
                <Text style={styles.logText}>USE REAL STREAK</Text>
              </Pressable>

              <Pressable
                onPress={clearLore}
                style={[styles.devButton, { borderColor: C.red }]}
              >
                <Text style={[styles.logText, { color: C.red }]}>
                  CLEAR ALL LORE & SAVE DATA
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setDevPanelOpen(false)}
                style={styles.devButton}
              >
                <Text style={styles.logText}>CLOSE</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      <CelebrationModal data={celebration} onClose={closeCelebration} />
    </View>
  );
}

/* ───────────────────────── styles ───────────────────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  container: { paddingHorizontal: 18, paddingTop: TOP_PAD, paddingBottom: 64 },
  gap: { marginTop: 16 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  disabledButton: { opacity: 0.35 },
  hamburgerButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    marginBottom: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.card2,
    borderColor: C.pink,
    borderWidth: 1,
    borderRadius: 10,
  },
  hamburgerIcon: {
    color: C.pink,
    fontSize: 24,
    fontWeight: "900",
  },
  menuCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    backgroundColor: C.card,
    borderColor: C.pink,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  menuTitle: {
    color: C.pink,
    fontSize: 22,
    fontWeight: "900",
  },
  menuClose: {
    color: C.text,
    fontSize: 24,
    fontWeight: "900",
    paddingHorizontal: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card2,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  menuItemText: {
    color: C.text,
    fontSize: 15,
    fontWeight: "800",
  },
  menuPlaceholder: {
    color: C.dim,
    fontSize: 10,
    fontWeight: "900",
  },
  menuDivider: {
    height: 1,
    backgroundColor: C.line,
    marginVertical: 16,
  },
  galleryButton: {
    backgroundColor: "#301329",
    borderColor: C.pink,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 15,
  },
  galleryButtonText: {
    color: C.pink,
    fontWeight: "900",
    fontSize: 14,
  },
  galleryHint: {
    color: C.sub,
    fontSize: 11,
    marginTop: 7,
  },
  menuFooter: {
    color: C.dim,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 18,
    letterSpacing: 1,
  },
  galleryScreen: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: TOP_PAD,
    paddingHorizontal: 18,
  },
  galleryFilters: {
    gap: 8,
    paddingVertical: 14,
  },
  galleryFilter: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: C.card,
  },
  galleryFilterOn: {
    borderColor: C.pink,
    backgroundColor: "#301329",
  },
  galleryFilterText: {
    color: C.sub,
    fontSize: 11,
    fontWeight: "900",
  },
  galleryFilterTextOn: {
    color: C.pink,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    paddingBottom: 28,
  },
  galleryTile: {
    width: "48%",
    backgroundColor: C.card,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    overflow: "hidden",
  },
  galleryImage: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    backgroundColor: C.card2,
  },
  galleryMediaFallback: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: C.card2,
  },
  galleryMediaIcon: {
    fontSize: 36,
  },
  galleryMediaType: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 6,
  },
  galleryCategory: {
    color: C.pink,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 8,
  },
  galleryFilename: {
    color: C.text,
    fontSize: 11,
    marginTop: 4,
  },
  devButton: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    alignItems: "center",
    backgroundColor: C.card2,
  },

  loadingEmoji: { fontSize: 54 },
  loadingText: { color: C.green, fontSize: 20, fontWeight: "900", marginTop: 12 },

  banner: { backgroundColor: C.card2, borderColor: C.purple, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minHeight: 38, justifyContent: "center" },
  bannerText: { color: C.yellow, fontSize: 12, fontWeight: "800", textAlign: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  brand: { color: C.green, fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  heading: { color: C.text, fontSize: 40, fontWeight: "900", marginTop: 4 },
  muted: { color: C.sub, fontSize: 14, marginTop: 5 },
  mutedSmall: { color: C.sub, fontSize: 12, marginTop: 10, lineHeight: 17 },
  sticker: { backgroundColor: C.yellow, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, transform: [{ rotate: "6deg" }] },
  stickerText: { color: C.ink, fontSize: 11, fontWeight: "900", textAlign: "center", letterSpacing: 1 },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 18, borderWidth: 2, borderColor: C.line },
  marketCard: {
    borderColor: C.pink,
    borderWidth: 1.5,
    backgroundColor: "#201426",
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  eyebrow: { color: C.sub, fontSize: 12, fontWeight: "800" },
  section: { color: C.text, fontSize: 17, fontWeight: "900" },

  streakCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  flame: { fontSize: 70 },
  streakNum: { color: C.text, fontSize: 52, fontWeight: "900", lineHeight: 58 },
  streakUnit: { color: C.pink, fontSize: 20, fontWeight: "900" },
  streakLine: { color: C.green, fontSize: 13, fontWeight: "800", marginTop: 4, lineHeight: 18 },

  levelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelTitle: { color: C.text, fontSize: 24, fontWeight: "900" },
  rank: { color: C.purple, fontSize: 13, fontWeight: "900", marginTop: 3 },
  xpNumber: { color: C.green, fontSize: 18, fontWeight: "900", marginLeft: 10 },
  track: { height: 12, borderRadius: 12, backgroundColor: "#2A2A40", overflow: "hidden", marginTop: 14 },
  fill: { height: "100%", backgroundColor: C.green, borderRadius: 12 },

  coinCard: { backgroundColor: "#1B1A12", borderColor: "#7A6A1E" },
  coinHeader: { flexDirection: "row", alignItems: "center" },
  coinTitle: { color: C.yellow, fontSize: 22, fontWeight: "900" },
  coinBalance: { color: C.text, fontSize: 36, fontWeight: "900", marginLeft: 12 },
  chartRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 44, marginTop: 14 },
  chartBar: { flex: 1, borderRadius: 3 },
  coinTicker: { color: C.green, fontSize: 12, fontWeight: "900", marginTop: 10 },
  coinHint: { color: "#D8D2B0", fontSize: 12, marginTop: 8, lineHeight: 18 },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: C.line },
  statEmoji: { fontSize: 20 },
  statValue: { color: C.text, fontSize: 24, fontWeight: "900", marginTop: 4 },
  statLabel: { color: C.sub, fontSize: 11, fontWeight: "700", marginTop: 2 },

  goalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  goalText: { color: "#DDD", fontSize: 13 },
  goalValue: { color: C.green, fontWeight: "900" },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  questTile: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    backgroundColor: C.card2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  questIcon: {
    fontSize: 25,
  },
  questName: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
  },
  questTrack: {
    height: 4,
    width: "100%",
    backgroundColor: C.line,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 9,
  },
  questFill: {
    height: "100%",
    borderRadius: 4,
  },
  questMinutes: {
    color: C.sub,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },

  label: { color: "#E4E4F0", fontSize: 14, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeButton: { flex: 1, minWidth: 0, minHeight: 92, alignItems: "center", justifyContent: "center", backgroundColor: "#22223A", borderWidth: 2, borderColor: C.line, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 4 },
  typeEmoji: { fontSize: 24 },
  typeText: { color: "#DDD", fontWeight: "900", marginTop: 5, fontSize: 14 },
  tagline: { color: C.sub, fontSize: 11, marginTop: 4, textAlign: "center" },
  input: { color: C.text, backgroundColor: "#22223A", borderColor: C.line, borderWidth: 2, borderRadius: 11, padding: 13, fontSize: 16 },
  notes: { minHeight: 80, textAlignVertical: "top" },
  chipRowLeft: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quick: { borderWidth: 2, borderColor: C.line, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "#22223A" },
  quickOn: { borderColor: C.purple, backgroundColor: "#2B1F45" },
  quickText: { color: C.sub, fontSize: 13, fontWeight: "800" },
  quickTextOn: { color: C.text },
  preview: { color: C.yellow, fontSize: 13, fontWeight: "800", marginTop: 18 },
  logButton: { backgroundColor: C.green, paddingVertical: 17, alignItems: "center", borderRadius: 12 },
  logText: { color: C.ink, fontWeight: "900", letterSpacing: 1, fontSize: 16 },

  boostBanner: { backgroundColor: "#2B1F45", borderColor: C.purple, borderWidth: 2, borderRadius: 14, padding: 14, marginTop: 16 },
  boostTitle: { color: C.green, fontWeight: "900", fontSize: 14 },

  empty: { color: C.sub, paddingVertical: 12, fontSize: 13 },
  activity: { flexDirection: "row", alignItems: "center", backgroundColor: C.card2, borderRadius: 12, borderLeftWidth: 5, padding: 12, marginTop: 10 },
  historyEmoji: { fontSize: 26, marginRight: 12 },
  activityBody: { flex: 1 },
  activityTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
  activityMeta: { color: C.green, fontSize: 12, marginTop: 3 },
  note: { color: C.sub, fontSize: 12, marginTop: 4 },
  delete: { color: C.red, fontSize: 18, fontWeight: "900", padding: 6 },

  reward: { flexDirection: "row", alignItems: "center", backgroundColor: C.card2, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.line },
  itemIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#2B1F45", borderColor: C.purple, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemIconText: { fontSize: 26 },
  rewardTextWrap: { flex: 1, paddingRight: 8 },
  rewardTitle: { color: C.text, fontWeight: "900", fontSize: 14 },
  rewardDescription: { color: C.sub, fontSize: 12, marginTop: 4, lineHeight: 16 },
  rewardCost: { color: C.green, fontSize: 12, fontWeight: "900", marginTop: 7 },
  rewardCostBroke: { color: C.red },
  buyButton: { backgroundColor: C.green, borderRadius: 9, paddingVertical: 11, paddingHorizontal: 14, minWidth: 64, alignItems: "center" },
  ownedButton: { backgroundColor: "#46465F" },
  buyText: { color: C.ink, fontSize: 12, fontWeight: "900" },
  inventoryRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card2, borderRadius: 12, padding: 10, marginTop: 10, gap: 8, borderWidth: 1, borderColor: C.line },
  inventoryIcon: { fontSize: 27, width: 36, textAlign: "center" },

  showcasePreview: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.line },
  showcaseIcons: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  showcaseBadge: { backgroundColor: "#2B1F45", borderRadius: 12, borderWidth: 1, borderColor: C.purple, padding: 10, alignItems: "center", maxWidth: 115 },
  showcaseEmoji: { fontSize: 28 },
  showcaseLabel: { color: "#DDD", fontSize: 11, fontWeight: "800", textAlign: "center", marginTop: 5 },

  loreSection: { marginTop: 8, marginBottom: 12 },
  sectionHistory: { color: C.text, fontSize: 17, fontWeight: "900", marginTop: 26, marginBottom: 6 },
  loreCards: { flexDirection: "row", gap: 8, marginTop: 12 },
  loreCard: { flex: 1, minWidth: 0, backgroundColor: C.card, borderWidth: 2, borderRadius: 12, padding: 12 },
  loreCardTitle: { fontSize: 14, fontWeight: "900" },
  loreCardTime: { color: C.text, fontSize: 17, fontWeight: "900", marginTop: 8 },
  loreCardSessions: { color: C.sub, fontSize: 11, marginTop: 4 },
  loreCardAction: { fontSize: 11, fontWeight: "800", marginTop: 8 },

  footer: { color: C.dim, textAlign: "center", fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginTop: 25 },

  /* modals */
  dialogBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1B1B1B",
    borderColor: "#B7FF43",
    borderWidth: 1,
    borderRadius: 18,
    padding: 22,
  },
  dialogTitle: {
    color: "#B7FF43",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  dialogMessage: {
    color: "#E5E5E5",
    fontSize: 15,
    lineHeight: 23,
  },
  dialogButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 24,
  },
  dialogButton: {
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  dialogPrimary: {
    backgroundColor: "#B7FF43",
  },
  dialogSecondary: {
    backgroundColor: "#303030",
    borderWidth: 1,
    borderColor: "#484848",
  },
  dialogDanger: {
    backgroundColor: "#442020",
    borderWidth: 1,
    borderColor: "#FF5A5A",
  },
  dialogButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dialogPrimaryText: {
    color: "#111111",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5,5,10,0.88)",
    justifyContent: "center",
    padding: 18,
  },
  purchaseConfirmCard: {
    backgroundColor: C.card,
    borderColor: C.pink,
    borderWidth: 2,
    borderRadius: 22,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    alignItems: "center",
    shadowColor: C.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  purchaseConfirmTitle: {
    color: C.pink,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  purchaseConfirmItem: {
    color: C.text,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 14,
  },
  purchaseConfirmCost: {
    color: C.yellow,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 6,
  },
  purchaseConfirmMeme: {
    width: "100%",
    height: 220,
    marginTop: 16,
    borderRadius: 12,
  },
  purchaseConfirmDisclaimer: {
    color: C.sub,
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  purchaseConfirmBuy: {
    width: "100%",
    backgroundColor: C.pink,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  purchaseConfirmBuyText: {
    color: C.ink,
    fontSize: 15,
    fontWeight: "900",
  },
  purchaseConfirmCancel: {
    paddingVertical: 13,
    alignItems: "center",
  },
  purchaseConfirmCancelText: {
    color: C.sub,
    fontSize: 13,
    fontWeight: "800",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(5,5,10,0.88)", justifyContent: "center", padding: 18 },
  loreModalCard: { backgroundColor: C.card, borderColor: C.green, borderWidth: 2, borderRadius: 18, padding: 20, maxHeight: "82%" },
  loreModalTitle: { fontSize: 22, fontWeight: "900" },
  loreTotalTime: { color: C.text, fontSize: 30, fontWeight: "900", marginTop: 16 },
  loreMuted: { color: C.sub, marginTop: 4 },
  loreStats: { flexDirection: "row", marginTop: 18, marginBottom: 18 },
  loreStat: { flex: 1 },
  loreStatValue: { color: C.text, fontSize: 20, fontWeight: "800" },
  loreHistoryTitle: { color: C.green, fontWeight: "800", marginBottom: 10 },
  loreHistory: { flexGrow: 0, maxHeight: 250 },
  loreSession: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomColor: C.line, borderBottomWidth: 1 },
  loreSessionDetails: { flex: 1 },
  loreSessionText: { color: C.text, fontWeight: "700" },
  loreCloseButton: { backgroundColor: C.green, borderRadius: 10, padding: 14, alignItems: "center", marginTop: 18 },
  loreCloseText: { color: C.ink, fontWeight: "900" },

  celebCard: { backgroundColor: C.card, borderColor: C.pink, borderWidth: 2, borderRadius: 20, padding: 18, maxHeight: "92%" },
  celebScroll: { flexGrow: 0 },
  celebTitle: { color: C.green, fontSize: 22, fontWeight: "900", textAlign: "center", paddingHorizontal: 22, lineHeight: 28 },
  memeImage: { width: "100%", height: 260, marginTop: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14 },
  chip: { borderWidth: 2, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontSize: 13, fontWeight: "900" },
  levelUpBanner: { backgroundColor: "#2B1F45", borderColor: C.purple, borderWidth: 2, borderRadius: 12, padding: 12, marginTop: 14, alignItems: "center" },
  levelUpTitle: { color: C.yellow, fontSize: 20, fontWeight: "900" },
  levelUpRank: { color: C.purple, fontSize: 13, fontWeight: "900", marginTop: 3 },
  questDone: { color: C.yellow, fontSize: 14, fontWeight: "900", textAlign: "center", marginTop: 12 },
  quip: { color: C.sub, fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 12, lineHeight: 18 },
  skip: { position: "absolute", top: 10, right: 10, zIndex: 5, width: 34, height: 34, borderRadius: 17, backgroundColor: C.card2, alignItems: "center", justifyContent: "center" },
  skipText: { color: C.text, fontSize: 15, fontWeight: "900" },
  stickerW: { position: "absolute", top: -16, left: -8, zIndex: 6, backgroundColor: C.yellow, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: "-10deg" }] },
  stickerWText: { color: C.ink, fontSize: 24, fontWeight: "900" },

  certificateCard: { backgroundColor: "#F5F0D8", borderColor: C.green, borderWidth: 5, borderRadius: 8, padding: 20, alignItems: "center" },
  certificateEyebrow: { color: "#3D5124", fontSize: 10, fontWeight: "900", textAlign: "center", letterSpacing: 1 },
  certificatePlant: { fontSize: 42, marginTop: 12 },
  certificateTitle: { color: "#202719", fontSize: 26, fontWeight: "900", textAlign: "center", marginTop: 10 },
  certificateSubtitle: { color: "#52643C", fontSize: 12, fontWeight: "900", letterSpacing: 2, marginTop: 4 },
  certificateRule: { height: 2, backgroundColor: "#81945F", width: "80%", marginVertical: 16 },
  certificateBody: { color: "#3C4233", textAlign: "center", fontSize: 13, lineHeight: 19, marginTop: 8 },
  certificateAward: { color: "#30451B", fontSize: 19, fontWeight: "900", textAlign: "center", marginTop: 12 },
  certificateDate: { color: "#52643C", fontSize: 11, fontWeight: "900", marginTop: 18 },
  certificateSeal: { color: "#30451B", borderWidth: 2, borderColor: "#52643C", borderRadius: 40, overflow: "hidden", padding: 8, fontSize: 11, fontWeight: "900", marginTop: 12 },
});
