"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, User, ArrowRight, BookOpen, X } from 'lucide-react';
import Image from 'next/image';
import { getBlogCategories } from '@/lib/blogs';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function BlogPage() {
  const { tr } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categories = getBlogCategories(posts);
  const filteredPosts = filter === 'All' ? posts : posts.filter((post) => post.category === filter);

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

  const openModal = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/blogs', { cache: 'no-store' });
        const data = await readJsonResponse(res);

        if (!res.ok || !data.success) {
          throw new Error(data.message || tr('blogs.failedToLoad', 'Failed to load blogs.'));
        }

        setPosts(data.data || []);
      } catch (err) {
        setError(err.message || tr('blogs.failedToLoad', 'Failed to load blogs.'));
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, []);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        closeModal();
      }
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
    <main className="min-h-screen bg-slate-50 pt-24 pb-20">
      <section className="container mx-auto px-4 md:px-6 mb-16">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold mb-6"
          >
            <BookOpen size={16} />
            {tr('blogs.newsroomBadge', 'Newsroom & Success Stories')}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight"
          >
            {tr('blogs.pageTitleLine1', 'Empowering the Future,')} <br />
            <span className="text-primary">{tr('blogs.pageTitleLine2', 'One Story at a Time.')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-600 leading-relaxed"
          >
            {tr('blogs.pageSubtitle', 'Explore our latest updates, success stories of our students, and the impact our community is making across villages.')}
          </motion.p>
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6 mb-12">
        <div className="flex flex-wrap gap-3 items-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2.5 rounded-full font-semibold transition-all text-sm border ${
                filter === cat
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary'
              }`}
            >
              {getCategoryLabel(cat)}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 md:px-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="flex min-h-48 items-center justify-center text-slate-500">{tr('blogs.loadingStories', 'Loading stories...')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post, index) => (
              <motion.article
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
              >
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-4 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
                      {getCategoryLabel(post.category)}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {new Date(post.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User size={14} className="text-primary" /> {post.author}</span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {post.title}
                  </h2>

                  <p className="text-slate-600 text-sm mb-8 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                    <button onClick={() => openModal(post)} className="text-slate-900 font-bold text-sm flex items-center gap-2 group/btn cursor-pointer">
                      {tr('blogs.seeFullStory', 'See Full Story')}
                      <ArrowRight size={16} className="text-primary group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

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
                <Image src={selectedPost.image} alt={selectedPost.title} fill className="object-cover" />
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
                  {selectedPost.content.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="text-slate-600 leading-relaxed mb-6 text-lg italic first-letter:text-4xl first-letter:font-bold first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="mt-12 pt-12 border-t border-slate-100 flex justify-end items-center">
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest cursor-pointer">
                    {tr('blogs.closeStory', 'Close Story')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
