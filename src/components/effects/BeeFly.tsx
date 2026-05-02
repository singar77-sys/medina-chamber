"use client";

import { useEffect, useRef, useState } from "react";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function BeeFly() {
  const [active, setActive] = useState(false);
  const [rtl, setRtl] = useState(false);
  const [top, setTop] = useState("40vh");
  const timer    = useRef<ReturnType<typeof setTimeout>>(undefined);
  const firstRun = useRef(true);

  function schedule() {
    clearTimeout(timer.current);
    const delay = firstRun.current ? 100_000 : 90_000;
    firstRun.current = false;
    timer.current = setTimeout(() => {
      setRtl(Math.random() < 0.5);
      setTop(`${rand(20, 72)}vh`);
      setActive(true);
    }, delay);
  }

  useEffect(() => {
    schedule();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (!e.animationName.startsWith("beeFlyX")) return;
    setActive(false);
    schedule();
  }

  return (
    <>
      {active && (
        <div
          className={`bee-wrapper ${rtl ? "bee-active-rtl" : "bee-active-ltr"}`}
          style={{ top }}
          onAnimationEnd={handleEnd}
          aria-hidden="true"
        >
          <div className="bee-inner">
            {/*
              Side-profile bee, seen from slightly behind.
              Oriented head-right for LTR; .bee-rtl flips for RTL.
              viewBox: 80×60 — wide body, wings on top, no face.
            */}
            <svg
              className={rtl ? "bee-rtl" : undefined}
              viewBox="0 0 80 60"
              width="72"
              height="54"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <defs>
                <clipPath id="bee-body-clip">
                  {/* Matches body ellipse exactly */}
                  <ellipse cx="36" cy="42" rx="28" ry="17" />
                </clipPath>
              </defs>

              {/* Wings (teal, behind body) */}
              {/* Rear/upper wing — larger, swept back */}
              <ellipse
                className="bee-wing-l"
                cx="24" cy="21" rx="22" ry="12"
                transform="rotate(-22 24 21)"
                fill="#83BCA9" fillOpacity="0.85"
                stroke="#0C1B33" strokeWidth="1"
              />
              {/* Front/lower wing — slightly smaller */}
              <ellipse
                className="bee-wing-r"
                cx="38" cy="19" rx="17" ry="9"
                transform="rotate(-8 38 19)"
                fill="#83BCA9" fillOpacity="0.85"
                stroke="#0C1B33" strokeWidth="1"
              />

              {/* Body */}
              <ellipse
                cx="36" cy="42" rx="28" ry="17"
                fill="#FF4000" stroke="#0C1B33" strokeWidth="1.5"
              />
              {/* Two vertical stripes, clipped to body */}
              <g clipPath="url(#bee-body-clip)">
                <rect x="24" y="25" width="5" height="34" fill="#0C1B33" />
                <rect x="37" y="25" width="5" height="34" fill="#0C1B33" />
              </g>

              {/* Head (small, at front/right end) */}
              <circle
                cx="60" cy="40" r="9"
                fill="#FF4000" stroke="#0C1B33" strokeWidth="1.4"
              />

              {/* Antennae (short, from top of head) */}
              <path
                d="M 57 32 C 55 27 53 24 51 20"
                stroke="#0C1B33" strokeWidth="1.1" fill="none" strokeLinecap="round"
              />
              <path
                d="M 63 32 C 64 27 66 24 67 20"
                stroke="#0C1B33" strokeWidth="1.1" fill="none" strokeLinecap="round"
              />
              <circle cx="51" cy="20" r="2" fill="#0C1B33" />
              <circle cx="67" cy="20" r="2" fill="#0C1B33" />

              {/* Stinger (rear/left tip) */}
              <path d="M 8 40 L 3 42 L 8 44" fill="#0C1B33" />
            </svg>
          </div>
        </div>
      )}
    </>
  );
}
