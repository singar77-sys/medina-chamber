"use client";

import { useEffect, useState } from "react";

const FOUNDED = 1938;
const EMOJIS  = ["🎂", "🎉", "🎈", "🥳", "🎊", "✨", "🎁"];
const COUNT   = 32;

function isBirthday() {
  const d = new Date();
  return d.getMonth() === 3 && d.getDate() === 30; // April = month 3
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function BirthdayConfetti() {
  const [active, setActive] = useState(false);
  const [age, setAge]       = useState(0);

  useEffect(() => {
    if (!isBirthday()) return;
    setActive(true);
    setAge(new Date().getFullYear() - FOUNDED);

    const style = document.createElement("style");
    style.id = "bd-keyframes";
    style.textContent = `
      @keyframes bd-fall {
        0%   { transform: translateY(-90px) rotate(0deg);   opacity: 0; }
        6%   { opacity: 1; }
        90%  { opacity: 0.85; }
        100% { transform: translateY(110vh) rotate(600deg); opacity: 0; }
      }
    `;
    if (!document.getElementById("bd-keyframes")) {
      document.head.appendChild(style);
    }

    // Auto-dismiss after 7s — long enough to read the toast, short enough
    // to stop being a distraction on the rest of the page.
    const dismiss = window.setTimeout(() => setActive(false), 7000);

    return () => {
      window.clearTimeout(dismiss);
      document.getElementById("bd-keyframes")?.remove();
    };
  }, []);

  if (!active) return null;

  return (
    <div aria-hidden="true">
      {/* Falling emoji particles */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9000, overflow: "hidden" }}>
        {Array.from({ length: COUNT }, (_, i) => ({
          emoji:    EMOJIS[i % EMOJIS.length],
          left:     `${((i * 31.7 + Math.sin(i * 2.1) * 12) % 96 + 2).toFixed(1)}%`,
          delay:    `${((i * 0.19) % 5.5).toFixed(2)}s`,
          duration: `${(4.5 + (i % 5) * 0.6).toFixed(1)}s`,
          size:     `${(1.1 + (i % 4) * 0.35).toFixed(2)}rem`,
        })).map((p, i) => (
          <span key={i} style={{
            position:  "absolute",
            top:       0,
            left:      p.left,
            fontSize:  p.size,
            lineHeight: 1,
            animation: `bd-fall ${p.duration} ${p.delay} infinite linear`,
            userSelect: "none",
          }}>
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Toast banner */}
      <div style={{
        position:       "fixed",
        bottom:         28,
        left:           "50%",
        transform:      "translateX(-50%)",
        zIndex:         9001,
        background:     "rgba(12,27,51,0.92)",
        border:         "1px solid rgba(131,188,169,0.45)",
        borderRadius:   12,
        padding:        "10px 22px",
        color:          "#fff",
        fontSize:       14,
        fontWeight:     700,
        letterSpacing:  "0.05em",
        whiteSpace:     "nowrap",
        pointerEvents:  "none",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}>
        🎂 Happy {ordinal(age)} Birthday, Medina Chamber! · Est. April 30, 1938
      </div>
    </div>
  );
}
