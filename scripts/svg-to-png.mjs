import { readdirSync, statSync } from "fs";
import { join, basename } from "path";
import sharp from "sharp";

const root = join(process.cwd(), "public/characters");

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...walk(p));
    else if (name.endsWith(".svg")) files.push(p);
  }
  return files;
}

for (const svgPath of walk(root)) {
  const pngPath = svgPath.replace(/\.svg$/, ".png");
  const isAvatar = basename(svgPath) === "avatar.svg";
  const width = isAvatar ? 400 : 600;
  const height = isAvatar ? 400 : 800;

  await sharp(svgPath, { density: 144 })
    .resize(width, height)
    .png({ quality: 90 })
    .toFile(pngPath);

  console.log("converted", pngPath.replace(root + "/", ""));
}
