import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Italia 2027 — A few friends, one trip.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 56,
        }}
      >
        <div style={{ display: "flex", gap: 28 }}>
          <div style={{ width: 60, height: 280, background: "#6b7a3f", borderRadius: 14 }} />
          <div style={{ width: 60, height: 280, background: "#faf7f2", borderRadius: 14 }} />
          <div style={{ width: 60, height: 280, background: "#c65d3a", borderRadius: 14 }} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              color: "#faf7f2",
              fontSize: 96,
              fontWeight: 600,
              letterSpacing: -2,
            }}
          >
            Italia 2027
          </div>
          <div style={{ color: "#faf7f2", opacity: 0.65, fontSize: 36 }}>
            A few friends, one trip.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
