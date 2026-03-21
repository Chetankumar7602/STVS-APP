"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/useLanguage';
import { Award, BookOpen, Users, Heart, X, ArrowUpRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const featureIcons = {
  quality: BookOpen,
  affordable: Heart,
  teachers: Users,
  holistic: Award,
};

const featureConfig = [
  { key: 'quality', color: 'text-blue-600', bg: 'bg-blue-50', iconBg: 'bg-blue-100' },
  { key: 'affordable', color: 'text-rose-600', bg: 'bg-rose-50', iconBg: 'bg-rose-100' },
  { key: 'teachers', color: 'text-violet-600', bg: 'bg-violet-50', iconBg: 'bg-violet-100' },
  { key: 'holistic', color: 'text-amber-600', bg: 'bg-amber-50', iconBg: 'bg-amber-100' },
];

export default function About() {
  const { t } = useLanguage();
  const [activeCard, setActiveCard] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } },
  };

  const features = featureConfig.map((cfg) => ({
    ...cfg,
    icon: featureIcons[cfg.key],
    ...t.about.features[cfg.key],
  }));

  const active = activeCard !== null ? features[activeCard] : null;

  return (
    <section id="about" className="py-24 bg-white relative">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-block mb-4 px-4 py-1.5 bg-secondary/10 text-secondary font-semibold rounded-full text-sm">
              {t.about.mission}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 leading-tight">
              {t.about.title}
            </h2>
            <div className="w-20 h-1.5 bg-primary mb-8 rounded-full" />

            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              {t.about.intro} {t.about.description}
            </p>

            <p className="text-lg text-slate-600 leading-relaxed mb-10">
              {t.about.description2}
            </p>

            <a href="#impact" className="text-primary font-bold hover:text-secondary transition-colors inline-flex items-center gap-2 text-lg">
              {t.about.exploreImpact}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ margin: "-100px" }}
            className="grid sm:grid-cols-2 gap-6"
          >
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className={`relative ${feature.bg} p-8 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all group cursor-pointer`}
                  onClick={() => setActiveCard(index)}
                  whileHover={{ y: -3 }}
                >
                  <div className={`absolute top-4 right-4 w-7 h-7 rounded-full ${feature.iconBg} ${feature.color} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
                    <ArrowUpRight size={15} />
                  </div>

                  <div className={`w-14 h-14 bg-white rounded-xl flex items-center justify-center ${feature.color} shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.desc}</p>

                  <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${feature.color}`}>
                    <span>Learn more</span>
                    <ArrowUpRight size={12} />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setActiveCard(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden"
            >
              <div className={`${active.bg} px-8 pt-8 pb-6 relative`}>
                <button
                  onClick={() => setActiveCard(null)}
                  className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-slate-600 transition-all"
                >
                  <X size={18} />
                </button>
                <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center ${active.color} shadow mb-4`}>
                  <active.icon className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">{active.headline}</h2>
              </div>

              <div className="px-8 py-6">
                <p className="text-slate-600 leading-relaxed mb-6">{active.body}</p>
                <ul className="space-y-3">
                  {active.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <CheckCircle size={17} className={`${active.color} shrink-0 mt-0.5`} />
                      <span className="text-sm leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-8 pb-8">
                <button
                  onClick={() => setActiveCard(null)}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
