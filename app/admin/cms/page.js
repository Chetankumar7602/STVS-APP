"use client";

import { useState, useEffect } from 'react';
import { Save, Loader2, BarChart, Phone, Mail, MapPin, Instagram, Youtube } from 'lucide-react';
import { readJsonResponse } from '@/lib/response';
import { useLanguage } from '@/lib/useLanguage';

export default function CMSManager() {
  const { tr } = useLanguage();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await readJsonResponse(res);
      if (data.success) setSettings(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateMany = async (entries) => {
    if (!Array.isArray(entries) || entries.length === 0) return;

    setSaving(true);

    try {
      await Promise.all(
        entries.map(async ({ key, value }) => {
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
          });
          const data = await readJsonResponse(res);
          if (!data.success) {
            throw new Error(data.error || data.message || `Failed to update ${key}`);
          }
        })
      );

      setSettings((current) => {
        const next = { ...(current || {}) };
        entries.forEach(({ key, value }) => {
          next[key] = value;
        });
        return next;
      });

      setMsg(tr('admin.cms.updatedKey', 'Updated'));
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tr('admin.cms.title', 'Content Management')}</h1>
          <p className="text-slate-500 mt-1">{tr('admin.cms.subtitle', 'Update site text, impact numbers, and configuration.')}</p>
        </div>
        {msg && <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 text-sm font-medium animate-pulse">{msg}</span>}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Impact Numbers Section */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <BarChart size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{tr('admin.cms.impactStats', 'Impact Statistics')}</h2>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.studentsSupported', 'Students Supported')}</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  value={settings.students_count || 500}
                  onChange={(e) => setSettings({...settings, students_count: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.villagesImpacted', 'Villages Impacted')}</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  value={settings.villages_count || 12}
                  onChange={(e) => setSettings({...settings, villages_count: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={() => {
                handleUpdateMany([
                  { key: 'students_count', value: settings.students_count },
                  { key: 'villages_count', value: settings.villages_count },
                ]);
              }}
              disabled={saving}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {tr('admin.cms.saveImpactNumbers', 'Save Impact Numbers')}
            </button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <Phone size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{tr('admin.cms.contactDetails', 'Contact Details')}</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.contactPhonePrimary', 'Phone (Primary)')}</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/20 outline-none"
                value={settings.contact_phone_primary || ''}
                onChange={(e) => setSettings({ ...settings, contact_phone_primary: e.target.value })}
                placeholder="+91 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.contactPhoneSecondary', 'Phone (Secondary)')}</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/20 outline-none"
                value={settings.contact_phone_secondary || ''}
                onChange={(e) => setSettings({ ...settings, contact_phone_secondary: e.target.value })}
                placeholder="+91 ..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.contactEmail', 'Email')}</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/20 outline-none"
                value={settings.contact_email || ''}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.contactAddress', 'Address')}</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/20 outline-none resize-none"
                value={settings.contact_address || ''}
                onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                placeholder={tr('admin.cms.contactAddressPlaceholder', 'Street, City, State, Country')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.contactMapsUrl', 'Google Maps Link')}</label>
              <input
                type="url"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-secondary/20 outline-none"
                value={settings.contact_maps_url || ''}
                onChange={(e) => setSettings({ ...settings, contact_maps_url: e.target.value })}
                placeholder="https://www.google.com/maps/..."
              />
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                <MapPin size={14} />
                {tr('admin.cms.contactMapsHint', 'If empty, we will generate a Google Maps search link from the address.')}
              </p>
            </div>

            <button
              onClick={() =>
                handleUpdateMany([
                  { key: 'contact_phone_primary', value: settings.contact_phone_primary || '' },
                  { key: 'contact_phone_secondary', value: settings.contact_phone_secondary || '' },
                  { key: 'contact_email', value: settings.contact_email || '' },
                  { key: 'contact_address', value: settings.contact_address || '' },
                  { key: 'contact_maps_url', value: settings.contact_maps_url || '' },
                ])
              }
              disabled={saving}
              className="w-full py-4 bg-secondary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {tr('admin.cms.saveContactDetails', 'Save Contact Details')}
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Mail size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{tr('admin.cms.socialLinks', 'Footer Social Links')}</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.instagramUrl', 'Instagram URL')}</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                  <Instagram size={18} />
                </div>
                <input
                  type="url"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  value={settings.social_instagram_url || ''}
                  onChange={(e) => setSettings({ ...settings, social_instagram_url: e.target.value })}
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{tr('admin.cms.youtubeUrl', 'YouTube URL')}</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
                  <Youtube size={18} />
                </div>
                <input
                  type="url"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                  value={settings.social_youtube_url || ''}
                  onChange={(e) => setSettings({ ...settings, social_youtube_url: e.target.value })}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            <button
              onClick={() =>
                handleUpdateMany([
                  { key: 'social_instagram_url', value: settings.social_instagram_url || '' },
                  { key: 'social_youtube_url', value: settings.social_youtube_url || '' },
                ])
              }
              disabled={saving}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {tr('admin.cms.saveSocialLinks', 'Save Social Links')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
