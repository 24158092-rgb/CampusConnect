import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface Props {
  className?: string;
  /** 0–1: how "agitated" the field looks (e.g. rises while a delivery run is active). */
  intensity?: number;
  label: string;
}

const COLORS = ['#6d8bff', '#8b5cf6', '#a855f7', '#c026d3', '#e879f9'];

/**
 * Decorative neon line field: concentric distorted contours (the alert) with streams flowing out
 * to the right (the channels). Pure canvas, no dependencies; static when motion is reduced.
 */
export function SignalField({ className, intensity = 0.4, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const highContrast = useStore((s) => s.a11y.highContrast);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const still = reduced || osReduced;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      const k = intensityRef.current;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const cx = w * (w > 700 ? 0.64 : 0.55);
      const cy = h * (w > 700 ? 0.5 : 0.3);
      const base = Math.min(w * 0.42, h * 0.52);
      const rings = w < 500 ? 34 : 56;

      for (let i = 0; i < rings; i++) {
        const f = i / rings;
        const color = COLORS[Math.min(COLORS.length - 1, Math.floor(f * COLORS.length))];
        ctx.strokeStyle = color;
        ctx.globalAlpha = highContrast ? 0.6 : 0.16 + 0.3 * (1 - Math.abs(f - 0.55));
        ctx.lineWidth = 1;
        ctx.shadowColor = color;
        ctx.shadowBlur = highContrast ? 0 : 6;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.06) {
          const wobble =
            1 +
            (0.14 + 0.1 * k) * Math.sin(3 * a + t * 0.6 + i * 0.12) +
            0.07 * Math.sin(5 * a - t * 0.45 + f * 4) +
            0.04 * Math.sin(9 * a + t * 0.3);
          const r = base * (0.1 + f * 0.9) * wobble;
          const x = cx + Math.cos(a) * r * 1.15;
          const y = cy + Math.sin(a) * r * 0.82;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Streams leaving the field towards the right edge (delivery channels)
      const streams = w < 500 ? 16 : 30;
      for (let s = 0; s < streams; s++) {
        const f = s / streams;
        const y0 = cy + (f - 0.5) * base * 1.3;
        const x0 = cx + base * 0.35;
        const x1 = Math.min(w - 10, x0 + w * (0.12 + 0.16 * (((s * 37) % 10) / 10)));
        const color = COLORS[2 + (s % 3)];
        ctx.strokeStyle = color;
        ctx.globalAlpha = highContrast ? 0.7 : 0.35;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        const steps = 24;
        let px = x0;
        let py = y0;
        for (let j = 1; j <= steps; j++) {
          const q = j / steps;
          px = x0 + (x1 - x0) * q;
          py = y0 + Math.sin(q * 3 + t * (0.8 + k) + s) * 6 * (1 - q) + (f - 0.5) * q * 30;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        // Packet dot travelling along each stream
        const p = (t * (0.08 + 0.12 * k) + s * 0.13) % 1;
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#f5d0fe';
        ctx.beginPath();
        ctx.arc(x0 + (x1 - x0) * p, y0 + (f - 0.5) * p * 30, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return;
      last = now;
      draw(now / 1000);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (still) draw(2);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    if (still) draw(2);
    else raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced, highContrast]);

  return <canvas ref={ref} role="img" aria-label={label} className={className} />;
}
