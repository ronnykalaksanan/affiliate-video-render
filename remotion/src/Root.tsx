import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { AffiliateVideo, affiliateVideoSchema } from "./AffiliateVideo";

const FPS = 30;
// Jeda kecil setelah tiap kalimat selesai diucapkan sebelum pindah scene
const SCENE_PADDING_SECONDS = 0.35;
const MIN_SCENE_FRAMES = Math.round(FPS * 1.5);
// Scene terakhir ditahan sedikit lebih lama supaya video tidak terpotong mendadak
const END_HOLD_FRAMES = Math.round(FPS * 0.8);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AffiliateVideo"
      component={AffiliateVideo}
      // Nilai default ini di-override oleh calculateMetadata di bawah.
      durationInFrames={FPS * 15}
      fps={FPS}
      width={1080}
      height={1920}
      schema={affiliateVideoSchema}
      defaultProps={{
        productTitle: "Nama Produk",
        productPrice: "Rp 99.000",
        photoPaths: ["photo-0.jpg"],
        scenes: [
          { text: "Kulit kering pas mandi?", role: "hook", photoIndex: 0, audioPath: "vo-0.mp3" },
          { text: "Coba yang satu ini.", role: "benefit", photoIndex: 0, audioPath: "vo-1.mp3" },
          { text: "Klik keranjang kuning di kiri bawah!", role: "cta", photoIndex: 0, audioPath: "vo-2.mp3" },
        ],
        // bgmPath opsional; kosongkan/hapus field ini kalau tidak pakai musik latar
      }}
      calculateMetadata={async ({ props }) => {
        const scenes = await Promise.all(
          props.scenes.map(async (scene, i) => {
            const seconds = await getAudioDurationInSeconds(staticFile(scene.audioPath));
            const base = Math.max(
              Math.round((seconds + SCENE_PADDING_SECONDS) * FPS),
              MIN_SCENE_FRAMES
            );
            const isLast = i === props.scenes.length - 1;
            return { ...scene, durationInFrames: base + (isLast ? END_HOLD_FRAMES : 0) };
          })
        );

        const total = scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);

        return {
          durationInFrames: Math.max(total, FPS * 3),
          fps: FPS,
          props: { ...props, scenes },
        };
      }}
    />
  );
};
