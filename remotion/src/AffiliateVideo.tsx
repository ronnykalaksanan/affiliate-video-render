import React from "react";
import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const sceneSchema = z.object({
  text: z.string(),
  role: z.string(),
  photoIndex: z.number(),
  audioPath: z.string(),
  // Diisi otomatis oleh calculateMetadata di Root.tsx dari panjang audio
  durationInFrames: z.number().optional(),
});

export const affiliateVideoSchema = z.object({
  productTitle: z.string(),
  productPrice: z.string(),
  photoPaths: z.array(z.string()),
  scenes: z.array(sceneSchema),
  bgmPath: z.string().optional(),
});

// Volume musik latar diredam di bawah voiceover, lalu fade-out di detik terakhir.
const BGM_VOLUME = 0.12;
const BGM_FADE_OUT_FRAMES = 45;

const BackgroundMusic: React.FC<{ bgmPath: string }> = ({ bgmPath }) => {
  const { durationInFrames, fps } = useVideoConfig();

  return (
    <Audio
      src={staticFile(bgmPath)}
      loop
      volume={(frame) =>
        interpolate(
          frame,
          [durationInFrames - BGM_FADE_OUT_FRAMES, durationInFrames],
          [BGM_VOLUME, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        )
      }
    />
  );
};

type Props = z.infer<typeof affiliateVideoSchema>;

// Lama crossfade antar scene (frame). Scene sebelumnya "bertahan" selama durasi ini
// sementara scene berikutnya fade-in di atasnya.
const TRANSITION_FRAMES = 8;

// Area aman TikTok: bagian atas (~150px) dan bawah (~330px) tertutup UI aplikasi,
// jadi judul dan caption diberi jarak dari tepi.
const TITLE_TOP = 150;
const CAPTION_BOTTOM = 330;

const SceneVisual: React.FC<{
  photo: string;
  index: number;
  duration: number;
  isFirst: boolean;
}> = ({ photo, index, duration, isFirst }) => {
  const frame = useCurrentFrame();

  // Fade-in + geser dari samping (arah selang-seling) saat scene mulai
  const enter = isFirst
    ? 1
    : interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  const slide = isFirst
    ? 0
    : interpolate(frame, [0, TRANSITION_FRAMES], [index % 2 === 0 ? -70 : 70, 0], {
        extrapolateRight: "clamp",
      });

  // Gerakan kamera bervariasi per scene: zoom in, pan kiri, zoom out, pan kanan
  const progress = interpolate(frame, [0, duration], [0, 1], { extrapolateRight: "clamp" });
  const mode = index % 4;
  let scale = 1;
  let translatePercent = 0;
  if (mode === 0) {
    scale = 1 + 0.1 * progress;
  } else if (mode === 1) {
    scale = 1.08;
    translatePercent = 2 - 4 * progress;
  } else if (mode === 2) {
    scale = 1.1 - 0.1 * progress;
  } else {
    scale = 1.08;
    translatePercent = -2 + 4 * progress;
  }

  return (
    <AbsoluteFill style={{ opacity: enter, backgroundColor: "#000" }}>
      {/* Latar: foto yang sama, diperbesar dan diburamkan supaya tidak ada bar hitam */}
      <Img
        src={staticFile(photo)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(28px) brightness(0.5)",
          transform: "scale(1.25)",
        }}
      />
      {/* Foto produk utuh (tidak ter-crop) di tengah layar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 330,
          height: 1100,
          transform: `translateX(calc(${translatePercent}% + ${slide}px)) scale(${scale})`,
        }}
      >
        <Img
          src={staticFile(photo)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
      {/* Gradient tipis supaya judul dan caption tetap terbaca */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const Header: React.FC<{ title: string; price: string }> = ({ title, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 160 } });

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: TITLE_TOP }}
    >
      <div
        style={{
          color: "white",
          fontSize: 54,
          fontWeight: 800,
          textAlign: "center",
          maxWidth: "88%",
          lineHeight: 1.15,
          fontFamily: "sans-serif",
          textShadow: "0 3px 12px rgba(0,0,0,0.75)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 18,
          padding: "10px 30px",
          borderRadius: 999,
          backgroundColor: "#FFD54A",
          color: "#111",
          fontSize: 46,
          fontWeight: 800,
          fontFamily: "sans-serif",
          transform: `scale(${Math.max(0, pop)})`,
        }}
      >
        {price}
      </div>
    </AbsoluteFill>
  );
};

