"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, MessageSquare, HandHeart } from 'lucide-react';
import { useLanguage } from '@/lib/useLanguage';
import { useSiteSettings } from '@/lib/useSiteSettings';

const DEFAULT_EMAIL = 'subudendrateerthavidyasamste@gmail.com';

function buildMapsUrl(mapsUrl, address) {
  const trimmed = String(mapsUrl || '').trim();
  if (trimmed) return trimmed;
  const addressText = String(address || '').trim();
  if (!addressText) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;
}

export default function ContactVolunteer() {
  const { tr } = useLanguage();
  const { settings } = useSiteSettings();
  const [contactData, setContactData] = useState({ name: '', contact: '', message: '' });
  const [volData, setVolData] = useState({ name: '', phone: '', interest: '' });
  
  const [contactStatus, setContactStatus] = useState({ loading: false, success: false, error: '' });
  const [volStatus, setVolStatus] = useState({ loading: false, success: false, error: '' });

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactStatus({ loading: true, success: false, error: '' });

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData),
      });

      if (res.ok) {
        setContactStatus({ loading: false, success: true, error: '' });
        setContactData({ name: '', contact: '', message: '' });
        setTimeout(() => setContactStatus(s => ({ ...s, success: false })), 5000);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (err) {
      setContactStatus({ loading: false, success: false, error: tr('involved.contact.error', 'Failed to send message. Please try again.') });
    }
  };

  const handleVolSubmit = async (e) => {
    e.preventDefault();
    setVolStatus({ loading: true, success: false, error: '' });

    try {
      const res = await fetch('/api/volunteers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(volData),
      });

      if (res.ok) {
        setVolStatus({ loading: false, success: true, error: '' });
        setVolData({ name: '', phone: '', interest: '' });
        setTimeout(() => setVolStatus(s => ({ ...s, success: false })), 5000);
      } else {
        throw new Error('Failed to submit');
      }
    } catch (err) {
      setVolStatus({ loading: false, success: false, error: tr('involved.volunteer.error', 'Failed to submit. Please try again.') });
    }
  };

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-100">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4">{tr('involved.title', 'Get Involved')}</h2>
          <div className="w-20 h-1.5 bg-secondary mx-auto rounded-full mb-6"></div>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            {tr('involved.subtitle', "There are many ways to support our mission. Whether you want to volunteer your time, or just have a question, we'd love to hear from you.")}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          
          {/* Volunteer Form */}
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <HandHeart size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{tr('involved.volunteer.title', 'Become a Volunteer')}</h3>
            </div>
            
            <form onSubmit={handleVolSubmit} className="space-y-5">
              {volStatus.success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium">
                  {tr('involved.volunteer.success', 'Thank you! We will reach out to you soon.')}
                </div>
              )}
              {volStatus.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium">
                  {volStatus.error}
                </div>
              )}
              
              <div>
                <input
                  type="text"
                  required
                  placeholder={tr('involved.volunteer.fullName', 'Full Name')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all outline-none"
                  value={volData.name}
                  onChange={(e) => setVolData({...volData, name: e.target.value})}
                />
              </div>
              
              <div>
                <input
                  type="tel"
                  required
                  placeholder={tr('involved.volunteer.phone', 'Phone Number')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all outline-none"
                  value={volData.phone}
                  onChange={(e) => setVolData({...volData, phone: e.target.value})}
                />
              </div>
              
              <div>
                <select
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all outline-none appearance-none"
                  value={volData.interest}
                  onChange={(e) => setVolData({...volData, interest: e.target.value})}
                >
                  <option value="" disabled>{tr('involved.volunteer.areaPlaceholder', 'Area of Interest...')}</option>
                  <option value="Teaching">{tr('involved.volunteer.interests.teaching', 'Teaching / Tutoring')}</option>
                  <option value="Event Organization">{tr('involved.volunteer.interests.events', 'Event Organization')}</option>
                  <option value="Fundraising">{tr('involved.volunteer.interests.fundraising', 'Fundraising')}</option>
                  <option value="IT Support">{tr('involved.volunteer.interests.it', 'IT / Technical Support')}</option>
                  <option value="Other">{tr('involved.volunteer.interests.other', 'Other')}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={volStatus.loading}
                className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center"
              >
                {volStatus.loading ? tr('common.loadingSubmitting', 'Submitting...') : tr('involved.volunteer.joinButton', 'Join our Community')}
              </button>
            </form>
          </motion.div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">{tr('involved.contact.title', 'Contact Us')}</h3>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-5">
              {contactStatus.success && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 font-medium">
                  {tr('involved.contact.success', 'Message sent successfully!')}
                </div>
              )}
              {contactStatus.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 font-medium">
                  {contactStatus.error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder={tr('involved.contact.name', 'Name')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all outline-none"
                  value={contactData.name}
                  onChange={(e) => setContactData({...contactData, name: e.target.value})}
                />
                <input
                  type="text"
                  required
                  placeholder={tr('involved.contact.emailOrPhone', 'Email or Phone')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all outline-none"
                  value={contactData.contact}
                  onChange={(e) => setContactData({...contactData, contact: e.target.value})}
                />
              </div>
              
              <textarea
                required
                rows="4"
                placeholder={tr('involved.contact.messagePlaceholder', 'How can we help you?')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all outline-none resize-none"
                value={contactData.message}
                onChange={(e) => setContactData({...contactData, message: e.target.value})}
              ></textarea>

              <button
                type="submit"
                disabled={contactStatus.loading}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {contactStatus.loading ? tr('common.loadingSending', 'Sending...') : (
                  <>{tr('involved.contact.send', 'Send Message')} <Send size={18} /></>
                )}
              </button>
            </form>
          </motion.div>
          
        </div>

        {/* Contact Info Footer-ish */}
        <div className="grid md:grid-cols-3 gap-8 mt-16 pt-16 border-t border-slate-200">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="text-slate-800" size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">{tr('involved.visitUs', 'Visit Us')}</p>
              {(() => {
                const address = String(settings.contact_address || 'Hosaritti, Haveri Dist., Karnataka, India').trim();
                const mapsHref = buildMapsUrl(settings.contact_maps_url, address);
                return mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {address}
                  </a>
                ) : (
                  <p>{address}</p>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <Phone className="text-slate-800" size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">{tr('involved.callUs', 'Call Us')}</p>
              {(() => {
                const phone = String(settings.contact_phone_primary || settings.contact_phone_secondary || '+91 96320 42844').trim();
                const tel = phone.replace(/[^+\d]/g, '');
                return (
                  <a href={tel ? `tel:${tel}` : '#'} className="hover:text-primary transition-colors">
                    {phone}
                  </a>
                );
              })()}
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <Mail className="text-slate-800" size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800">{tr('involved.emailUs', 'Email Us')}</p>
              {(() => {
                const email = String(settings.contact_email || DEFAULT_EMAIL).trim();
                return (
                  <a href={`mailto:${email}`} className="hover:text-primary transition-colors break-all text-sm">{email}</a>
                );
              })()}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
