import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const scriptText = process.env.SCRIPT_TEXT;
// Suara Bahasa Indonesia bawaan Edge TTS. Ganti via env TTS_VOICE kalau mau coba suara lain.
const voice = process.env.TTS_VOICE || "id-ID-ArdiNeural";

if (!scriptText) {
  console.error("ERROR: env SCRIPT_TEXT kosong, tidak bisa generate voiceover.");
  process.exit(1);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

const outputPath = path.join(publicDir, "voiceover.mp3");
const { audioFilePath } = await tts.toFile(outputPath, scriptText);

console.log(`Voiceover tersimpan di: ${audioFilePath}`);

// CATATAN: API package `msedge-tts` bisa berubah antar versi.
// Kalau method di atas error setelah `npm install`, cek dokumentasi
// terbaru packagenya dan sesuaikan pemanggilannya di sini.
