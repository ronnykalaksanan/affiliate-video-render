import fs from "node:fs";
import path from "node:path";

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, PRODUCT_TITLE } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error(
    "ERROR: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set sebagai GitHub Secret."
  );
  process.exit(1);
}

const videoPath = path.join(process.cwd(), "out", "video.mp4");

if (!fs.existsSync(videoPath)) {
  throw new Error(`File video tidak ditemukan di: ${videoPath}`);
}

const form = new FormData();
form.append("chat_id", TELEGRAM_CHAT_ID);
form.append("caption", `Video baru siap: ${PRODUCT_TITLE || "-"}`);
form.append("video", new Blob([fs.readFileSync(videoPath)]), "video.mp4");

const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`, {
  method: "POST",
  body: form,
});

const result = await res.json();

if (!result.ok) {
  throw new Error(`Gagal kirim video ke Telegram: ${JSON.stringify(result)}`);
}

console.log("Video berhasil dikirim ke Telegram.");
