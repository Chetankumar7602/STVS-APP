"use client";

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useLanguage } from '@/lib/useLanguage';

export default function Hero() {
  const { t } = useLanguage();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });

  const yBackground = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacityText = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const yText = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const scrollToDonate = (e) => {
    e.preventDefault();
    const element = document.getElementById('donate');
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section
      id="home"
      ref={ref}
      className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-primary"
    >
      {/* Background Graphic Elements */}
      <motion.div
        style={{ y: yBackground }}
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ opacity: opacityText, y: yText }}
        className="container mx-auto px-4 z-10 text-center flex flex-col items-center mt-20"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 inline-block"
        >
          <span className="px-5 py-2 rounded-full bg-white/10 text-accent font-medium text-sm tracking-wider uppercase border border-white/20 backdrop-blur-sm">
            {t.hero.subtitle}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-white max-w-4xl mx-auto leading-tight md:leading-tight mb-10 text-balance"
        >
          {t.hero.heading}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <a
            href="#donate"
            onClick={scrollToDonate}
            className="group relative px-8 py-4 bg-secondary text-white font-bold text-lg rounded-full overflow-hidden shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {t.hero.primaryCta}
            </span>
            <div className="absolute inset-0 h-full w-full scale-0 rounded-full transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20 z-0"></div>
          </a>
          <a
            href="#about"
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-full backdrop-blur-sm border border-white/20 transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            {t.common.header.learnMore}
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10"
      >
        <span className="text-white/60 text-sm uppercase tracking-widest font-medium">{t.hero.scroll}</span>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1"
        >
          <div className="w-1.5 h-3 bg-white/60 rounded-full"></div>
        </motion.div>
      </motion.div>

      {/* Decorative bottom curve */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-background custom-shape-divider-bottom" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)' }}></div>
    </section>
  );
}
