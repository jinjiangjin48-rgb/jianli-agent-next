'use client';
import React from 'react';

const baseStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(90deg, var(--bg-sunken) 0%, var(--border) 50%, var(--bg-sunken) 100%)',
  backgroundSize: '200% 100%',
  animation: 'sift-shimmer 1.6s linear infinite',
  borderRadius: 4,
};

function Line({ w = '100%', h = 12 }: { w?: number | string; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h }} />;
}

function Block({ w = '100%', h = 40 }: { w?: number | string; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h, borderRadius: 8, display: 'block' }} />;
}

function Badge({ w = 72, h = 20 }: { w?: number; h?: number }) {
  return <span aria-hidden="true" style={{ ...baseStyle, width: w, height: h, borderRadius: 4 }} />;
}

export const Skeleton = { Line, Block, Badge };
