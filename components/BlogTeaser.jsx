"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Calendar, X, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function BlogTeaser() {
  const { tr } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categoryKeyMap = {
    All: 'all',
    'Impact Reports': 'impactReports',
    'School Updates': 'schoolUpdates',
    'Success Stories': 'successStories',
    'Community Events': 'communityEvents',
    General: 'general',
  };

  const getCategoryLabel = (category) => {
    const key = categoryKeyMap[category] || category.toLowerCase().replace(/\s+/g, '');
    return tr(`blogs.categories.${key}`, category);
  };

  const headerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.14,
        delayChildren: 0.04,
      },
    },
  };

  const badgeVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.96, filter: 'blur(6px)' },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 22, filter: 'blur(10px)' },
    show: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openModal = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/blogs', { cache: 'no-store' });
        const data = await readJsonResponse(res);

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load blogs.');
        }

        setPosts((data.data || []).slice(0, 3));
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <section className="py-24 bg-white relative overflow-hidden" id="blog">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.08, 0.03],
          rotate: [0, 90, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-primary rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.02, 0.06, 0.02],
          x: [0, 50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 -right-24 w-80 h-80 bg-secondary rounded-full blur-[100px] pointer-events-none"
      />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <motion.div
            variants={headerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, amount: 0.35 }}
            className="max-w-2xl"
          >
            <motion.div
              variants={badgeVariants}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 border border-primary/20 shadow-sm"
            >
              <BookOpen size={14} />
              {tr('blogs.recentUpdatesBadge', 'Recent Updates & Stories')}
            </motion.div>
            <motion.h2
              variants={titleVariants}
              className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight"
            >
              {tr('blogs.teaserTitlePrefix', 'Lately at')} <span className="text-primary">{tr('blogs.teaserTitleBrand', 'STVS Trust')}</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.35 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link
              href="/blog"
              className="group inline-flex items-center gap-2 text-slate-600 font-bold hover:text-primary transition-colors py-2 border-b-2 border-transparent hover:border-primary"
            >
              {tr('blogs.viewNewsroom', 'View Newsroom')}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-[420px] animate-pulse rounded-3xl border border-slate-100 bg-slate-100" />
              ))
            : posts.map((post, index) => (
                <motion.article
                  key={post._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, amount: 0.1 }}
                  transition={{
                    type: 'spring',
                    damping: 15,
                    stiffness: 100,
                    delay: index * 0.1,
                  }}
                  whileHover={{
                    y: -10,
                    transition: { duration: 0.1, ease: 'linear' },
                  }}
                  className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 flex flex-col group shadow-sm hover:shadow-2xl hover:shadow-primary/20"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-5 left-5">
                      <motion.span
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1, type: 'spring', stiffness: 200 }}
                        className="px-4 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm"
                      >
                        {getCategoryLabel(post.category)}
                      </motion.span>
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col relative bg-white">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold mb-5 uppercase tracking-wider">
                      <Calendar size={14} className="text-primary" />
                      {(() => {
                        const date = new Date(post.createdAt);
                        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                      })()}
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                      {post.title}
                    </h3>

                    <p className="text-slate-500 text-sm line-clamp-3 leading-relaxed mb-8">
                      {post.excerpt}
                    </p>

                    <button
                      onClick={() => openModal(post)}
                      className="mt-auto inline-flex items-center gap-2 text-primary font-bold text-sm group/btn overflow-hidden cursor-pointer"
                    >
                      <span className="relative">
                        {tr('blogs.readFullStory', 'Read Full Story')}
                        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover/btn:w-full"></span>
                      </span>
                      <motion.div
                        animate={{
                          x: [0, 8, 0],
                          scale: [1, 1.2, 1],
                        }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    </button>
                  </div>
                </motion.article>
              ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 flex justify-center"
        >
          <Link
            href="/blog"
            className="group inline-flex items-center gap-3 bg-white hover:bg-primary hover:text-white text-primary font-bold text-lg px-10 py-4 rounded-full border-2 border-primary shadow-lg hover:shadow-primary/30 transition-all duration-300"
          >
            <span>{tr('blogs.viewAllStories', 'View All News & Stories')}</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>

      <AnimatePresence>
        {isModalOpen && selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 z-10 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-lg rounded-full text-white md:text-slate-400 md:hover:text-primary transition-all cursor-pointer"
              >
                <X size={24} />
              </button>

              <div className="w-full md:w-2/5 h-64 md:h-auto relative">
                <Image
                  src={selectedPost.image}
                  alt={selectedPost.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden" />
                <div className="absolute bottom-6 left-6 md:hidden text-white">
                  <span className="px-3 py-1 bg-primary rounded-full text-[10px] font-bold uppercase tracking-wider">
                    {getCategoryLabel(selectedPost.category)}
                  </span>
                </div>
              </div>

              <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
                <div className="hidden md:block mb-8">
                  <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest">
                    {getCategoryLabel(selectedPost.category)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    {new Date(selectedPost.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    {selectedPost.author}
                  </div>
                </div>

                <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8 leading-tight">
                  {selectedPost.title}
                </h2>

                <div className="prose prose-slate max-w-none">
                  {selectedPost.content.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="text-slate-600 leading-relaxed mb-6 text-lg italic first-letter:text-4xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="mt-12 pt-12 border-t border-slate-100 flex justify-between items-center">
                  <Link href="/blog" className="text-primary font-bold hover:underline flex items-center gap-2" onClick={closeModal}>
                    {tr('blogs.exploreMoreStories', 'Explore More Stories')} <ArrowRight size={16} />
                  </Link>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest cursor-pointer">
                    {tr('blogs.closeStory', 'Close Story')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
