/**
 * Copy images from project root images/ and Frontendimages/ to frontend/public/images/
 * Run from frontend dir: node scripts/copy-images.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const sourceDir = path.join(projectRoot, "images");
const targetDir = path.join(__dirname, "..", "public", "images");
const frontendImagesDir = fs.existsSync(path.join(projectRoot, "Frontendimages"))
  ? path.join(projectRoot, "Frontendimages")
  : path.join(projectRoot, "frontendimages");
const heroTargetDir = path.join(targetDir, "hero");

// Copy images/ to public/images/
if (fs.existsSync(sourceDir)) {
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  let count = 0;
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const src = path.join(sourceDir, ent.name);
    const dest = path.join(targetDir, ent.name);
    try {
      fs.copyFileSync(src, dest);
      count++;
    } catch (e) {
      console.warn("Skip", ent.name, e.message);
    }
  }
  console.log("Copied", count, "file(s) from images/ to public/images/");
} else {
  console.warn("Source images folder not found:", sourceDir);
}

// Copy Frontendimages/ to public/images/hero/ as hero-1.jpeg, hero-2.jpeg, ...
if (fs.existsSync(frontendImagesDir)) {
  if (!fs.existsSync(heroTargetDir)) fs.mkdirSync(heroTargetDir, { recursive: true });
  const entries = fs.readdirSync(frontendImagesDir, { withFileTypes: true });
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const files = entries
    .filter((e) => e.isFile() && imageExts.some((ext) => e.name.toLowerCase().endsWith(ext)))
    .sort((a, b) => a.name.localeCompare(b.name));
  let heroCount = 0;
  files.forEach((ent, i) => {
    let ext = path.extname(ent.name).toLowerCase();
    if (ext === ".jpg") ext = ".jpeg";
    const destName = `hero-${i + 1}${ext}`;
    const src = path.join(frontendImagesDir, ent.name);
    const dest = path.join(heroTargetDir, destName);
    try {
      fs.copyFileSync(src, dest);
      heroCount++;
    } catch (e) {
      console.warn("Skip hero", ent.name, e.message);
    }
  });
  console.log("Copied", heroCount, "hero image(s) from Frontendimages/ to public/images/hero/");
}
