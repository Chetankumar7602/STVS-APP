"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Heart, MessageSquare, HandHeart, LogOut, Camera, BookOpen, Settings, Menu, X, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tr } = useLanguage();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthPage = pathname === '/admin/login' || pathname.startsWith('/admin/forgot-password');

  const navItems = [
    { href: '/admin', label: tr('admin.nav.dashboard', 'Dashboard'), icon: <LayoutDashboard size={20} /> },
    { href: '/admin/donations', label: tr('admin.nav.donations', 'Donations'), icon: <Heart size={20} /> },
    { href: '/admin/blogs', label: tr('admin.nav.blogs', 'Blogs'), icon: <BookOpen size={20} /> },
    { href: '/admin/gallery', label: tr('admin.nav.gallery', 'Gallery'), icon: <Camera size={20} /> },
    { href: '/admin/cms', label: tr('admin.nav.cms', 'CMS Settings'), icon: <Settings size={20} /> },
    { href: '/admin/contacts', label: tr('admin.nav.messages', 'Messages'), icon: <MessageSquare size={20} /> },
    { href: '/admin/volunteers', label: tr('admin.nav.volunteers', 'Volunteers'), icon: <HandHeart size={20} /> },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      router.push('/');
      router.refresh();
    }
  };

  useEffect(() => {
    if (isAuthPage) return;
    setMobileNavOpen(false);
  }, [pathname, isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;
    if (!mobileNavOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileNavOpen, isAuthPage]);

  useEffect(() => {
    if (isAuthPage) return;

    let isUnmounted = false;

    const verifySession = async () => {
      try {
        const res = await fetch('/api/admin/session', { cache: 'no-store' });
        if (res.status === 403 && !isUnmounted) {
          window.location.href = '/';
          return;
        }
        if (res.status === 401 && !isUnmounted) {
          window.location.href = '/admin/login?reason=session_revoked';
        }
      } catch {
        // Ignore transient network issues; next poll will retry.
      }
    };

    // Immediate check plus fast periodic heartbeat so revoked sessions logout quickly.
    verifySession();
    const intervalId = window.setInterval(verifySession, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifySession();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isUnmounted = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthPage]);

  // Don't show sidebar on auth pages
  if (isAuthPage) {
    return <div className="admin-portal min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="admin-portal min-h-screen bg-slate-50 lg:flex lg:h-screen lg:overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex lg:h-full">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-white flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 shadow-lg shrink-0"
            >
              <Image 
                src="/assets/Logo.jpg" 
                alt="Logo" 
                width={36} 
                height={36} 
                className="object-cover w-full h-full"
              />
            </motion.div>
            {tr('admin.portalTitle', 'Admin Portal')}
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive
                    ? 'bg-primary text-white font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 mt-auto">
          <Link
            href="/"
            className="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Home size={20} />
            {tr('admin.actions.goToPublicPage', 'Go to Public Page')}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors cursor-pointer"
          >
            <LogOut size={20} />
            {tr('admin.actions.logout', 'Logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shrink-0">
            <Image
              src="/assets/Logo.jpg"
              alt="Logo"
              width={32}
              height={32}
              className="object-cover w-full h-full"
            />
          </span>
          {tr('admin.portalTitle', 'Admin Portal')}
        </h1>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile Drawer (top-slide fullscreen, mirrors main page behavior) */}
      <AnimatePresence>
        {mobileNavOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 z-9999 bg-slate-900 lg:hidden overflow-y-auto"
          >
            <div className="flex min-h-full flex-col px-4 pb-6 pt-5 md:pt-3">
              {/* Mobile-only header alignment/sizing: logo, title, and close button */}
              <div className="flex min-h-10 items-center justify-between gap-3 md:min-h-12">
                {/* Mobile-only sidebar header spacing between logo and title; md+ unchanged. */}
                <div className="flex min-w-0 items-center gap-3 md:gap-3">
                  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-700 md:h-10 md:w-10">
                    <Image
                      src="/assets/Logo.jpg"
                      alt="Logo"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </span>
                  <h2 className="truncate text-sm font-semibold text-white md:text-base">{tr('admin.portalTitle', 'Admin Portal')}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-slate-100 hover:bg-white/20 md:h-11 md:w-11"
                  aria-label="Close navigation menu"
                >
                  <X size={18} className="md:h-5.5 md:w-5.5" />
                </button>
              </div>
              {/* Mobile-only spacing before the separator line under the sidebar header */}
              <div className="mb-4 mt-3 border-b border-slate-700 md:mb-5 md:mt-2" />

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      // Mobile-only non-selected option text stays bright without highlight/background; md+ keeps existing styling.
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors ${
                        isActive
                          ? 'bg-primary text-white font-medium'
                          : 'bg-transparent text-white hover:bg-transparent hover:text-white md:bg-slate-800/40 md:text-slate-200/95 md:hover:bg-slate-800'
                      }`}
                    >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>

              <div className="mt-auto pt-6">
                <Link
                  href="/"
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-600 bg-transparent px-4 py-3 text-base font-semibold text-white hover:bg-slate-800"
                >
                  <Home size={18} />
                  {tr('admin.actions.goToPublicPage', 'Go to Public Page')}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-base font-semibold text-white hover:bg-red-700"
                >
                  <LogOut size={18} />
                  {tr('admin.actions.logout', 'Logout')}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
