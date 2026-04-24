import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Greater Medina Chamber of Commerce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const root = join(process.cwd(), "public");

  const [bergenBold, bergenRegular, logoBytes, stampBytes] = await Promise.all([
    readFile(join(root, "fonts/BNBergen-Bold.otf")),
    readFile(join(root, "fonts/BNBergen.otf")),
    readFile(join(root, "images/chamber-logos/logo-horizontal-white.png")),
    readFile(join(root, "images/chamber-logos/stamp-white.png")),
  ]);

  const logo  = `data:image/png;base64,${logoBytes.toString("base64")}`;
  const stamp = `data:image/png;base64,${stampBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0C1B33",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ghosted stamp — right side, large background texture */}
        <img
          src={stamp}
          style={{
            position: "absolute",
            right: -50,
            top: 75,
            width: 480,
            height: 480,
            opacity: 0.07,
          }}
        />

        {/* Coquelicot left edge accent */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 6,
            height: "100%",
            background: "#FF4000",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 88px",
            gap: 0,
          }}
        >
          <img
            src={logo}
            style={{ width: 300, marginBottom: 36 }}
          />

          <div
            style={{
              color: "#F4EFE6",
              fontSize: 50,
              fontWeight: 700,
              fontFamily: "BN Bergen",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: 18,
              display: "flex",
            }}
          >
            Greater Medina Chamber of Commerce
          </div>

          <div
            style={{
              color: "#83BCA9",
              fontSize: 22,
              fontFamily: "BN Bergen",
              fontWeight: 400,
              display: "flex",
            }}
          >
            Connecting Medina County business since 1938
          </div>

          {/* Coquelicot rule */}
          <div
            style={{
              marginTop: 36,
              width: 64,
              height: 4,
              background: "#FF4000",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "BN Bergen", data: bergenBold,   weight: 700, style: "normal" },
        { name: "BN Bergen", data: bergenRegular, weight: 400, style: "normal" },
      ],
    }
  );
}
