"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Camera, Film, Images } from 'lucide-react';
import { useEffect, useState } from 'react';
import { STATIC_GALLERY_PREVIEW, isRemoteUrl } from '@/lib/gallery';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function GalleryTeaser() {
  const { tr } = useLanguage();
  const [dynamicCount, setDynamicCount] = useState(0);
  const [previewItems, setPreviewItems] = useState(STATIC_GALLERY_PREVIEW);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const res = await fetch('/api/gallery');
        const data = await readJsonResponse(res);
        if (!data.success || !Array.isArray(data.data) || data.data.length === 0) return;

        const allImages = data.data
          .filter((item) => (item?.type || 'image') === 'image')
          .map((item) => ({ src: String(item?.src || '').trim(), pos: 'object-center' }))
          .filter((item) => Boolean(item.src));

        const images = allImages.slice(0, STATIC_GALLERY_PREVIEW.length);

        setDynamicCount(allImages.length);
        if (images.length > 0) {
          const merged = [...images];
          if (merged.length < STATIC_GALLERY_PREVIEW.length) {
            merged.push(...STATIC_GALLERY_PREVIEW.slice(merged.length));
          }
          setPreviewItems(merged);
        }
      } catch (err) {
        console.error('Teaser gallery fetch failed:', err);
      }
    }
    fetchGallery();
  }, []);

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden" id="gallery">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{}}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest px-5 py-2 rounded-full border border-primary/20 mb-6"
          >
            <Camera size={13} />
            {tr('gallery.visualJourney', 'Visual Journey')}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{}}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-slate-800 mb-5 leading-tight"
          >
            {tr('gallery.teaserTitleLine1', 'Community Service')}
            <span className="block text-primary">{tr('gallery.teaserTitleLine2', 'Through the Lens')}</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{}}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-lg"
          >
            {tr('gallery.teaserSubtitle', 'Candid moments, milestones, and community impact captured as they happened.')}
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ margin: '-80px' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
          className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-12 auto-rows-[130px] md:auto-rows-[170px]"
        >
          {previewItems.map((img, i) => (
            <motion.div
              key={`${img.src}-${i}`}
              variants={{
                hidden: { opacity: 0, scale: 0.9, y: 20 },
                show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 14 } },
              }}
              className={`relative rounded-xl overflow-hidden group shadow-sm ring-1 ring-slate-200 ${
                i === 0 ? 'col-span-2 row-span-2' :
                i === 4 ? 'col-span-2' : 'col-span-1'
              }`}
            >
              <Image
                src={img.src}
                alt=""
                fill
                unoptimized={isRemoteUrl(img.src)}
                className={`object-cover ${img.pos} transition-transform duration-700 group-hover:scale-110`}
                sizes="(max-width: 768px) 33vw, 16vw"
              />
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}

          <motion.div
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.6 } } }}
            className="col-span-1 rounded-xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center gap-2 text-primary/60"
          >
            <Images size={22} />
            <span className="text-xs font-medium text-center leading-tight px-2">
              {dynamicCount > 0 ? `${dynamicCount}+ ${tr('gallery.newPhotos', 'new photos')}` : tr('gallery.defaultPhotos', '20+ photos')} &<br />{tr('gallery.oneVideo', '1 video')}
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-8 mb-12 text-slate-500 text-sm"
        >
          {[
            { icon: Images, label: tr('gallery.stats.photos', '20+ Photos') },
            { icon: Film, label: tr('gallery.stats.video', '1 Video Message') },
            { icon: Camera, label: tr('gallery.stats.moments', 'Real Moments') },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon size={16} className="text-secondary" />
              <span>{label}</span>
            </div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{}}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Link
            href="/gallery"
            className="group inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white font-bold text-lg px-10 py-4 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.04] active:scale-100 transition-all duration-300"
          >
            <span>{tr('gallery.exploreFullGallery', 'Explore Full Gallery')}</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
