import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Suara Bahasa Indonesia bawaan Edge TTS. Ganti via env TTS_VOICE kalau mau coba suara lain.
const voice = process.env.TTS_VOICE || "id-ID-ArdiNeural";

const propsPath = path.join(process.cwd(), "props.json");
if (!fs.existsSync(propsPath)) {
  console.error("ERROR: props.json belum ada. Jalankan `npm run build-props` dulu.");
  process.exit(1);
}

const { scenes } = JSON.parse(fs.readFileSync(propsPath, "utf8"));
if (!Array.isArray(scenes) || scenes.length === 0) {
  console.error("ERROR: props.json tidak berisi scenes.");
  process.exit(1);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

// Satu file audio per scene, supaya durasi tiap scene pas dengan yang diucapkan.
for (const [i, scene] of scenes.entries()) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tts-"));
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // toFile menerima path FOLDER, lalu mengembalikan path file yang dia buat sendiri
    const { audioFilePath } = await tts.toFile(tmpDir, scene.text);

    const target = path.join(publicDir, scene.audioPath);
    fs.copyFileSync(audioFilePath, target);
    console.log(`Voiceover scene ${i + 1}/${scenes.length} tersimpan: ${scene.audioPath}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Pastikan proses berhenti walau ada koneksi TTS yang masih menggantung.
process.exit(0);

// CATATAN: API package `msedge-tts` bisa berubah antar versi.
// Kalau method di atas error setelah `npm install`, cek dokumentasi
// terbaru packagenya dan sesuaikan pemanggilannya di sini.
