import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
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
          gap: 24,
          borderRadius: 36,
        }}
      >
        <div style={{ width: 24, height: 108, background: "#6b7a3f", borderRadius: 6 }} />
        <div style={{ width: 24, height: 108, background: "#faf7f2", borderRadius: 6 }} />
        <div style={{ width: 24, height: 108, background: "#c65d3a", borderRadius: 6 }} />
      </div>
    ),
    { ...size },
  );
}
