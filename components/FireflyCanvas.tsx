"use client";

import { useEffect, useRef } from "react";
import { Firefly, fireflyAt } from "@/lib/fireflies";

const SPRITE_PX = 128;
const GLOW_PX = 160;
/** firefly.svg is 394.486 x 417.3 */
const SPRITE_RATIO = 417.3 / 394.486;

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function makeGlowSprite(hex: string): HTMLCanvasElement {
  const rgb = hexToRgb(hex);
  const c = document.createElement("canvas");
  c.width = c.height = GLOW_PX;
  const g = c.getContext("2d")!;
  const r = GLOW_PX / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, `rgba(${rgb}, 0.85)`);
  grd.addColorStop(0.22, `rgba(${rgb}, 0.42)`);
  grd.addColorStop(0.55, `rgba(${rgb}, 0.12)`);
  grd.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, GLOW_PX, GLOW_PX);
  return c;
}

async function rasteriseFirefly(): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = "/art/firefly.svg";
  await img.decode();
  const c = document.createElement("canvas");
  c.width = SPRITE_PX;
  c.height = Math.round(SPRITE_PX * SPRITE_RATIO);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/**
 * Recolours the sprite while keeping its shading. "color" takes hue and
 * saturation from the fill and luminance from the sprite, so the dark body
 * stays dark and the lit abdomen takes the owner's colour. The final
 * destination-in restores the sprite's alpha, otherwise the fill would leave
 * a solid square behind.
 */
function tintSprite(base: HTMLCanvasElement, hex: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = base.width;
  c.height = base.height;
  const g = c.getContext("2d")!;
  g.drawImage(base, 0, 0);
  g.globalCompositeOperation = "color";
  g.fillStyle = hex;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(base, 0, 0);
  return c;
}

interface Props {
  fireflies: Firefly[];
  /** where fireflies are born, in field fractions */
  jar: { x: number; y: number };
  /** hex per owner — "you" comes from the colour picked during onboarding */
  colours: { you: string; partner: string };
}

export default function FireflyCanvas({ fireflies, jar, colours }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flies = useRef(fireflies);
  const jarRef = useRef(jar);

  useEffect(() => {
    flies.current = fireflies;
  }, [fireflies]);

  useEffect(() => {
    jarRef.current = jar;
  }, [jar]);

  const you = colours.you;
  const partner = colours.partner;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let disposed = false;
    let sprites: Record<"you" | "partner", HTMLCanvasElement> | null = null;
    const glow = {
      you: makeGlowSprite(you),
      partner: makeGlowSprite(partner),
    };

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (disposed) return;
      // Firefly.bornAt is epoch ms (it will come from the server), so the
      // clock here must be too — NOT the rAF timestamp, which counts from
      // page load and makes every age wildly negative.
      const now = Date.now();
      ctx.clearRect(0, 0, w, h);

      if (sprites) {
        // Scale sprite sizes against the 390px reference width.
        const k = w / 390;
        for (const f of flies.current) {
          const { x, y, alpha, scale } = fireflyAt(f, now, jarRef.current);
          const px = x * w;
          const py = y * h;
          const size = f.size * k * scale;

          const gs = size * 3.6;
          ctx.globalAlpha = alpha * 0.95;
          ctx.drawImage(glow[f.owner], px - gs / 2, py - gs / 2, gs, gs);

          ctx.globalAlpha = Math.min(1, alpha + 0.3);
          const sh = size * SPRITE_RATIO;
          ctx.drawImage(sprites[f.owner], px - size / 2, py - sh / 2, size, sh);
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };

    rasteriseFirefly().then((base) => {
      if (disposed) return;
      sprites = { you: tintSprite(base, you), partner: tintSprite(base, partner) };
    });
    raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [you, partner]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
