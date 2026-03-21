"use client";

import { motion } from 'framer-motion';
import { siteData } from '@/lib/data';
import { Quote } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/lib/useLanguage';

export default function Founder() {
  const { founder } = siteData;
  const { tr } = useLanguage();

  return (
    <section id="founder" className="py-24 bg-slate-50 relative">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ }}
            className="text-primary font-bold tracking-widest uppercase text-sm mb-2 block"
          >
            {tr('founder.leadership', 'Leadership')}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ }}
            className="text-4xl md:text-5xl font-bold text-slate-800"
          >
            {tr('founder.title', founder.sectionTitle)}
          </motion.h2>
          <motion.div 
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ }}
            className="w-24 h-1.5 bg-secondary mx-auto mt-6 rounded-full"
          ></motion.div>
        </div>

        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden shadow-slate-200/50">
          <div className="grid md:grid-cols-5 items-stretch">
            
            <div className="md:col-span-2 relative min-h-[400px] md:min-h-full bg-slate-200 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent z-10 flex items-end p-8">
                <div>
                  <h3 className="text-3xl font-bold text-white shadow-sm">{tr('founder.name', founder.name)}</h3>
                  <p className="text-white/90 font-medium text-lg mt-1">{tr('founder.role', 'Visionary & Founder')}</p>
                </div>
              </div>
              <div className="absolute inset-0">
                <Image src="/assets/MyImg.jpeg" alt={founder.name} fill className="object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10 pointer-events-none"></div>
              </div>
            </div>
            
            <div className="md:col-span-3 p-10 md:p-14 relative flex flex-col justify-center">
              <Quote className="absolute top-10 right-10 w-24 h-24 text-slate-100 -rotate-12 z-0" />
              
              <div className="relative z-10">
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ }}
                  transition={{ delay: 0.2 }}
                  className="text-xl md:text-2xl font-light text-slate-700 leading-relaxed mb-8 italic"
                >
                  "{tr('founder.quote', "True education is not a privilege for the few, but a fundamental right for all. When we empower a child with knowledge, we don't just change one life, we uplift an entire generation. Subudhendra Teertha Vidya Samaste is my commitment to this belief.")}"
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4 text-slate-600"
                >
                  <p>
                    {tr('founder.paragraph1', `Driven by a profound passion for societal progress, ${founder.name} established this institution with a singular, unwavering focus: to break the cycle of poverty through high-quality, English-medium education.`)}
                  </p>
                  <p>
                    {tr('founder.paragraph2', 'His visionary leadership continues to guide the Trust in its mission to bring world-class educational opportunities to the most disadvantaged communities in Haveri district, transforming raw potential into future leaders.')}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 pt-8 border-t border-slate-100"
                >
                  <h4 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                    </span>
                    {tr('founder.achievementsTitle', 'Recognition & Achievements')}
                  </h4>
                  <ul className="space-y-4">
                    {[
                      tr('founder.achievements.0', 'National Award for Excellence in Social Service (2022)'),
                      tr('founder.achievements.1', 'Recognized by nine trustees for his community service and awarded state-level honors'),
                      tr('founder.achievements.2', 'Featured in Vijay Karnataka newspaper (2022)'),
                      tr('founder.achievements.3', 'Honorary Doctorate in Social Work (2021)')
                    ].map((achievement, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-600 leading-relaxed text-sm md:text-base">
                        <span className="text-primary shrink-0 mt-1">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </span>
                        {achievement}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
