import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          gap: 20,
        }}
      >
        <div style={{ width: 22, height: 102, background: "#6b7a3f", borderRadius: 6 }} />
        <div style={{ width: 22, height: 102, background: "#faf7f2", borderRadius: 6 }} />
        <div style={{ width: 22, height: 102, background: "#c65d3a", borderRadius: 6 }} />
      </div>
    ),
    { ...size },
  );
}
