# Affiliate Video Render (GitHub Actions + Remotion)

Render 1 video affiliate produk per trigger dari n8n, tanpa perlu VPS.
Video berbentuk multi-scene: tiap scene punya foto, kalimat voiceover, dan caption
per kata sendiri, dengan transisi antar scene dan panah CTA ke keranjang kiri bawah.

## Setup awal (sekali saja)

1. Push folder ini ke repo GitHub.
2. Buat bot Telegram lewat @BotFather, catat token dan chat_id.
3. Di repo GitHub: **Settings > Secrets and variables > Actions**, tambahkan:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
4. Di lokal, masuk folder `remotion/` lalu `npm install`, dan commit `package-lock.json`.

## Dua mode input

**Mode sederhana** (kompatibel dengan payload lama): kirim `product_image_url` (1 foto)
dan `script_text` (naskah utuh). Naskah otomatis dipecah per kalimat, tiap kalimat jadi
1 scene, dan semuanya memakai foto yang sama dengan gerakan kamera berbeda.

**Mode multi-scene**: kirim `product_image_urls` (beberapa URL, dipisah koma) dan
`scenes_json` (string JSON):

```json
[
  { "photo": 1, "text": "Kulit kering pas mandi? Coba ini.", "role": "hook" },
  { "photo": 2, "text": "Wanginya tahan sampai sore.", "role": "benefit" },
  { "photo": 3, "text": "Ukuran pouch-nya hemat banget.", "role": "benefit" },
  { "photo": 1, "text": "Klik keranjang kuning di kiri bawah!", "role": "cta" }
]
```

- `photo` dihitung mulai dari 1 (urutan di `product_image_urls`). Kalau dikosongkan, dipakai berurutan.
- `role`: `hook`, `benefit`, atau `cta`. Scene `cta` menampilkan panah animasi ke kiri bawah.
- Tiap `text` sebaiknya kalimat pendek (maks sekitar 10-12 kata).

## Musik latar (opsional)

Isi `BGM_URL` dengan direct-link file MP3 royalty-free (untuk dipakai lewat GitHub
Actions/n8n) ATAU path lokal relatif ke file di komputer kamu (berguna untuk testing
sebelum file di-push, misal `assets/bgm-source.mp3` kalau kamu taruh filenya di
`remotion/public/assets/`). Kalau dikosongkan, video tetap jalan normal tanpa musik latar.

Sumber musik gratis yang aman dipakai (bukan lagu berhak cipta, supaya video tidak
kena mute/takedown otomatis): **Pixabay Music**, **YouTube Audio Library**, atau
**Mixkit**. Pastikan link yang dipakai adalah link download file MP3 langsung, bukan
link halaman preview.

## Test manual di lokal (PowerShell, dari folder `remotion`)

```powershell
$env:PRODUCT_TITLE="Sabun Contoh"
$env:PRODUCT_PRICE="Rp 27.100"
$env:PRODUCT_IMAGE_URLS="https://picsum.photos/seed/a/800/800.jpg, https://picsum.photos/seed/b/800/800.jpg"
$env:SCRIPT_TEXT="Kulit kering pas mandi? Coba ini. Wanginya tahan sampai sore. Ukurannya hemat banget. Klik keranjang kuning di kiri bawah!"
$env:BGM_URL="public/assets/bgm-source.mp3"  # path lokal relatif ke folder remotion (tempat command ini dijalankan), atau hapus baris ini kalau tidak pakai
npm run build-props
npm run generate-voiceover
npx remotion render src/index.ts AffiliateVideo out/video.mp4 --props=props.json
```

## Cara trigger dari n8n

HTTP Request, method POST ke:

```
https://api.github.com/repos/<username>/<repo>/dispatches
```

Header: `Authorization: Bearer <token>` (lewat Credential Header Auth) dan
`Accept: application/vnd.github+json`.

Body mode multi-scene (`scenes_json` harus berupa STRING, jadi di-stringify dua kali di n8n):

```json
{
  "event_type": "render_video",
  "client_payload": {
    "product_title": "{{ $json.title }}",
    "product_price": "{{ $json.price }}",
    "product_image_urls": "{{ $json.image_urls }}",
    "scenes_json": {{ JSON.stringify(JSON.stringify($json.scenes)) }}
  }
}
```

## Catatan

- Kuota gratis GitHub Actions untuk repo privat: 2.000 menit/bulan. Repo publik: gratis tanpa batas menit.
- Latar foto diburamkan supaya foto persegi tidak ter-crop; efek blur membuat render sedikit lebih lama.
- Sinkronisasi caption per kata diperkirakan dari panjang kata, bukan timestamp asli dari TTS.
- Posisi judul dan caption sudah menghindari area UI TikTok (atas dan bawah). Ubah `TITLE_TOP` dan
  `CAPTION_BOTTOM` di `remotion/src/AffiliateVideo.tsx` kalau perlu.
- Package `msedge-tts` memakai layanan TTS Microsoft Edge secara tidak resmi; kalau API-nya berubah,
  cek dokumentasi terbaru di npm.
