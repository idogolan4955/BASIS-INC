import type { FabricStructure } from '@basis/shared';
import { useId } from 'react';
import { cn } from './cn';
import { inkOn } from './tone';

// The fabric drawn at macro scale from its own construction: mesh as a
// hexagonal knit, tulle as two sheer nets laid over each other, lining as a
// satin face with its sheen. A structure drawing, not a photograph; real
// material photography replaces it wherever a media asset exists.

function Mesh({ id, scale }: { id: string; scale: number }) {
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
  tone,
}: {
  kind: FabricStructure;
  scale?: number;
  className?: string;
  /** Omit when the drawing is decorative. */
  label?: string;
  /** A shade to draw the fabric in: the hex fills the ground and picks the ink. Without it the host sets the colours. */
  tone?: string;
}) {
  const id = `structure-${useId().replace(/:/g, '')}`;
  return (
    <svg
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('block size-full', className)}
      preserveAspectRatio="xMidYMid slice"
      style={tone ? { backgroundColor: tone, color: inkOn(tone) } : undefined}
    >
      {kind === 'mesh' && <Mesh id={id} scale={scale} />}
      {kind === 'tulle' && <Tulle id={id} scale={scale} />}
      {kind === 'lining' && <Lining id={id} scale={scale} />}
    </svg>
  );
}

/**
 * A SKU's image: its family's structure drawn in its shade. The swatch is
 * derived from two facts, never uploaded, so every SKU has one from the
 * moment it exists and all of them agree.
 */
export function FabricSwatch({
  structure,
  hex,
  name,
  code,
  size = 'md',
  className,
}: {
  structure: FabricStructure;
  hex: string;
  name: string;
  code?: string;
  size?: 'sm' | 'md' | 'lg' | 'fill';
  className?: string;
}) {
  const dimension = size === 'sm' ? 'size-6' : size === 'lg' ? 'size-20' : size === 'fill' ? 'size-full' : 'size-10';
  const scale = size === 'sm' ? 0.45 : size === 'md' ? 0.6 : size === 'lg' ? 0.8 : 1;
  return (
    <span
      role="img"
      aria-label={code ? `${name} (${code})` : name}
      title={code ? `${name} · ${code}` : name}
      className={cn('inline-block shrink-0 overflow-hidden rounded-xs border border-charcoal/15', dimension, className)}
    >
      <Structure kind={structure} scale={scale} tone={hex} />
    </span>
  );
}
