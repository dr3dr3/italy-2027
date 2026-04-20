import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
        }}
      >
        <div style={{ width: 48, height: 216, background: "#6b7a3f", borderRadius: 12 }} />
        <div style={{ width: 48, height: 216, background: "#faf7f2", borderRadius: 12 }} />
        <div style={{ width: 48, height: 216, background: "#c65d3a", borderRadius: 12 }} />
      </div>
    ),
    { ...size },
  );
}
