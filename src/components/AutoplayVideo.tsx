"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Autoplaying looping decorative video with the pause control WCAG 2.2.2
 * requires, and no autoplay at all when the visitor asks for reduced motion
 * (they get the poster frame plus a Play button).
 *
 * A plain <video autoPlay muted loop> cannot do either: the pages using it are
 * server components with no way to read matchMedia, and native `controls` puts
 * a full chrome bar on what is a borderless card in the layout.
 */
export function AutoplayVideo({
  src,
  poster,
  label,
  className,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Server render and first paint stay paused: playback starts from the effect
  // only once we know the visitor has not asked for reduced motion.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().then(
      () => setPlaying(true),
      () => {
        /* autoplay refused by the browser; the Play button still works */
      },
    );
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(
        () => setPlaying(true),
        () => {},
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className={className}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      <button
        type="button"
        onClick={toggle}
        className="
          absolute bottom-f13 right-f13
          px-f13 py-f8 rounded-full
          bg-oxford/80 hover:bg-oxford text-white text-caption font-bold
          backdrop-blur-sm cursor-pointer
        "
      >
        {playing ? "Pause" : "Play"} video
      </button>
    </div>
  );
}
