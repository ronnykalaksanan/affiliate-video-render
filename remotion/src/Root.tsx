import React from "react";
import { Composition, staticFile } from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { AffiliateVideo, affiliateVideoSchema } from "./AffiliateVideo";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AffiliateVideo"
      component={AffiliateVideo}
      // Nilai default ini di-override oleh calculateMetadata di bawah,
      // berdasarkan durasi file audio hasil TTS.
      durationInFrames={FPS * 15}
      fps={FPS}
      width={1080}
      height={1920}
      schema={affiliateVideoSchema}
      defaultProps={{
        productTitle: "Nama Produk",
        productPrice: "Rp 99.000",
        imagePath: "product.jpg",
        audioPath: "voiceover.mp3",
        captionChunks: ["Contoh naskah produk di sini."],
      }}
      calculateMetadata={async ({ props }) => {
        const audioDurationInSeconds = await getAudioDurationInSeconds(
          staticFile(props.audioPath)
        );

        // Tambah buffer 1 detik di akhir supaya video tidak terpotong pas.
        const durationInFrames = Math.max(
          Math.round((audioDurationInSeconds + 1) * FPS),
          FPS * 3
        );

        return { durationInFrames, fps: FPS };
      }}
    />
  );
};
