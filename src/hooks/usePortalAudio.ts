"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Synthesized audio engine for the ChamberBot Portal.
 *
 * Everything is generated at runtime via the Web Audio API — no audio
 * files on disk, zero asset weight. Sounds are musical and tuned to the
 * chamber palette: warm, deep, ethereal rather than techy / harsh.
 *
 * Sound design:
 *   enter()   — a warm upward "vwooom" (80→220 Hz sawtooth sweep, 800ms)
 *   exit()    — same sweep reversed, shorter (500ms)
 *   receive() — three-note pentatonic chime (C5-E5-G5), arriving with
 *               her first token; telegraphs "she's speaking now"
 *   startAmbient() / stopAmbient() — low-gain dual-tone drone bed that
 *               lives for the duration of the portal session
 *
 * Browser autoplay policy is satisfied because the portal opens as a
 * result of a user gesture (input submit / chip click), so the very
 * first audio call has gesture context attached.
 */
export function usePortalAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const ambientNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode }[] | null>(null);
  const [muted, setMuted] = useState<boolean>(false);

  // Respect prefers-reduced-motion by auto-muting for those users.
  // They opted out of motion, so they probably don't want a sudden
  // drone either — they can unmute if they change their mind.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (mq?.matches) setMuted(true);
  }, []);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const W = window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, [muted]);

  // Keep master gain in sync with mute toggle
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      const t = ctxRef.current.currentTime;
      masterRef.current.gain.cancelScheduledValues(t);
      masterRef.current.gain.linearRampToValueAtTime(muted ? 0 : 0.7, t + 0.08);
    }
  }, [muted]);

  const playSweep = useCallback(
    (fromHz: number, toHz: number, durationSec: number, peakGain: number) => {
      const ctx = ensureCtx();
      if (!ctx || !masterRef.current) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(fromHz, now);
      osc.frequency.exponentialRampToValueAtTime(toHz, now + durationSec);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.Q.value = 2;
      lp.frequency.setValueAtTime(400, now);
      lp.frequency.exponentialRampToValueAtTime(2400, now + durationSec * 0.7);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peakGain, now + durationSec * 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(lp).connect(g).connect(masterRef.current);
      osc.start(now);
      osc.stop(now + durationSec + 0.05);
    },
    [ensureCtx],
  );

  const enter = useCallback(() => {
    playSweep(80, 220, 0.8, 0.18);
  }, [playSweep]);

  const exit = useCallback(() => {
    playSweep(220, 70, 0.5, 0.14);
  }, [playSweep]);

  const receive = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const now = ctx.currentTime;
    // Pentatonic ascending: C5 E5 G5 (523.25, 659.25, 783.99)
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((hz, i) => {
      const start = now + i * 0.09;
      const dur = 0.35;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, start);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g).connect(masterRef.current!);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }, [ensureCtx]);

  /**
   * Playful "boop" when the user touches/clicks the mascot — a single
   * sine with a subtle upward pitch bend, like a friendly little "hi!"
   * chirp. Short (~180ms) so rapid-fire taps don't overlap harshly.
   */
  const boop = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.09);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(g).connect(masterRef.current);
    osc.start(now);
    osc.stop(now + 0.2);
  }, [ensureCtx]);

  const startAmbient = useCallback(() => {
    if (ambientNodesRef.current) return; // already playing
    const ctx = ensureCtx();
    if (!ctx || !masterRef.current) return;
    const now = ctx.currentTime;

    // Two low sines, slightly detuned — airy pad bed
    const buildTone = (hz: number, gainAmt: number) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = hz;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainAmt, now + 1.2);
      osc.connect(gain).connect(masterRef.current!);
      osc.start(now);
      return { osc, gain };
    };

    ambientNodesRef.current = [
      buildTone(55, 0.025),    // low A1
      buildTone(110.3, 0.020), // A2, tiny detune for movement
    ];
  }, [ensureCtx]);

  const stopAmbient = useCallback(() => {
    const ctx = ctxRef.current;
    const nodes = ambientNodesRef.current;
    if (!ctx || !nodes) return;
    const now = ctx.currentTime;
    nodes.forEach(({ osc, gain }) => {
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.stop(now + 0.45);
    });
    ambientNodesRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbient();
      // Don't close the AudioContext — subsequent portal opens reuse it.
    };
  }, [stopAmbient]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { enter, exit, receive, boop, startAmbient, stopAmbient, toggleMute, muted };
}
