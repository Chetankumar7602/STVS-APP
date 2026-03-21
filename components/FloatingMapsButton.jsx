"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteSettings } from '@/lib/useSiteSettings';

const STORAGE_KEY = 'stvs-maps-corner';
const ADDRESS = 'Guttala road, Hosaritti, Haveri 581213';

const CORNERS = {
  'top-left': { top: 96, left: 24 },
  'top-right': { top: 96, right: 24 },
  'bottom-left': { bottom: 24, left: 24 },
  'bottom-right': { bottom: 24, right: 24 },
};

function GoogleMapsMarkerIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-8 w-8 drop-shadow-sm">
      <path d="M32 4C20.4 4 11 13.4 11 25c0 16.7 21 35 21 35s21-18.3 21-35C53 13.4 43.6 4 32 4z" fill="#1a73e8" />
      <path d="M32 4c-5.7 0-10.9 2.3-14.7 6l15 15.1L47.2 9.9C43.4 6.3 38.1 4 32 4z" fill="#34a853" />
      <path d="M17.4 13.1C13.4 16.9 11 20.6 11 25c0 8.9 5.9 18 11.4 24.4L32.3 25 17.4 13.1z" fill="#fbbc04" />
      <path d="M53 25c0-5.9-2.4-11.2-6.2-15L32.3 25l10.1 24.4C47.6 42.9 53 34.2 53 25z" fill="#ea4335" />
      <circle cx="32" cy="25" r="9.5" fill="#fff" />
      <circle cx="32" cy="25" r="4.5" fill="#1a73e8" />
    </svg>
  );
}

export default function FloatingMapsButton() {
  const pathname = usePathname();
  const { settings } = useSiteSettings();
  const [corner, setCorner] = useState('bottom-right');
  const [dragPosition, setDragPosition] = useState(null);
  const [ready, setReady] = useState(false);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
  });
  const buttonRef = useRef(null);

  const mapsUrl = useMemo(() => {
    const mapsSetting = String(settings.contact_maps_url || '').trim();
    if (mapsSetting) return mapsSetting;
    const address = String(settings.contact_address || ADDRESS).trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }, [settings.contact_maps_url, settings.contact_address]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedCorner = window.localStorage.getItem(STORAGE_KEY);
      if (savedCorner && CORNERS[savedCorner]) {
        setCorner(savedCorner);
      }
      setReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const saveCorner = (nextCorner) => {
    setCorner(nextCorner);
    window.localStorage.setItem(STORAGE_KEY, nextCorner);
  };

  const getSnappedCorner = (x, y) => {
    const horizontal = x < window.innerWidth / 2 ? 'left' : 'right';
    const vertical = y < window.innerHeight / 2 ? 'top' : 'bottom';
    return `${vertical}-${horizontal}`;
  };

  const handlePointerDown = (event) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStateRef.current = {
      active: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    setDragPosition({ x: rect.left, y: rect.top });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragStateRef.current.active) return;

    const nextX = event.clientX - dragStateRef.current.offsetX;
    const nextY = event.clientY - dragStateRef.current.offsetY;

    if (Math.abs(nextX - (dragPosition?.x ?? nextX)) > 4 || Math.abs(nextY - (dragPosition?.y ?? nextY)) > 4) {
      dragStateRef.current.moved = true;
    }

    setDragPosition({
      x: Math.max(12, Math.min(window.innerWidth - 76, nextX)),
      y: Math.max(12, Math.min(window.innerHeight - 76, nextY)),
    });
  };

  const handlePointerUp = (event) => {
    if (!dragStateRef.current.active) return;

    const wasMoved = dragStateRef.current.moved;
    dragStateRef.current.active = false;

    if (wasMoved) {
      const nextCorner = getSnappedCorner(event.clientX, event.clientY);
      saveCorner(nextCorner);
      setDragPosition(null);
      return;
    }

    setDragPosition(null);
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  const fixedStyle = dragPosition
    ? { left: `${dragPosition.x}px`, top: `${dragPosition.y}px` }
    : CORNERS[corner];

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  if (!ready) {
    return (
      <button
        type="button"
        aria-label="Open location in Google Maps"
        title="Open location in Google Maps"
        className="fixed z-70 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(26,115,232,0.28)] ring-1 ring-slate-200 transition-transform duration-200 hover:scale-105"
        style={CORNERS['bottom-right']}
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
        <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400/70 animate-pulse" />
        <span className="relative flex h-full w-full items-center justify-center rounded-full bg-white">
          <GoogleMapsMarkerIcon />
        </span>
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Open location in Google Maps"
      title="Open location in Google Maps"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragStateRef.current.active = false;
        setDragPosition(null);
      }}
      className="fixed z-70 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_18px_40px_rgba(26,115,232,0.28)] ring-1 ring-slate-200 transition-transform duration-200 hover:scale-105"
      style={fixedStyle}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
      <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-red-400/70 animate-pulse" />
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-white">
        <GoogleMapsMarkerIcon />
      </span>
    </button>
  );
}
