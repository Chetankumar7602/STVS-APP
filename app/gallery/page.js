"use client";

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Camera, PlayCircle, X, ZoomIn, Film } from 'lucide-react';
import { STATIC_GALLERY_MEDIA, isRemoteUrl, mapDbGalleryItems } from '@/lib/gallery';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

const FILTERS = [
  { key: 'all', labelKey: 'gallery.filters.all', fallback: 'All' },
  { key: 'service', labelKey: 'gallery.filters.service', fallback: 'Community Service' },
  { key: 'awards', labelKey: 'gallery.filters.awards', fallback: 'Recognition & Awards' },
  { key: 'video', labelKey: 'gallery.filters.video', fallback: 'Video' },
];

const colSpans = [
  'md:col-span-2 md:row-span-2',
  'md:col-span-1', 'md:col-span-1',
  'md:col-span-2', 'md:col-span-1', 'md:col-span-1',
  'md:col-span-1', 'md:col-span-2', 'md:col-span-1',
  'md:col-span-1', 'md:col-span-1', 'md:col-span-1',
  'md:col-span-2', 'md:col-span-1', 'md:col-span-1',
  'md:col-span-1', 'md:col-span-1', 'md:col-span-2',
  'md:col-span-1', 'md:col-span-1', 'md:col-span-1',
];

export default function GalleryPage() {
  const { tr } = useLanguage();
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);
  const [media, setMedia] = useState(STATIC_GALLERY_MEDIA);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch('/api/gallery');
        const data = await readJsonResponse(res);
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMedia([...STATIC_GALLERY_MEDIA, ...mapDbGalleryItems(data.data)]);
        }
      } catch (error) {
        setMedia(STATIC_GALLERY_MEDIA);
      }
    }

    fetchGallery();
  }, []);

  const filtered = filter === 'all' ? media : media.filter((item) => item.category === filter);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <div className="relative h-64 md:h-80 overflow-hidden flex items-end">
        <div className="absolute inset-0 grid grid-cols-4 gap-0.5">
          {['/assets/picNew13.jpg', '/assets/picNew2.jpg', '/assets/picNew11.jpg', '/assets/picNew4.jpeg'].map((src, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image src={src} alt="" fill className="object-cover object-top scale-105" sizes="25vw" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-white via-white/75 to-white/20" />

        <div className="relative z-10 container mx-auto px-4 md:px-6 pb-10">
          <Link href="/#gallery" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary transition-colors mb-4">
            <ArrowLeft size={15} />
            {tr('gallery.backToHome', 'Back to Home')}
          </Link>
          <div className="flex items-end gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <Camera size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-primary text-xs font-semibold uppercase tracking-widest mb-0.5">{tr('gallery.visualJourney', 'Visual Journey')}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-tight">
                {tr('gallery.title', 'Community Service Through the Lens')}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`shrink-0 px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                filter === item.key
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {tr(item.labelKey, item.fallback)}
            </button>
          ))}
          <span className="ml-auto shrink-0 text-slate-400 text-sm self-center">{filtered.length} {tr('gallery.items', 'items')}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[180px] grid-flow-row-dense"
          >
            {filtered.map((item, index) => (
              <motion.div
                key={item._id || item.src}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04, type: 'spring', stiffness: 110 }}
                whileHover={{ scale: 1.02, zIndex: 10 }}
                onClick={() => setLightbox(item)}
                className={`relative rounded-2xl overflow-hidden group cursor-pointer bg-slate-200 shadow-sm ring-1 ring-slate-200 hover:ring-primary/40 hover:shadow-lg transition-shadow duration-300 ${
                  filter === 'all' ? (colSpans[index] || item.className || 'md:col-span-1') : 'md:col-span-1'
                }`}
              >
                {item.type === 'image' ? (
                  <>
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      unoptimized={isRemoteUrl(item.src)}
                      className={`object-cover ${item.thumbPos || 'object-center'} transition-transform duration-700 group-hover:scale-110`}
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-slate-900/70 via-slate-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-start justify-end p-4">
                      <div className="flex items-center gap-1.5 text-white/80 mb-1">
                        <ZoomIn size={13} />
                        <span className="text-xs font-medium uppercase tracking-wide">{tr('gallery.open', 'Open')}</span>
                      </div>
                      <p className="text-white text-sm font-semibold leading-snug">{item.alt}</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-slate-900">
                    {item.thumb && (
                      <Image
                        src={item.thumb}
                        alt="Video thumbnail"
                        fill
                        unoptimized={isRemoteUrl(item.thumb)}
                        className={`object-cover ${item.thumbPos || 'object-center'} opacity-80`}
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white ring-2 ring-white/40 group-hover:scale-110 transition-transform duration-300">
                        <PlayCircle size={30} />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-white/70 text-xs">
                        <Film size={12} />
                        <span>{tr('gallery.clickToPlay', 'Click to play')}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-bold text-sm leading-snug drop-shadow">{item.alt}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 p-4 md:p-10"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all z-50"
              onClick={() => setLightbox(null)}
            >
              <X size={22} />
            </button>

            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="relative max-w-5xl w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.type === 'image' ? (
                <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ paddingBottom: '66%' }}>
                  <Image
                    src={lightbox.src}
                    alt={lightbox.alt}
                    fill
                    unoptimized={isRemoteUrl(lightbox.src)}
                    className="object-contain"
                    sizes="90vw"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-5 rounded-b-2xl">
                    <p className="text-white font-semibold">{lightbox.alt}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-0 left-0 right-0 z-10 bg-linear-to-b from-black/70 to-transparent p-4 rounded-t-2xl pointer-events-none">
                    <p className="text-white font-semibold text-sm">{lightbox.alt}</p>
                  </div>
                  <video src={lightbox.src} poster={lightbox.thumb} className="w-full max-h-[80vh] rounded-2xl block" controls autoPlay playsInline />
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
