"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, X, ZoomIn, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { STATIC_GALLERY_MEDIA, isRemoteUrl, mapDbGalleryItems } from '@/lib/gallery';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function Gallery() {
  const { tr } = useLanguage();
  const [lightbox, setLightbox] = useState(null);
  const [media, setMedia] = useState(STATIC_GALLERY_MEDIA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch('/api/gallery');
        const data = await readJsonResponse(res);
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setMedia([...STATIC_GALLERY_MEDIA, ...mapDbGalleryItems(data.data)]);
        }
      } catch (err) {
        setMedia(STATIC_GALLERY_MEDIA);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 90, damping: 15 } },
  };

  if (loading) {
    return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{}}
            className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Camera size={32} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{}}
            className="text-4xl md:text-5xl font-bold text-slate-800 mb-4"
          >
            {tr('gallery.title', 'Community Service Through the Lens')}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{}}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-600"
          >
            {tr('gallery.subtitle', 'A Visual Journey of Impact & Vision')}
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ margin: '-80px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-[200px]"
        >
          {media.map((item, index) => (
            <motion.div
              key={item._id || item.src || index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, zIndex: 10 }}
              onClick={() => setLightbox(item)}
              className={`relative rounded-2xl overflow-hidden shadow-md group cursor-pointer bg-slate-900 ${item.className || 'md:col-span-1'}`}
            >
              {item.type === 'image' ? (
                <>
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    unoptimized={isRemoteUrl(item.src)}
                    className={`object-cover transition-transform duration-700 group-hover:scale-110 ${item.thumbPos || 'object-center'}`}
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-start justify-end p-4">
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                      <ZoomIn size={14} />
                      <span className="text-xs font-medium uppercase tracking-wide">{tr('gallery.viewFull', 'View Full')}</span>
                    </div>
                    <p className="text-white font-semibold text-sm leading-snug">{item.alt}</p>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 bg-black overflow-hidden">
                  {item.thumb && (
                    <Image
                      src={item.thumb}
                      alt="Video thumbnail"
                      fill
                      unoptimized={isRemoteUrl(item.thumb)}
                      className={`object-cover ${item.thumbPos || 'object-center'} opacity-80 transition-opacity duration-500`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white ring-2 ring-white/40 scale-90 group-hover:scale-105 transition-all duration-500">
                      <PlayCircle size={36} />
                    </div>
                    <span className="mt-3 text-white/80 text-xs font-medium tracking-wide">{tr('gallery.clickToWatch', 'Click to watch full video')}</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <p className="text-white font-bold text-sm leading-snug drop-shadow">{item.alt}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 md:p-10"
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all z-50"
              onClick={() => setLightbox(null)}
            >
              <X size={22} />
            </button>

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
                    <p className="text-white font-semibold">{lightbox.alt}</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <video
                    src={lightbox.src}
                    className="w-full max-h-[80vh] rounded-2xl block"
                    controls
                    autoPlay
                    playsInline
                    poster={lightbox.thumb}
                  />
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4 rounded-t-2xl pointer-events-none">
                    <p className="text-white font-semibold text-sm">{lightbox.alt}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
