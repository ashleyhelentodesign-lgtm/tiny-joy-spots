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

type BlobDef = {
  cx: number;
  cy: number;
  r: number;
  h: number;
  s: number;
  l: number;
  alpha: number;
  phaseX: number;
  phaseY: number;
  phaseR: number;
  driftX: number;
  driftY: number;
  driftR: number;
  perturbPhases: number[];
};

type SceneData = {
  blobs: BlobDef[];
  bgH: number;
  bgS: number;
  bgL: number;
};

const N_POINTS = 9;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function makeBlob(
  cx: number, cy: number, r: number,
  h: number, s: number, l: number,
  alpha: number,
  phaseX: number, phaseY: number, phaseR: number,
  driftX: number, driftY: number, driftR: number,
  perturbOffset = 0,
): BlobDef {
  return {
    cx, cy, r, h, s, l, alpha,
    phaseX, phaseY, phaseR,
    driftX, driftY, driftR,
    perturbPhases: Array.from({ length: N_POINTS }, (_, i) => i * 0.85 + perturbOffset),
  };
}

function buildScene(profile: UserColorProfile | null): SceneData {
  if (!profile || profile.top_hue_buckets.length === 0) {
    return {
      bgH: 248, bgS: 38, bgL: 36,
      blobs: [
        makeBlob(0.5,  0.47, 0.54, 45, 84, 83, 0.9,  0,   1.2, 0.5, 0.28, 0.22, 0.18, 0.0),
        makeBlob(0.44, 0.56, 0.38, 18, 80, 78, 0.85, 1.5, 0.3, 1.1, 0.24, 0.30, 0.15, 0.5),
        makeBlob(0.62, 0.38, 0.30, 60, 78, 80, 0.8,  2.2, 1.8, 0.7, 0.31, 0.27, 0.19, 1.2),
        // floaters
        makeBlob(0.2,  0.22, 0.19, 35, 75, 82, 0.7,  0.6, 2.4, 1.3, 0.55, 0.48, 0.38, 2.1),
        makeBlob(0.78, 0.18, 0.16, 55, 72, 80, 0.65, 3.1, 0.9, 2.0, 0.62, 0.53, 0.42, 3.0),
        makeBlob(0.8,  0.75, 0.20, 25, 78, 79, 0.7,  1.9, 3.5, 0.8, 0.58, 0.50, 0.36, 4.0),
        makeBlob(0.18, 0.78, 0.17, 50, 74, 81, 0.65, 4.2, 1.5, 1.7, 0.60, 0.45, 0.40, 5.1),
        makeBlob(0.52, 0.12, 0.14, 38, 76, 82, 0.6,  2.8, 4.1, 2.3, 0.68, 0.57, 0.44, 6.2),
      ],
    };
  }

  const topH = (profile.top_hue_buckets[0]!.bucket_start + 15) % 360;
  const avgS = clamp(profile.avg_saturation, 30, 100);
  const avgL = clamp(profile.avg_lightness, 20, 80);

  const bgH = (topH + 185) % 360;
  const bgS = clamp(avgS * 0.45 + 12, 18, 58);
  const bgL = clamp(26 + (avgL - 50) * 0.14, 18, 40);

  const useful = profile.top_hue_buckets.filter((b) => b.weight > 0).slice(0, 4);
  const maxW = Math.max(...useful.map((b) => b.weight), 1);
  const bS = clamp(avgS + 18, 62, 96);
  const bL = clamp(80, 70, 88);

  const mainPositions: [number, number][] = [
    [0.5, 0.44],
    [0.41, 0.56],
    [0.60, 0.53],
    [0.47, 0.38],
  ];

  const blobs: BlobDef[] = useful.map((bucket, idx) => {
    const h = (bucket.bucket_start + 15) % 360;
    const weightNorm = bucket.weight / maxW;
    const [cx, cy] = mainPositions[idx % mainPositions.length]!;
    return makeBlob(
      cx, cy,
      clamp(0.37 + weightNorm * 0.23, 0.28, 0.64),
      h, bS, clamp(bL - (1 - weightNorm) * 6, 70, 88), 0.9,
      idx * 1.3 + 0.3, idx * 1.1 + 0.8, idx * 0.9 + 0.4,
      0.28 + idx * 0.04, 0.24 + idx * 0.035, 0.18 + idx * 0.025,
      idx * 0.65,
    );
  });

  // Floater blobs — smaller, faster, derived from the same hue palette
  const floaterSeeds: [number, number, number, number, number][] = [
    // cx,  cy,   r,    phaseOffset, hShift
    [0.18, 0.20, 0.18, 0.0,  20],
    [0.80, 0.15, 0.15, 1.3,  40],
    [0.82, 0.78, 0.20, 2.6, -15],
    [0.15, 0.80, 0.16, 3.9,  30],
    [0.54, 0.10, 0.14, 5.1, -30],
  ];

  floaterSeeds.forEach(([cx, cy, r, po, hShift], fi) => {
    const srcBlob = blobs[fi % blobs.length] ?? blobs[0]!;
    blobs.push(makeBlob(
      cx, cy, r,
      (srcBlob.h + hShift + 360) % 360, bS, bL - 3, 0.7,
      po, po + 1.8, po + 0.9,
      0.52 + fi * 0.06, 0.48 + fi * 0.05, 0.38 + fi * 0.04,
      po + 2.4,
    ));
  });

  return { blobs, bgH, bgS, bgL };
}

