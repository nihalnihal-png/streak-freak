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
    id: "gym/gym-win.jpg",
    category: "gym",
    filename: "gym-win.jpg",
    type: "image",
    source: require("../../assets/memes/gym/gym-win.jpg"),
  },
  {
    id: "gym/star-wars-the-7680x4320-26292.jpg",
    category: "gym",
    filename: "star-wars-the-7680x4320-26292.jpg",
    type: "image",
    source: require("../../assets/memes/gym/star-wars-the-7680x4320-26292.jpg"),
  },
  {
    id: "gym/star-wars-the-7680x4320-26569.jpg",
    category: "gym",
    filename: "star-wars-the-7680x4320-26569.jpg",
    type: "image",
    source: require("../../assets/memes/gym/star-wars-the-7680x4320-26569.jpg"),
  },
  {
    id: "gym/x-wing-starfighter-star-wars-battlefront-spacecraft-3840x2160-1157 (1).png",
    category: "gym",
    filename: "x-wing-starfighter-star-wars-battlefront-spacecraft-3840x2160-1157 (1).png",
    type: "image",
    source: require("../../assets/memes/gym/x-wing-starfighter-star-wars-battlefront-spacecraft-3840x2160-1157 (1).png"),
  },
  {
    id: "run/npc-energy.jpg",
    category: "run",
    filename: "npc-energy.jpg",
    type: "image",
    source: require("../../assets/memes/run/npc-energy.jpg"),
  },
  {
    id: "run/spider-cat-spider-7680x4320-11618.jpeg",
    category: "run",
    filename: "spider-cat-spider-7680x4320-11618.jpeg",
    type: "image",
    source: require("../../assets/memes/run/spider-cat-spider-7680x4320-11618.jpeg"),
  },
  {
    id: "walk/f1-cars-race-track-3840x2160-13489.jpg",
    category: "walk",
    filename: "f1-cars-race-track-3840x2160-13489.jpg",
    type: "image",
    source: require("../../assets/memes/walk/f1-cars-race-track-3840x2160-13489.jpg"),
  },
  {
    id: "walk/ferrari-sf-25-8k-7680x7680-21456.jpg",
    category: "walk",
    filename: "ferrari-sf-25-8k-7680x7680-21456.jpg",
    type: "image",
    source: require("../../assets/memes/walk/ferrari-sf-25-8k-7680x7680-21456.jpg"),
  },
  {
    id: "walk/mercedes-amg-f1-w15-5120x5500-19025.jpg",
    category: "walk",
    filename: "mercedes-amg-f1-w15-5120x5500-19025.jpg",
    type: "image",
    source: require("../../assets/memes/walk/mercedes-amg-f1-w15-5120x5500-19025.jpg"),
  },
  {
    id: "walk/touch-grass.png",
    category: "walk",
    filename: "touch-grass.png",
    type: "image",
    source: require("../../assets/memes/walk/touch-grass.png"),
  },
  {
    id: "walk/wp12983271-oscar-piastri-desktop-wallpapers.jpg",
    category: "walk",
    filename: "wp12983271-oscar-piastri-desktop-wallpapers.jpg",
    type: "image",
    source: require("../../assets/memes/walk/wp12983271-oscar-piastri-desktop-wallpapers.jpg"),
  },
];

export function getMemesForCategory(category: string): MemeMedia[] {
  return memeRegistry.filter((item) => item.category === category);
}

export function getRandomMeme(category: string): MemeMedia | null {
  const items = getMemesForCategory(category);
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}
