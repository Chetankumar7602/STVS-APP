"use client";

import { useLanguage } from '@/lib/useLanguage';
import { MapPin, Mail, Phone, BookOpen, Heart, Users, Home, Instagram, Youtube } from 'lucide-react';
import Image from 'next/image';
import { useSiteSettings } from '@/lib/useSiteSettings';

const DEFAULT_EMAIL = 'subudendrateerthavidyasamste@gmail.com';
const MAP_PIN_QUERY = '14.889333,75.560721';

function normalizePhoneForTel(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  if (raw.startsWith('tel:')) return raw;
  const digits = raw.replace(/[^+\d]/g, '');
  return digits ? `tel:${digits}` : '';
}

function buildMapsUrl(_mapsUrl, _address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_PIN_QUERY)}`;
}

export default function Footer() {
  const { t } = useLanguage();
  const { settings } = useSiteSettings();

  const address = String(settings.contact_address || t.footer?.contact?.addressValue || '').trim();
  const email = String(settings.contact_email || t.footer?.contact?.emailValue || DEFAULT_EMAIL).trim();
  const phonePrimary = String(settings.contact_phone_primary || t.footer?.contact?.phone1 || '').trim();
  const phoneSecondary = String(settings.contact_phone_secondary || t.footer?.contact?.phone2 || '').trim();
  const mapsHref = buildMapsUrl(settings.contact_maps_url, address);

  const instagramUrl = String(settings.social_instagram_url || '').trim();
  const youtubeUrl = String(settings.social_youtube_url || '').trim();

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

          {/* Column 1 – Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-slate-700 shadow-md">
                <Image 
                  src="/assets/Logo.jpg" 
                  alt="Organization Logo" 
                  width={44} 
                  height={44} 
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <h4 className="text-white font-bold text-base leading-tight">{t.footer.title}</h4>
                <p className="text-slate-500 text-xs mt-0.5">{t.footer.tagline}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t.footer.description}
            </p>

            {(instagramUrl || youtubeUrl) && (
              <div className="mt-6 flex items-center gap-3">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-slate-700 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                  >
                    <Instagram size={18} />
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-slate-700 flex items-center justify-center text-slate-300 hover:text-primary transition-colors"
                  >
                    <Youtube size={18} />
                  </a>
                )}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-medium">{t.footer.certifications.eighty_g}</span>
              <span className="text-xs bg-secondary/20 text-secondary px-3 py-1.5 rounded-full font-medium">{t.footer.certifications.twelve_a}</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full font-medium">{t.footer.certifications.csr}</span>
            </div>
          </div>

          {/* Column 2 – Contact */}
          <div>
            <h4 className="text-white font-bold mb-6 tracking-wide uppercase text-xs">{t.footer.contact.title}</h4>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t.footer.contact.address}</p>
                  {mapsHref ? (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-300 hover:text-primary transition-colors"
                    >
                      {address}
                    </a>
                  ) : (
                    <span className="text-sm text-slate-300">{address}</span>
                  )}
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t.footer.contact.email}</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm text-slate-300 hover:text-primary transition-colors break-all"
                  >
                    {email}
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone size={15} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{t.footer.contact.phone}</p>
                  <div className="flex flex-col gap-1">
                    {phonePrimary ? (
                      <a href={normalizePhoneForTel(phonePrimary)} className="text-sm text-slate-300 hover:text-primary transition-colors">{phonePrimary}</a>
                    ) : null}
                    {phoneSecondary ? (
                      <a href={normalizePhoneForTel(phoneSecondary)} className="text-sm text-slate-300 hover:text-primary transition-colors">{phoneSecondary}</a>
                    ) : null}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Column 3 – Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-wide">{t.footer.quickLinks.title}</h4>
            <div className="flex flex-col gap-3">
              {[
                { href: '/#about',   icon: BookOpen, label: t.footer.quickLinks.about },
                { href: '/#founder', icon: Heart,    label: t.footer.quickLinks.founder },
                { href: '/#donate',  icon: Heart,    label: t.footer.quickLinks.donate },
                { href: '/#contact', icon: Users,    label: t.footer.quickLinks.volunteer },
                { href: '/admin',    icon: Home,     label: t.footer.quickLinks.admin },
              ].map(({ href, icon: Icon, label }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-3 text-sm text-slate-400 hover:text-primary transition-colors group w-fit"
                >
                  <Icon size={14} className="shrink-0 text-slate-600 group-hover:text-primary transition-colors" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} {t.footer.title}. {t.footer.copyright}</p>
          <p className="text-center">{t.footer.registered}</p>
        </div>

      </div>
    </footer>
  );
}