/**
 * Smooth organic closed shape via quadratic bezier through midpoints.
 */
function drawOrganicBlob(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, baseR: number,
  t: number, perturbPhases: number[],
) {
  const n = perturbPhases.length;
  const pts: [number, number][] = perturbPhases.map((phase, i) => {
    const angle = (i / n) * Math.PI * 2;
    const perturb =
      1 +
      0.26 * Math.sin(t * 0.38 + phase) +
      0.14 * Math.sin(t * 0.67 + phase * 1.5 + 1.1);
    return [cx + Math.cos(angle) * baseR * perturb, cy + Math.sin(angle) * baseR * perturb];
  });

  const last = pts[n - 1]!;
  const first = pts[0]!;
  ctx.beginPath();
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const next = pts[(i + 1) % n]!;
    ctx.quadraticCurveTo(p[0], p[1], (p[0] + next[0]) / 2, (p[1] + next[1]) / 2);
  }
  ctx.closePath();
}

export function JoyAura({
  colorProfile,
  submissionCount,
  size = 480,
  speed = 1,
  paused = false,
}: JoyAuraProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgDivRef = useRef<HTMLDivElement>(null);
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

  const { blobs, bgH, bgS, bgL } = useMemo(() => buildScene(colorProfile), [colorProfile]);

  // Keep bg base values accessible inside the draw loop without re-running the effect
  const bgBaseRef = useRef({ h: bgH, s: bgS, l: bgL });
  bgBaseRef.current = { h: bgH, s: bgS, l: bgL };

  const blurPx = Math.round(clamp(canvasSize * 0.085, 16, 56));
  const bgColor = `hsl(${bgH}, ${bgS}%, ${bgL}%)`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvasSize * dpr);
    canvas.height = Math.floor(canvasSize * dpr);
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const draw = () => {
      if (!paused) timeRef.current += 0.009 * speed;
      const t = timeRef.current;
      const W = canvasSize;
      const H = canvasSize;

      // Global breathing: gentle inhale/exhale on all radii
      const breathe = 1 + 0.08 * Math.sin(t * 1.05);

      // Background colour fluctuation — hue drifts ±14°, lightness ±5%, saturation ±6%
      const { h: bH, s: bS, l: bL } = bgBaseRef.current;
      const animH = bH + 14 * Math.sin(t * 0.11);
      const animS = bS + 6  * Math.sin(t * 0.17 + 1.0);
      const animL = bL + 5  * Math.sin(t * 0.14 + 2.3);
      if (bgDivRef.current) {
        bgDivRef.current.style.background =
          `hsl(${animH.toFixed(1)}, ${clamp(animS, 8, 80).toFixed(1)}%, ${clamp(animL, 8, 55).toFixed(1)}%)`;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "screen";

      for (const blob of blobs) {
        const bx = blob.cx * W + Math.sin(t * blob.driftX + blob.phaseX) * W * 0.14;
        const by = blob.cy * H + Math.cos(t * blob.driftY + blob.phaseY) * H * 0.12;
        const br =
          blob.r *
          Math.min(W, H) *
          breathe *
          (1 + 0.05 * Math.sin(t * blob.driftR + blob.phaseR));

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br * 1.15);
        grad.addColorStop(0,    `hsla(${blob.h}, ${blob.s}%, ${blob.l}%, ${blob.alpha})`);
        grad.addColorStop(0.4,  `hsla(${blob.h}, ${blob.s}%, ${blob.l}%, ${(blob.alpha * 0.65).toFixed(2)})`);
        grad.addColorStop(0.72, `hsla(${blob.h}, ${blob.s}%, ${blob.l}%, ${(blob.alpha * 0.24).toFixed(2)})`);
        grad.addColorStop(1,    `hsla(${blob.h}, ${blob.s}%, ${blob.l}%, 0)`);
        ctx.fillStyle = grad;

        drawOrganicBlob(ctx, bx, by, br, t, blob.perturbPhases);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [blobs, paused, canvasSize, speed]);

  const isForming = submissionCount < 3;

  return (
    <div ref={containerRef} className="flex w-full flex-col items-start">
      <div
        ref={bgDivRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ background: bgColor, aspectRatio: "1 / 1" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block"
          style={{ filter: `blur(${blurPx}px)`, width: "100%", height: "100%" }}
          aria-label="Joy aura visualization"
        />
      </div>
      <p className="mt-3 text-[calc(0.85rem_+_4pt)] leading-[1.2] text-[#8C7B6E]">
        {isForming ? "your aura is forming… " : null}
        {`your aura · ${submissionCount} joy spots`}
      </p>
      <p className="mt-1 text-[calc(0.85rem_+_4pt)] leading-relaxed text-[#8C7B6E]">
        Your joy aura is carefully calculated based on and evolves with the
        photos you share. It reflects the colors you often associate with joy.
      </p>
    </div>
  );
}
