"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { UserColorProfile } from "@/lib/user-color-profile";

type JoyAuraProps = {
  colorProfile: UserColorProfile | null;
  submissionCount: number;
  size?: number;
  speed?: number;
  paused?: boolean;
};

type AuraBlob = {
  h: number;
  s: number;
  l: number;
  weight: number;
  radius: number;
  ox: number;
  oy: number;
  fx: number;
  fy: number;
  phaseX: number;
  phaseY: number;
  phasePulse: number;
  ampX: number;
  ampY: number;
};

type AuraParticle = {
  angle: number;
  speed: number;
  radius: number;
  orbit: number;
  pulsePhase: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hslToRgba(h: number, s: number, l: number, alpha: number): string {
  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

function buildFallbackBlobs(size: number): AuraBlob[] {
  const orbR = size * 0.4;
  const baseR = size * 0.13;
  return [
    {
      h: 30,
      s: 25,
      l: 70,
      weight: 1,
      radius: baseR,
      ox: 0,
      oy: 0,
      fx: 0.45,
      fy: 0.62,
      phaseX: 0.3,
      phaseY: 0.9,
      phasePulse: 0.5,
      ampX: orbR * 0.15,
      ampY: orbR * 0.15,
    },
  ];
}

function buildBlobsFromProfile(
  profile: UserColorProfile | null,
  size: number,
): AuraBlob[] {
  if (!profile || profile.top_hue_buckets.length === 0) {
    return buildFallbackBlobs(size);
  }

  const orbR = size * 0.4;
  const baseR = size * 0.13;
  const avgS = clamp(profile.avg_saturation + 5, 0, 100);
  const avgL = profile.avg_lightness > 78 ? profile.avg_lightness - 8 : profile.avg_lightness;
  const useful = profile.top_hue_buckets.filter((b) => b.weight > 0);
  const maxWeight = Math.max(...useful.map((b) => b.weight), 1);

  const hueSorted = [...useful].sort((a, b) => a.bucket_start - b.bucket_start);

  return hueSorted.map((bucket, idx) => {
    const h = (bucket.bucket_start + 15) % 360;
    const angle = (h / 360) * Math.PI * 2;
    const weightNorm = Math.max(bucket.weight / maxWeight, 0.15);
    const radius = baseR * Math.sqrt(weightNorm * 2.2);
    return {
      h,
      s: avgS,
      l: clamp(avgL, 8, 92),
      weight: bucket.weight,
      radius,
      ox: Math.cos(angle) * 0.4,
      oy: Math.sin(angle) * 0.4,
      fx: 0.4 + ((idx * 0.11) % 0.3),
      fy: 0.5 + ((idx * 0.13) % 0.3),
      phaseX: idx * 0.9 + 0.3,
      phaseY: idx * 1.1 + 0.8,
      phasePulse: idx * 0.7 + 0.4,
      ampX: orbR * (0.09 + 0.02 * (idx % 4)),
      ampY: orbR * (0.1 + 0.02 * ((idx + 1) % 4)),
    };
  });
}

function buildParticles(seedCount = 13): AuraParticle[] {
  return Array.from({ length: seedCount }).map((_, idx) => ({
    angle: (idx / seedCount) * Math.PI * 2,
    speed: 0.08 + ((idx * 0.013) % 0.09),
    radius: 0.7 + ((idx * 0.31) % 1.3),
    orbit: 0.22 + ((idx * 0.067) % 0.48),
    pulsePhase: idx * 0.77,
  }));
}

export function JoyAura({
  colorProfile,
  submissionCount,
  size = 480,
  speed = 1,
  paused = false,
}: JoyAuraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState(size);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setCanvasSize(Math.floor(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const blobs = useMemo(
    () => buildBlobsFromProfile(colorProfile, canvasSize),
    [colorProfile, canvasSize],
  );
  const particles = useMemo(() => buildParticles(13), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(canvasSize * dpr);
    canvas.height = Math.floor(canvasSize * dpr);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const orbR = canvasSize * 0.4;

    const draw = () => {
      if (!ctx) return;
      if (!paused) {
        timeRef.current += 0.007 * speed;
      }
      const t = timeRef.current;
      const globalPulse = 1 + 0.025 * Math.sin(t * 0.38);

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(globalPulse, globalPulse);
      ctx.translate(-centerX, -centerY);

      ctx.globalCompositeOperation = "source-over";
      for (const blob of blobs) {
        const x =
          centerX +
          blob.ox * orbR +
          Math.sin(t * blob.fx + blob.phaseX) * blob.ampX;
        const y =
          centerY +
          blob.oy * orbR +
          Math.cos(t * blob.fy + blob.phaseY) * blob.ampY;
        const radius =
          blob.radius * (1 + 0.07 * Math.sin(t * 0.85 + blob.phasePulse));

        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, hslToRgba(blob.h, blob.s, blob.l, 0.62));
        grad.addColorStop(0.3, hslToRgba(blob.h, blob.s, blob.l, 0.38));
        grad.addColorStop(0.58, hslToRgba(blob.h, blob.s, blob.l, 0.14));
        grad.addColorStop(0.82, hslToRgba(blob.h, blob.s, blob.l, 0.04));
        grad.addColorStop(1, hslToRgba(blob.h, blob.s, blob.l, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Particles.
      for (const particle of particles) {
        const angle = particle.angle + t * particle.speed;
        const radius = orbR * particle.orbit;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        const alpha = 0.12 + (Math.sin(t * 0.9 + particle.pulsePhase) + 1) * 0.1;
        ctx.fillStyle = `rgba(255,250,245,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [blobs, particles, paused, canvasSize, speed]);

  const isForming = submissionCount < 3;

  return (
    <div ref={containerRef} className="flex w-full flex-col items-start">
      <canvas
        ref={canvasRef}
        className="max-w-full"
        aria-label="Joy aura visualization"
      />
      <p className="mt-3 text-[calc(0.85rem_+_4pt)] leading-[1.2] text-[#8C7B6E]">
        {isForming ? "your aura is forming... " : null}
        {`your aura · ${submissionCount} joy spots`}
      </p>
      <p className="mt-1 text-[calc(0.85rem_+_4pt)] leading-relaxed text-[#8C7B6E]">
        Your joy aura is carefully calculated based on and evolves with the
        photos you share. It reflects the colors you often associate with joy.
      </p>
    </div>
  );
}
