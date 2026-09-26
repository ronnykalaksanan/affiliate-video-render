# Affiliate Video Render (GitHub Actions + Remotion)

Render 1 video affiliate produk per trigger dari n8n, tanpa perlu VPS.

## Setup awal (sekali saja)

1. Push folder ini ke repo GitHub baru (privat atau publik, terserah kamu).
2. Buat bot Telegram lewat @BotFather kalau belum ada, catat token-nya.
3. Di repo GitHub: **Settings > Secrets and variables > Actions**, tambahkan:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Di lokal (bukan di CI), masuk folder `remotion/` lalu jalankan:
   ```
   npm install
   ```
   Ini akan membuat `package-lock.json` — commit file itu ke repo, karena workflow
   pakai `npm ci` yang butuh lockfile.
5. (Opsional tapi disarankan) coba render manual dulu di lokal sebelum andalkan CI:
   ```
   PRODUCT_TITLE="Contoh Produk" \
   PRODUCT_PRICE="Rp 99.000" \
   PRODUCT_IMAGE_URL="https://.../gambar.jpg" \
   SCRIPT_TEXT="Ini contoh naskah produk. Cocok buat kamu yang suka X." \
   npm run build-props && npm run generate-voiceover && npx remotion render src/index.ts AffiliateVideo out/video.mp4 --props=props.json
   ```

## Cara trigger dari n8n

Panggil workflow ini dari node **HTTP Request** di n8n, method POST, ke:

```
https://api.github.com/repos/<username>/<repo>/dispatches
```

Header:
- `Authorization: Bearer <GitHub Personal Access Token>` (scope: `repo`)
- `Accept: application/vnd.github+json`

Body (JSON):
```json
{
  "event_type": "render_video",
  "client_payload": {
    "product_title": "{{ $json.title }}",
    "product_price": "{{ $json.price }}",
    "product_image_url": "{{ $json.image_url }}",
    "script_text": "{{ $json.script }}"
  }
}
```

Video hasil render otomatis dikirim ke Telegram lewat bot yang kamu daftarkan di secrets.

## Catatan

- Kuota gratis GitHub Actions untuk repo privat: 2.000 menit/bulan, tanpa kartu kredit.
  Repo publik: gratis tanpa batas menit.
- Package `msedge-tts` memakai layanan Text-to-Speech Microsoft Edge secara tidak resmi.
  Kalau API-nya berubah/error, cek dokumentasi terbaru package tersebut di npm.
- Kalau kamu ingin ganti resolusi/orientasi video, ubah `width`/`height` di `remotion/src/Root.tsx`.
