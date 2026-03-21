"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Heart, MessageSquare, HandHeart, LogOut, Camera, BookOpen, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/lib/useLanguage';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tr } = useLanguage();

  // Don't show sidebar on login page
  if (pathname === '/admin/login') {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

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

  return (
    <div className="h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-auto md:h-full shrink-0">
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
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 w-full transition-colors cursor-pointer"
          >
            <LogOut size={20} />
            {tr('admin.actions.logout', 'Logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
