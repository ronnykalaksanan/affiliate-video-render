import fs from "node:fs";
import path from "node:path";

const { PRODUCT_TITLE, PRODUCT_PRICE, PRODUCT_IMAGE_URL, SCRIPT_TEXT } = process.env;

if (!PRODUCT_TITLE || !PRODUCT_PRICE || !PRODUCT_IMAGE_URL || !SCRIPT_TEXT) {
  console.error(
    "ERROR: env PRODUCT_TITLE / PRODUCT_PRICE / PRODUCT_IMAGE_URL / SCRIPT_TEXT belum lengkap."
  );
  process.exit(1);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

// Download gambar produk ke folder public/ supaya bisa dipakai Remotion (staticFile)
const imageRes = await fetch(PRODUCT_IMAGE_URL);
if (!imageRes.ok) {
  throw new Error(`Gagal download gambar produk: HTTP ${imageRes.status}`);
}
const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
fs.writeFileSync(path.join(publicDir, "product.jpg"), imageBuffer);

// Pecah naskah jadi beberapa chunk caption, kasar per kalimat.
// Silakan sesuaikan logikanya kalau butuh sinkronisasi yang lebih presisi.
const captionChunks = SCRIPT_TEXT.split(/(?<=[.!?])\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

const props = {
  productTitle: PRODUCT_TITLE,
  productPrice: PRODUCT_PRICE,
  imagePath: "product.jpg",
  audioPath: "voiceover.mp3",
  captionChunks: captionChunks.length > 0 ? captionChunks : [SCRIPT_TEXT],
};

fs.writeFileSync(path.join(process.cwd(), "props.json"), JSON.stringify(props, null, 2));
console.log("props.json berhasil dibuat.");
