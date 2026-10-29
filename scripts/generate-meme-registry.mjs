import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const memesRoot = path.join(root, "assets", "memes");
const output = path.join(root, "src", "memes", "registry.ts");

const types = {
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".gif": "gif",
  ".mp4": "video",
  ".mp3": "audio",
  ".m4a": "audio",
  ".wav": "audio",
};

const quote = (value) => JSON.stringify(value);
const posix = (value) => value.split(path.sep).join("/");

if (!fs.existsSync(memesRoot)) {
  console.error(`Meme folder not found: ${memesRoot}`);
  process.exit(1);
}

const entries = fs.readdirSync(memesRoot, { withFileTypes: true });
const directories = entries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const rootFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const categories = [...new Set([
  ...directories,
  ...(rootFiles.length > 0 ? ["general"] : []),
])].sort();

const media = [];

for (const category of categories) {
  const folder = path.join(memesRoot, category);
  const files = [
    ...(fs.existsSync(folder)
      ? fs.readdirSync(folder, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          filename: entry.name,
          filePath: path.join(folder, entry.name),
        }))
      : []),
    ...(category === "general"
      ? rootFiles.map((filename) => ({
        filename,
        filePath: path.join(memesRoot, filename),
      }))
      : []),
  ]
    .filter(({ filename }) => Object.hasOwn(types, path.extname(filename).toLowerCase()))
    .sort((a, b) => a.filename.localeCompare(b.filename));

  for (const { filename, filePath } of files) {
    const relativePath = posix(path.relative(path.dirname(output), filePath));
    const extension = path.extname(filename).toLowerCase();

    media.push({
      id: `${category}/${filename}`,
      category,
      filename,
      type: types[extension],
      requirePath: relativePath,
    });
  }
}

const lines = [
  "// AUTO-GENERATED. Do not edit manually.",
  "// Add files under assets/memes/<category>/ and regenerate.",
  "",
  'export type MemeMediaType = "image" | "gif" | "video" | "audio";',
  "",
  "export type MemeMedia = {",
  "  id: string;",
  "  category: string;",
  "  filename: string;",
  "  type: MemeMediaType;",
  "  source: number;",
  "};",
  "",
  "export const memeRegistry: MemeMedia[] = [",
];

for (const item of media) {
  lines.push(
    "  {",
    `    id: ${quote(item.id)},`,
    `    category: ${quote(item.category)},`,
    `    filename: ${quote(item.filename)},`,
    `    type: ${quote(item.type)},`,
    `    source: require(${quote(item.requirePath)}),`,
    "  },",
  );
}

lines.push(
  "];",
  "",
  "export function getMemesForCategory(category: string): MemeMedia[] {",
  "  return memeRegistry.filter((item) => item.category === category);",
  "}",
  "",
  "export function getRandomMeme(category: string): MemeMedia | null {",
  "  const items = getMemesForCategory(category);",
  "  if (items.length === 0) return null;",
  "  return items[Math.floor(Math.random() * items.length)] ?? null;",
  "}",
  "",
);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, lines.join("\n"), "utf8");

console.log(`Generated ${path.relative(root, output)}`);
console.log(`Found ${media.length} media file(s) across ${categories.length} categories.`);

if (media.length === 0) {
  console.log("No supported media found yet. Add some files and run this script again.");
}