// Caption per kata: kata yang sedang diucapkan menyala kuning.
// Sinkronisasi diperkirakan dari panjang kata (bukan timestamp asli dari TTS),
// jadi bisa meleset sedikit, tapi cukup dekat untuk video pendek.
const Caption: React.FC<{ text: string; duration: number }> = ({ text, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((word) => word.length + 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const speakFrames = Math.max(1, duration - Math.round(0.3 * fps));
  const t = Math.min(1, frame / speakFrames);

  let cumulative = 0;
  let active = words.length - 1;
  for (let k = 0; k < words.length; k++) {
    cumulative += weights[k] / totalWeight;
    if (t <= cumulative) {
      active = k;
      break;
    }
  }

  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });

  return (
    <AbsoluteFill
      style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: CAPTION_BOTTOM }}
    >
      <div
        style={{
          transform: `translateY(${(1 - pop) * 30}px)`,
          opacity: Math.min(1, pop),
          maxWidth: "88%",
          textAlign: "center",
          padding: "18px 28px",
          borderRadius: 28,
          backgroundColor: "rgba(0,0,0,0.38)",
          fontFamily: "sans-serif",
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.3,
          textShadow: "0 3px 10px rgba(0,0,0,0.85)",
        }}
      >
        {words.map((word, k) => (
          <span
            key={k}
            style={{
              display: "inline-block",
              margin: "0 8px",
              color: k === active ? "#FFD54A" : "#FFFFFF",
              transform: k === active ? "scale(1.12)" : "scale(1)",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Panah bergerak yang menunjuk ke area keranjang kuning (kiri bawah) di scene CTA.
const CtaArrow: React.FC = () => {
  const frame = useCurrentFrame();
  const bounce = Math.sin(frame / 4) * 14;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 50, bottom: 170 + bounce }}>
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path
            d="M12 21l-8-9h5V3h6v9h5z"
            fill="#FFD54A"
            stroke="#000"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const AffiliateVideo: React.FC<Props> = ({
  productTitle,
  productPrice,
  photoPaths,
  scenes,
  bgmPath,
}) => {
  // Susun garis waktu: tiap scene mulai persis saat scene sebelumnya selesai
  let cursor = 0;
  const timeline = scenes.map((scene, i) => {
    const duration = scene.durationInFrames ?? 90;
    const start = cursor;
    cursor += duration;
    return { scene, i, start, duration };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {/* Lapisan 0: musik latar, muter sepanjang video, redup di bawah voiceover */}
      {bgmPath ? <BackgroundMusic bgmPath={bgmPath} /> : null}

      {/* Lapisan 1: visual tiap scene (crossfade) */}
      {timeline.map(({ scene, i, start, duration }) => {
        const isLast = i === timeline.length - 1;
        const photo = photoPaths[scene.photoIndex % photoPaths.length];
        return (
          <Sequence
            key={`visual-${i}`}
            from={start}
            durationInFrames={duration + (isLast ? 0 : TRANSITION_FRAMES)}
          >
            <SceneVisual photo={photo} index={i} duration={duration} isFirst={i === 0} />
          </Sequence>
        );
      })}

      {/* Lapisan 2: judul + harga, tampil sepanjang video */}
      <Header title={productTitle} price={productPrice} />

      {/* Lapisan 3: caption, panah CTA, dan voiceover per scene */}
      {timeline.map(({ scene, i, start, duration }) => (
        <Sequence key={`text-${i}`} from={start} durationInFrames={duration}>
          <Caption text={scene.text} duration={duration} />
          {scene.role === "cta" ? <CtaArrow /> : null}
          <Audio src={staticFile(scene.audioPath)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
