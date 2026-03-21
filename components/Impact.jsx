"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { siteData } from '@/lib/data';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

function Counter({ end, suffix = "", duration = 2.5 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      let startTime;
      let animationFrame;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / (duration * 1000);
        
        if (progress < 1) {
          setCount(Math.floor(end * progress));
          animationFrame = requestAnimationFrame(animate);
        } else {
          setCount(end);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [end, duration, isInView]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}{suffix}
    </span>
  );
}

export default function Impact() {
  const { impact } = siteData;
  const { tr } = useLanguage();
  const [dynamicStats, setDynamicStats] = useState(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await readJsonResponse(res);
        if (data.success) {
          setDynamicStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch impact stats:', err);
      }
    }
    fetchSettings();
  }, []);

  const stats = [
    { value: 100, suffix: "%", label: tr('impact.stats.freeEducation', 'Free Education') },
    { value: 9, suffix: ` ${tr('impact.stats.yearsSuffix', 'Years')}`, label: tr('impact.stats.schooling', 'of Schooling (LKG - 8th)') },
    { value: dynamicStats?.students_count || 500, suffix: "+", label: tr('impact.stats.students', 'Students to Be Enrolled') },
    { value: dynamicStats?.villages_count || 12, suffix: "+", label: tr('impact.stats.villages', 'Villages to Be Impacted') }
  ];

  return (
    <section id="impact" className="py-24 relative bg-primary text-white overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full border-[20px] border-white"></div>
        <div className="absolute top-40 left-10 w-40 h-40 rounded-full border-[10px] border-white"></div>
        <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full border-[15px] border-secondary"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-4 block">{tr('impact.byNumbers', 'By the Numbers')}</span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">{tr('impact.title', impact.title)}</h2>
            <div className="w-24 h-1 bg-secondary mx-auto rounded-full"></div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-black text-white mb-4 drop-shadow-md">
                <Counter end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-lg md:text-xl font-medium text-white/90">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
