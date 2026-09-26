import React from "react";
import { z } from "zod";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const affiliateVideoSchema = z.object({
  productTitle: z.string(),
  productPrice: z.string(),
  imagePath: z.string(),
  audioPath: z.string(),
  captionChunks: z.array(z.string()),
});

type Props = z.infer<typeof affiliateVideoSchema>;

export const AffiliateVideo: React.FC<Props> = ({
  productTitle,
  productPrice,
  imagePath,
  audioPath,
  captionChunks,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Ken Burns: zoom perlahan dari 1x ke 1.15x sepanjang durasi video.
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.15], {
    extrapolateRight: "clamp",
  });

  const chunks = captionChunks.length > 0 ? captionChunks : [productTitle];
  const chunkDuration = Math.max(1, Math.floor(durationInFrames / chunks.length));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img
          src={staticFile(imagePath)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Gradient overlay biar teks tetap terbaca di atas foto produk */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Judul & harga produk di atas */}
      <AbsoluteFill
        style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 80 }}
      >
        <div
          style={{
            color: "white",
            fontSize: 52,
            fontWeight: 700,
            textAlign: "center",
            maxWidth: "85%",
            fontFamily: "sans-serif",
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          {productTitle}
        </div>
        <div
          style={{
            color: "#FFD54A",
            fontSize: 44,
            fontWeight: 700,
            marginTop: 16,
            fontFamily: "sans-serif",
          }}
        >
          {productPrice}
        </div>
      </AbsoluteFill>

      {/* Caption bergilir, dibagi rata sepanjang durasi audio */}
      {chunks.map((text, i) => (
        <Sequence key={i} from={i * chunkDuration} durationInFrames={chunkDuration}>
          <AbsoluteFill
            style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}
          >
            <div
              style={{
                color: "white",
                fontSize: 40,
                fontWeight: 600,
                textAlign: "center",
                maxWidth: "80%",
                fontFamily: "sans-serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {text}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}

      <Audio src={staticFile(audioPath)} />
    </AbsoluteFill>
  );
};
