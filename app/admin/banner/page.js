"use client";

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Megaphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/useLanguage';

export default function BannerManagement() {
  const { tr } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [playAnimationTrigger, setPlayAnimationTrigger] = useState(0);

  // Simulate frontend state for preview
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const [settings, setSettings] = useState({
    isActive: false,
    message: '',
    duration: 0,
    expandedContent: '',
    mediaType: 'none',
    mediaUrl: '',
    position: 'top',
    shape: 'sharp',
    size: 'medium',
    animation: 'slide',
    backgroundColor: '#ef4444',
    textColor: '#ffffff'
  });

  useEffect(() => {
    fetch('/api/admin/banner')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSettings(prev => ({ ...prev, ...data.data }));
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/admin/banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const result = await res.json();
      if (result.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    }
    setSaving(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'animation' || name === 'position') {
      setPlayAnimationTrigger(prev => prev + 1);
    }
  };

  const getVariants = () => {
    switch (settings.animation) {
      case 'fade':
        return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
      case 'pop':
        return { hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 15 } } };
      case 'bounce':
        return {
          hidden: { opacity: 0, y: settings.position.includes('top') ? -100 : settings.position === 'center-modal' ? -50 : 100 },
          visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 10 } }
        };
      default: // 'slide'
        return {
          hidden: { opacity: 0, y: settings.position.includes('top') || settings.position === 'center-modal' ? -50 : 50 },
          visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.4 } }
        };
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 animate-pulse">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <div className="h-8 w-48 bg-slate-200/60 rounded mb-2"></div>
            <div className="h-4 w-64 bg-slate-200/60 rounded"></div>
          </div>
          <div className="h-10 w-32 bg-slate-200/60 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-5">
            <div className="h-10 w-full bg-slate-200/60 rounded-xl"></div>
            <div className="h-10 w-full bg-slate-200/60 rounded-xl"></div>
            <div className="h-10 w-full bg-slate-200/60 rounded-xl"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 w-full bg-slate-200/60 rounded-xl"></div>
              <div className="h-10 w-full bg-slate-200/60 rounded-xl"></div>
            </div>
          </div>
          <div className="sticky top-8 bg-slate-100/50 p-6 rounded-3xl border border-slate-200 h-[600px] w-full flex items-center justify-center">
             <div className="w-1/2 h-24 bg-slate-200/60 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasExpandableContent = settings.expandedContent.trim() !== '' || (settings.mediaType !== 'none' && settings.mediaUrl.trim() !== '');

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-800">
          <Megaphone className="text-primary" /> {tr('admin.banner.title', 'Floating Banner Settings')}
        </h1>
        <p className="text-slate-500 mt-2">{tr('admin.banner.subtitle', 'Manage the floating announcement banner and its expandable rich-media pop-up.')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-8">
          <h2 className="text-lg font-semibold border-b pb-4 flex justify-between items-center text-slate-800">
            {tr('admin.banner.basicsLayout', 'Basics & Layout')}
            <label className="flex items-center gap-2 cursor-pointer text-sm font-normal">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${settings.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {settings.isActive ? tr('admin.banner.live', 'Live') : tr('admin.banner.hidden', 'Hidden')}
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input type="checkbox" name="isActive" checked={settings.isActive} onChange={handleChange} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer scale-90" style={{ transition: 'right .3s', right: settings.isActive ? '0' : '50%', borderColor: settings.isActive ? '#10b981' : '#cbd5e1' }} />
                <div className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-300 ${settings.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
            </label>
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.messagelabel', 'Small Banner Message (Title)')}</label>
              <textarea
                name="message"
                value={settings.message}
                onChange={handleChange}
                rows={2}
                placeholder={tr('admin.banner.messagePlaceholder', 'Enter short banner message here...')}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary shrink-0 bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.timerLabel', 'Auto-Expire Timer')}</label>
              <select
                name="duration"
                value={settings.duration || 0}
                onChange={(e) => setSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white text-slate-800"
              >
                <option value={0}>{tr('admin.banner.timerNever', 'Never Expire (Manual Control)')}</option>
                <option value={1}>{tr('admin.banner.timer1h', '1 Hour')}</option>
                <option value={6}>{tr('admin.banner.timer6h', '6 Hours')}</option>
                <option value={24}>{tr('admin.banner.timer1d', '1 Day')}</option>
                <option value={72}>{tr('admin.banner.timer3d', '3 Days')}</option>
                <option value={168}>{tr('admin.banner.timer1w', '1 Week')}</option>
                <option value={720}>{tr('admin.banner.timer1m', '1 Month')}</option>
              </select>
              {settings.expiresAt && settings.duration > 0 && settings.isActive && (
                <p className="text-xs text-orange-600 mt-2 font-medium">{tr('admin.banner.expiresAt', 'Banner stays live until:')} <br />{new Date(settings.expiresAt).toLocaleString()}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.positionLabel', 'Position')}</label>
                <select name="position" value={settings.position} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl bg-white text-slate-800">
                  <option value="top">{tr('admin.banner.positionTop', 'Push-Down Top')}</option>
                  <option value="top-left">{tr('admin.banner.positionTopLeft', 'Top Left Corner')}</option>
                  <option value="top-right">{tr('admin.banner.positionTopRight', 'Top Right Corner')}</option>
                  <option value="bottom-center">{tr('admin.banner.positionBottomCenter', 'Bottom Center Floating')}</option>
                  <option value="bottom-left">{tr('admin.banner.positionBottomLeft', 'Bottom Left Widget')}</option>
                  <option value="bottom-right">{tr('admin.banner.positionBottomRight', 'Bottom Right Widget')}</option>
                  <option value="center-modal">{tr('admin.banner.positionCenterModal', 'Center Modal Overlay')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.shapeLabel', 'Shape')}</label>
                <select name="shape" value={settings.shape} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl bg-white text-slate-800">
                  <option value="sharp">{tr('admin.banner.shapeSharp', 'Sharp Box')}</option>
                  <option value="rounded">{tr('admin.banner.shapeRounded', 'Rounded Corners (Small)')}</option>
                  <option value="rounded-2xl">{tr('admin.banner.shapeRoundedLg', 'Rounded Corners (Large)')}</option>
                  <option value="pill">{tr('admin.banner.shapePill', 'Pill Shape')}</option>
                  <option value="leaf">{tr('admin.banner.shapeLeaf', 'Leaf Style (Asymmetric)')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.sizeLabel', 'Size / Width')}</label>
                <select name="size" value={settings.size} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl bg-white text-slate-800">
                  <option value="small">{tr('admin.banner.sizeSmall', 'Small (Compact)')}</option>
                  <option value="medium">{tr('admin.banner.sizeMedium', 'Medium (Standard)')}</option>
                  <option value="large">{tr('admin.banner.sizeLarge', 'Large (Wide)')}</option>
                  <option value="full">{tr('admin.banner.sizeFull', 'Full Width')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.animationLabel', 'Animation')}</label>
                <select name="animation" value={settings.animation} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl bg-white text-slate-800">
                  <option value="slide">{tr('admin.banner.animationSlide', 'Smooth Slide')}</option>
                  <option value="pop">{tr('admin.banner.animationPop', 'Pop / Scale Up')}</option>
                  <option value="fade">{tr('admin.banner.animationFade', 'Simple Fade In')}</option>
                  <option value="bounce">{tr('admin.banner.animationBounce', 'Bouncy Spring')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.bgColor', 'Background Color')}</label>
                <input type="color" name="backgroundColor" value={settings.backgroundColor} onChange={handleChange} className="w-full h-10 rounded-xl cursor-pointer p-1 bg-white border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.textColor', 'Text Color')}</label>
                <input type="color" name="textColor" value={settings.textColor} onChange={handleChange} className="w-full h-10 rounded-xl cursor-pointer p-1 bg-white border" />
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold border-b pb-2 pt-4 text-slate-800">{tr('admin.banner.mediaSection', 'Media & Pop-up Details')}</h2>
          <p className="text-xs text-slate-500 mb-4">{tr('admin.banner.mediaHint', 'Adding details or media below will automatically make the banner clickable so users can expand it into a large pop-up.')}</p>

          <div className="space-y-5">
            <div className="flex gap-4 items-end">
              <div className="w-1/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr('admin.banner.mediaTypeLabel', 'Media Type')}</label>
                <select name="mediaType" value={settings.mediaType} onChange={handleChange} className="w-full px-4 py-2 border rounded-xl bg-white text-slate-800">
                  <option value="none">{tr('admin.banner.mediaTypeNone', 'None')}</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div className="w-2/3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Media URL</label>
                <input
                  type="text"
                  name="mediaUrl"
                  value={settings.mediaUrl}
                  onChange={handleChange}
                  placeholder={settings.mediaType === 'none' ? 'Select media type first...' : 'Paste image/video URL here...'}
                  disabled={settings.mediaType === 'none'}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-slate-50 disabled:text-slate-400 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expanded Content (Pop-up Paragraph)</label>
              <textarea
                name="expandedContent"
                value={settings.expandedContent}
                onChange={handleChange}
                rows={5}
                placeholder="Write the full announcement here. You can use standard HTML tags perfectly like <br>, <b>, <i>, or <a> links."
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="border-t pt-4 flex gap-3 items-center justify-end">
            {saveStatus === 'success' && <span className="text-emerald-600 text-sm flex items-center gap-1"><Check size={16} /> {tr('admin.banner.savedSuccess', 'Saved!')}</span>}
            {saveStatus === 'error' && <span className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={16} /> {tr('admin.banner.savedError', 'Error saving')}</span>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? tr('admin.banner.saving', 'Saving...') : tr('admin.banner.saveButton', 'Save Settings')}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-700 flex items-center justify-between">
            {tr('admin.banner.previewTitle', 'Live Preview')}
            <div className="flex gap-4">
              <button
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer"
              >
                {tr('admin.banner.togglePopup', 'Toggle Pop-up Preview')}
              </button>
              <button
                onClick={() => {
                  setIsPreviewExpanded(false);
                  setSettings(prev => ({ ...prev, isActive: false }));
                  setTimeout(() => setSettings(prev => ({ ...prev, isActive: true })), 100);
                }}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                {tr('admin.banner.replayAnimation', 'Replay Animation')}
              </button>
            </div>
          </h2>
          <div className="relative w-full h-[700px] border-4 border-slate-200 rounded-3xl bg-slate-50 overflow-hidden shadow-inner hidden md:block select-none">
            <div className="h-6 bg-slate-200 w-full flex items-center px-4 gap-2 border-b z-[5000] relative">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>

            <div className={`relative w-full h-[calc(100%-1.5rem)] bg-white overflow-hidden transition-all duration-300`}>

              {/* Fake Website Content */}
              <div className={`p-8 space-y-6 opacity-30 transition-all duration-300 ${settings.position === 'top' && settings.isActive ? 'mt-12' : ''}`}>
                <div className="w-full h-40 bg-slate-200 rounded-2xl"></div>
                <div className="w-2/3 h-8 bg-slate-200 rounded-2xl"></div>
                <div className="w-full h-4 bg-slate-200 rounded-2xl"></div>
                <div className="w-5/6 h-4 bg-slate-200 rounded-2xl"></div>
                <div className="w-full h-32 bg-slate-200 rounded-2xl"></div>
              </div>

              {/* Fake overlay for expanded preview */}
              <AnimatePresence>
                {isPreviewExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[9990]"
                    onClick={() => setIsPreviewExpanded(false)}
                  />
                )}
              </AnimatePresence>

              {/* Animated Preview Banner */}
              <AnimatePresence mode="wait">
                {settings.isActive && (
                  <motion.div
                    key={playAnimationTrigger}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={getVariants()}
                    className={`absolute flex items-center ${isPreviewExpanded ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90%] md:max-w-xl w-full z-[9999]' :
                        settings.position === 'top' ? 'top-0 left-0 w-full backdrop-blur-md z-[9999]' :
                          settings.position === 'top-left' ? 'top-4 left-4 max-w-[80%] z-[9999] backdrop-blur-md' :
                            settings.position === 'top-right' ? 'top-4 right-4 max-w-[80%] z-[9999] backdrop-blur-md' :
                              settings.position === 'bottom-center' ? 'bottom-4 left-1/2 -translate-x-1/2 max-w-[90%] z-[9999] backdrop-blur-md' :
                                settings.position === 'center-modal' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[90%] z-[9999] backdrop-blur-md' :
                                  settings.position === 'bottom-left' ? 'bottom-4 left-4 max-w-[80%] z-[9999] backdrop-blur-md' :
                                    'bottom-4 right-4 max-w-[80%] z-[9999] backdrop-blur-md'
                      } 
                    ${!isPreviewExpanded && settings.position !== 'top' ? 'shadow-2xl' : ''}
                    ${isPreviewExpanded ? 'rounded-2xl shadow-2xl flex-col overflow-hidden' : ''}
                    ${!isPreviewExpanded && settings.shape === 'rounded' && settings.position !== 'top' ? 'rounded-lg' :
                        !isPreviewExpanded && settings.shape === 'rounded-2xl' && settings.position !== 'top' ? 'rounded-2xl' :
                          !isPreviewExpanded && settings.shape === 'pill' && settings.position !== 'top' ? 'rounded-full' :
                            !isPreviewExpanded && settings.shape === 'leaf' && settings.position !== 'top' ? 'rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm' :
                              ''}
                    ${!isPreviewExpanded && settings.size === 'small' && settings.position !== 'top' ? 'w-48 text-xs' :
                        !isPreviewExpanded && settings.size === 'large' && settings.position !== 'top' ? 'w-80 text-base' :
                          !isPreviewExpanded && settings.size === 'full' && settings.position !== 'top' ? 'w-[calc(100%-2rem)] text-sm' :
                            !isPreviewExpanded && settings.position !== 'top' ? 'w-64 text-sm' : ''}
                    ${!isPreviewExpanded ? 'overflow-hidden cursor-pointer hover:brightness-110' : ''}
                    transition-[width,height,border-radius,top,left,transform] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                    `}
                    style={{ backgroundColor: `${settings.backgroundColor}${isPreviewExpanded ? 'ff' : 'f2'}`, color: settings.textColor }}
                    onClick={() => {
                      if (!isPreviewExpanded && hasExpandableContent) {
                        setIsPreviewExpanded(true);
                      }
                    }}
                  >
                    {!isPreviewExpanded ? (
                      // --- SMALL COMPACT STATE ---
                      <div className={`w-full p-2 flex items-center justify-between ${settings.position === 'top' ? 'text-center' : ''} ${hasExpandableContent ? 'group' : ''}`}>

                        {settings.mediaType !== 'none' && settings.mediaUrl && (
                          <div className="w-10 h-10 rounded overflow-hidden shrink-0 mr-3 border border-white/20 relative">
                            {settings.mediaType === 'image' ? (
                              <img src={settings.mediaUrl} className="w-full h-full object-cover" alt="thumbnail" />
                            ) : (
                              <div className="w-full h-full bg-black/20 flex items-center justify-center">📷</div>
                            )}
                          </div>
                        )}

                        <span className={`flex-1 font-medium ${settings.position !== 'top' && 'pr-2'} text-left line-clamp-2`} dangerouslySetInnerHTML={{ __html: settings.message || tr('admin.banner.previewTypePlaceholder', 'Wait, type a message...') }} />

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {hasExpandableContent && (
                            <div className="p-1.5 rounded-full opacity-50 bg-black/10 group-hover:opacity-100 transition-opacity">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                            </div>
                          )}
                          <button
                            className="opacity-50 hover:opacity-100 p-1.5 rounded-full hover:bg-black/10 transition z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // --- EXPANDED POPUP STATE ---
                      <div className="w-full flex-col relative max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsPreviewExpanded(false); }}
                          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition backdrop-blur-md"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"></path></svg>
                        </button>

                        {settings.mediaType !== 'none' && settings.mediaUrl && (
                          <div className="w-full h-48 md:h-64 relative bg-black/10">
                            {settings.mediaType === 'image' && (
                              <img src={settings.mediaUrl} className="w-full h-full object-cover" alt="Banner Media" />
                            )}
                          </div>
                        )}

                        <div className="p-6 md:p-8 text-left w-full break-words">
                          <h3 className="text-xl md:text-2xl font-bold mb-4 break-words" dangerouslySetInnerHTML={{ __html: settings.message }} />
                          {settings.expandedContent && (
                            <div className="w-full opacity-90 text-sm md:text-base leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: settings.expandedContent }} />
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-sm text-slate-400 mt-3 text-center md:hidden">{tr('admin.banner.previewMobileHidden', 'Live preview is only available on desktop sizing.')}</p>
        </div>
      </div>
    </div>
  );
}
