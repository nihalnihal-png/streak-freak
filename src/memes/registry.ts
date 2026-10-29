// AUTO-GENERATED. Do not edit manually.
// Add files under assets/memes/<category>/ and regenerate.

export type MemeMediaType = "image" | "gif" | "video" | "audio";

export type MemeMedia = {
  id: string;
  category: string;
  filename: string;
  type: MemeMediaType;
  source: number;
};

export const memeRegistry: MemeMedia[] = [
  {
    id: "daily-goal/dally questbyoda.jpg",
    category: "daily-goal",
    filename: "dally questbyoda.jpg",
    type: "image",
    source: require("../../assets/memes/daily-goal/dally questbyoda.jpg"),
  },
  {
    id: "energy-drink-confirm/pianistchenle-man-shaking-drinking-nervous.gif",
    category: "energy-drink-confirm",
    filename: "pianistchenle-man-shaking-drinking-nervous.gif",
    type: "gif",
    source: require("../../assets/memes/energy-drink-confirm/pianistchenle-man-shaking-drinking-nervous.gif"),
  },
  {
    id: "gym/gym-win.jpg",
    category: "gym",
    filename: "gym-win.jpg",
    type: "image",
    source: require("../../assets/memes/gym/gym-win.jpg"),
  },
  {
    id: "market-confirm/trade offer.jpg",
    category: "market-confirm",
    filename: "trade offer.jpg",
    type: "image",
    source: require("../../assets/memes/market-confirm/trade offer.jpg"),
  },
  {
    id: "run/npc-energy.jpg",
    category: "run",
    filename: "npc-energy.jpg",
    type: "image",
    source: require("../../assets/memes/run/npc-energy.jpg"),
  },
  {
    id: "streak-insurance-confirm/skynews-drew-scanlon-blinking-white-guy_4786055.jpg",
    category: "streak-insurance-confirm",
    filename: "skynews-drew-scanlon-blinking-white-guy_4786055.jpg",
    type: "image",
    source: require("../../assets/memes/streak-insurance-confirm/skynews-drew-scanlon-blinking-white-guy_4786055.jpg"),
  },
  {
    id: "walk/touch-grass.png",
    category: "walk",
    filename: "touch-grass.png",
    type: "image",
    source: require("../../assets/memes/walk/touch-grass.png"),
  },
];

export function getMemesForCategory(category: string): MemeMedia[] {
  return memeRegistry.filter((item) => item.category === category);
}

export function getMemesByCategory(): Record<string, MemeMedia[]> {
  return memeRegistry.reduce<Record<string, MemeMedia[]>>((groups, meme) => {
    (groups[meme.category] ??= []).push(meme);
    return groups;
  }, {});
}

export function getRandomMeme(category: string): MemeMedia | null {
  const items = getMemesForCategory(category);
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}
