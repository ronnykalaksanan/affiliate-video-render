import fs from "node:fs";
import path from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const scriptText = process.env.SCRIPT_TEXT;
const voice = process.env.TTS_VOICE || "id-ID-ArdiNeural";

if (!scriptText) {
  console.error("ERROR: env SCRIPT_TEXT kosong, tidak bisa generate voiceover.");
  process.exit(1);
}

const publicDir = path.join(process.cwd(), "public");
fs.mkdirSync(publicDir, { recursive: true });

const tts = new MsEdgeTTS();
await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

// toFile menerima path FOLDER, lalu mengembalikan path file yang dia buat sendiri
const { audioFilePath } = await tts.toFile(publicDir, scriptText);

// Rename hasilnya jadi voiceover.mp3 biar konsisten dipakai Root.tsx
const finalPath = path.join(publicDir, "voiceover.mp3");
fs.renameSync(audioFilePath, finalPath);

console.log(`Voiceover tersimpan di: ${finalPath}`);