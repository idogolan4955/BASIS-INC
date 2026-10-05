import type { FabricStructure } from '@basis/shared';
import { useId } from 'react';
import { cn } from './cn';

// The fabric drawn at macro scale from its own construction: powermesh as a
// hexagonal knit, tulle as two sheer nets laid over each other, lining as a
// satin face with its sheen. A structure drawing, not a photograph; real
// material photography replaces it wherever a media asset exists.

function Powermesh({ id, scale }: { id: string; scale: number }) {
  const side = 7 * scale;
  const height = Math.sqrt(3) * side;
  const d = `M0,${height / 2} L${side / 2},0 L${side * 1.5},0 L${side * 2},${height / 2} L${side * 1.5},${height} L${
    side / 2
  },${height} Z M${side * 2},${height / 2} L${side * 3},${height / 2}`;
  return (
    <>
      <defs>
        <pattern id={id} width={side * 3} height={height} patternUnits="userSpaceOnUse">
          <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6 * scale} strokeLinejoin="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </>
  );
}

function Tulle({ id, scale }: { id: string; scale: number }) {
  const cell = 9 * scale;
  const net = `M0,${cell / 2} L${cell / 2},0 L${cell},${cell / 2} L${cell / 2},${cell} Z`;
  return (
    <>
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <path d={net} fill="none" stroke="currentColor" strokeWidth={0.6 * scale} />
        </pattern>
        <pattern id={`${id}-over`} width={cell} height={cell} patternUnits="userSpaceOnUse" patternTransform="rotate(7) scale(1.06)">
          <path d={net} fill="none" stroke="currentColor" strokeWidth={0.5 * scale} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.75" />
      <rect width="100%" height="100%" fill={`url(#${id}-over)`} opacity="0.55" />
    </>
  );
}

function Lining({ id, scale }: { id: string; scale: number }) {
  const step = 3 * scale;
  return (
    <>
      <defs>
        <pattern id={id} width={step} height={step} patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
          <line x1="0" y1="0" x2={step} y2="0" stroke="currentColor" strokeWidth={0.5 * scale} />
        </pattern>
        {/* The sheen is the material itself: light crossing a satin face. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.1" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="0.42" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.62" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="0.9" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id}-sheen)`} />
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity="0.5" />
    </>
  );
}

export function Structure({
  kind,
  scale = 1,
  className,
  label,
}: {
  kind: FabricStructure;
  scale?: number;
  className?: string;
  /** Omit when the drawing is decorative. */
  label?: string;
}) {
  const id = `structure-${useId().replace(/:/g, '')}`;
  return (
    <svg
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('block size-full', className)}
      preserveAspectRatio="xMidYMid slice"
    >
      {kind === 'powermesh' && <Powermesh id={id} scale={scale} />}
      {kind === 'tulle' && <Tulle id={id} scale={scale} />}
      {kind === 'lining' && <Lining id={id} scale={scale} />}
    </svg>
  );
}
