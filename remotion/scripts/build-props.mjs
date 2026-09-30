import fs from "node:fs";
import path from "node:path";

const {
  PRODUCT_TITLE,
  PRODUCT_PRICE,
  PRODUCT_IMAGE_URL, // lama: 1 foto (masih didukung)
  PRODUCT_IMAGE_URLS, // baru: banyak foto, dipisah koma/spasi/baris baru, atau JSON array
  SCRIPT_TEXT, // lama: naskah utuh, otomatis dipecah per kalimat jadi scene
  SCENES_JSON, // baru: JSON array scene [{ photo, text, role }]
  BGM_URL, // opsional: URL file musik latar (MP3, royalty-free)
} = process.env;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, attempts = 3, waitMs = 1000) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      console.warn(`Percobaan ${i}/${attempts} gagal untuk ${url}: ${err.message}`);
      if (i < attempts) await sleep(waitMs);
    }
  }
  throw new Error(`Gagal download ${url}: ${lastError?.message}`);
}

function parseImageUrls() {
  const raw = (PRODUCT_IMAGE_URLS || "").trim();
  let urls = [];
  if (raw.startsWith("[")) {
    try {
      urls = JSON.parse(raw);
    } catch {
      throw new Error("PRODUCT_IMAGE_URLS diawali '[' tapi bukan JSON array yang valid.");
    }
  } else if (raw) {
    urls = raw.split(/[\s,]+/);
  }
  if (urls.length === 0 && PRODUCT_IMAGE_URL) urls = [PRODUCT_IMAGE_URL];
  return urls.map((u) => String(u).trim()).filter(Boolean);
}

function extFromContentType(contentType) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

function splitSentences(text) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Kalimat yang terlalu pendek (< 3 kata) digabung ke kalimat sebelumnya
  const merged = [];
  for (const sentence of sentences) {
    if (merged.length > 0 && sentence.split(/\s+/).length < 3) {
      merged[merged.length - 1] += ` ${sentence}`;
    } else {
      merged.push(sentence);
    }
  }
  return merged;
}

function guessRole(text, index, total) {
  if (index === 0) return "hook";
  if (index === total - 1 && /keranjang|klik|checkout|beli|order/i.test(text)) return "cta";
  return "benefit";
}

function buildScenes(photoCount) {
  if (SCENES_JSON && SCENES_JSON.trim()) {
    let parsed;
    try {
      parsed = JSON.parse(SCENES_JSON);
    } catch {
      throw new Error("SCENES_JSON bukan JSON yang valid.");
    }
    const list = Array.isArray(parsed) ? parsed : parsed?.scenes;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("SCENES_JSON harus berupa array scene yang tidak kosong.");
    }
    return list.map((scene, i) => {
      const text = String(scene?.text ?? "").trim();
      if (!text) throw new Error(`Scene ke-${i + 1} tidak punya field 'text'.`);
      // 'photo' dihitung mulai dari 1; kalau tidak ada, dipakai berurutan
      const photoNumber = Number.isInteger(scene.photo) ? scene.photo : i + 1;
      const photoIndex = (((photoNumber - 1) % photoCount) + photoCount) % photoCount;
      return {
        text,
        role: String(scene.role ?? guessRole(text, i, list.length)),
        photoIndex,
      };
    });
  }

  if (!SCRIPT_TEXT || !SCRIPT_TEXT.trim()) {
    throw new Error("Isi salah satu: SCENES_JSON atau SCRIPT_TEXT.");
  }
  const sentences = splitSentences(SCRIPT_TEXT);
  return sentences.map((text, i) => ({
    text,
    role: guessRole(text, i, sentences.length),
    photoIndex: i % photoCount,
  }));
}

if (!PRODUCT_TITLE || !PRODUCT_PRICE) {
  console.error("ERROR: env PRODUCT_TITLE / PRODUCT_PRICE belum lengkap.");
  process.exit(1);
}

const imageUrls = parseImageUrls();
if (imageUrls.length === 0) {
  console.error("ERROR: isi PRODUCT_IMAGE_URLS (banyak foto) atau PRODUCT_IMAGE_URL (1 foto).");
  process.exit(1);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

// Download semua foto produk ke public/ supaya bisa dipakai Remotion (staticFile)
const photoPaths = [];
for (const [i, url] of imageUrls.entries()) {
  const res = await fetchWithRetry(url);
  const ext = extFromContentType(res.headers.get("content-type"));
  const fileName = `photo-${i}.${ext}`;
  fs.writeFileSync(path.join(publicDir, fileName), Buffer.from(await res.arrayBuffer()));
  photoPaths.push(fileName);
  console.log(`Foto ${i + 1}/${imageUrls.length} tersimpan: ${fileName}`);
}

const scenes = buildScenes(photoPaths.length).map((scene, i) => ({
  ...scene,
  audioPath: `vo-${i}.mp3`,
}));

// BGM opsional. Kalau BGM_URL kosong, video tetap jalan tanpa musik latar.
let bgmPath;
if (BGM_URL && BGM_URL.trim()) {
  const bgmSource = BGM_URL.trim();
  bgmPath = "bgm.mp3";
  if (/^https?:\/\//i.test(bgmSource)) {
    const res = await fetchWithRetry(bgmSource);
    fs.writeFileSync(path.join(publicDir, bgmPath), Buffer.from(await res.arrayBuffer()));
  } else {
    // Bukan URL http(s) -> dianggap path lokal (berguna untuk testing sebelum di-push)
    const localPath = path.resolve(process.cwd(), bgmSource);
    if (!fs.existsSync(localPath)) {
      throw new Error(`File BGM lokal tidak ditemukan: ${localPath}`);
    }
    fs.copyFileSync(localPath, path.join(publicDir, bgmPath));
  }
  console.log(`Musik latar tersimpan: ${bgmPath}`);
}

// Durasi tiap scene dihitung otomatis di Root.tsx dari panjang audio voiceover-nya.
const props = {
  productTitle: PRODUCT_TITLE,
  productPrice: PRODUCT_PRICE,
  photoPaths,
  scenes,
  ...(bgmPath ? { bgmPath } : {}),
};

fs.writeFileSync(path.join(process.cwd(), "props.json"), JSON.stringify(props, null, 2));
console.log(`props.json berhasil dibuat: ${scenes.length} scene, ${photoPaths.length} foto.`);
