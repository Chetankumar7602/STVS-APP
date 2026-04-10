"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const { t, language, changeLanguage, languages } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock page scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!langDropdownRef.current) return;
      if (!langDropdownRef.current.contains(event.target)) {
        setLangDropdownOpen(false);
      }
    };

    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [langDropdownOpen]);

  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    const element = document.getElementById(sectionId);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: 'smooth'
      });
    } else if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navigationLinks = [
    { sectionId: 'home', label: t.common.navigation.home },
    { sectionId: 'about', label: t.common.navigation.about },
    { sectionId: 'impact', label: t.common.navigation.impact },
    { sectionId: 'founder', label: t.common.navigation.founder },
    { sectionId: 'blog', label: t.common.navigation.blog },
    { sectionId: 'gallery', label: t.common.navigation.gallery },
  ];

  return (
    <>
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'backdrop-blur-xl bg-white/75 border-b border-white/40 shadow-[0_4px_30px_rgba(0,0,0,0.05)] py-3' : 'bg-transparent py-5'}`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        <Link href="/" onClick={(e) => scrollToSection(e, 'home')} className="flex items-center gap-3 z-50">
          <motion.div
            whileHover={{ scale: 1.08 }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden ring-2 ring-white/30 shadow-lg shrink-0"
          >
            <Image
              src="/assets/Logo.jpg"
              alt="STVS Logo"
              width={48}
              height={48}
              className="object-cover w-full h-full"
            />
          </motion.div>
          <div className={`flex flex-col transition-colors duration-300 ${isScrolled ? 'text-foreground' : 'text-white drop-shadow-md'}`}>
            <span className="font-bold text-sm md:text-base leading-tight max-w-50 md:max-w-none line-clamp-2">{t.common.header.primaryText}</span>
            <span className="text-xs opacity-90">{t.common.header.secondaryText}</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navigationLinks.map((link, index) => (
            <a
              key={index}
              href={`#${link.sectionId}`}
              onClick={(e) => scrollToSection(e, link.sectionId)}
              className={`text-sm font-medium transition-colors hover:text-secondary ${isScrolled ? 'text-slate-700' : 'text-white/90 drop-shadow-sm'}`}
            >
              {link.label}
            </a>
          ))}
          
          {/* Language Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-medium transition-all text-sm ${
                isScrolled 
                  ? 'text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer' 
                  : 'text-white bg-white/10 hover:bg-white/20 drop-shadow-sm cursor-pointer'
              }`}
            >
              <Globe size={16} />
              {languages.find(l => l.code === language)?.nativeName}
            </button>
            
            {langDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-w-37.5 z-50">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                      language === lang.code
                        ? 'bg-primary text-white font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <motion.a
            whileTap={{ scale: 0.95 }}
            href="#donate"
            onClick={(e) => scrollToSection(e, 'donate')}
            className="cursor-pointer bg-secondary hover:bg-secondary/90 text-white px-6 py-2.5 rounded-full font-medium transition-colors shadow-md hover:shadow-lg"
          >
            {t.common.header.donateNow}
          </motion.a>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className={`lg:hidden z-50 p-2 rounded-full transition-colors ${isScrolled ? 'text-slate-800' : 'text-white bg-black/20'}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Mobile Menu Overlay Toggle */}

      </div>
    </header>

    {/* Mobile Menu — rendered outside header so it's truly viewport-fixed */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 bg-white/80 backdrop-blur-2xl z-[9999] flex flex-col items-center justify-center p-6 lg:hidden shadow-xl overflow-y-auto"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Close button top-right */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {navigationLinks.map((link, index) => (
              <a
                key={index}
                href={`#${link.sectionId}`}
                onClick={(e) => scrollToSection(e, link.sectionId)}
                className="text-xl font-medium text-slate-800 hover:text-primary transition-colors py-2 border-b border-slate-100 w-full text-center"
              >
                {link.label}
              </a>
            ))}

            {/* Language selector */}
            <div className="w-full mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm font-semibold text-slate-600 mb-3">{t.admin.selectLanguage}</p>
              <div className="flex gap-2 w-full">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg transition-all text-sm font-medium cursor-pointer ${
                      language === lang.code
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            </div>

            <motion.a
              whileTap={{ scale: 0.95 }}
              href="#donate"
              onClick={(e) => scrollToSection(e, 'donate')}
              className="mt-4 bg-primary text-white w-full py-4 rounded-full font-bold text-center shadow-lg transition-colors text-lg"
            >
              {t.common.header.donateNow}
            </motion.a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
