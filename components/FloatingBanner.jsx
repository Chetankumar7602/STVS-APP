"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minus } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function FloatingBanner() {
  const pathname = usePathname();
  const [settings, setSettings] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Unique session storage key
    const isDismissed = sessionStorage.getItem('stvs_banner_dismissed') === 'true';

    fetch('/api/public/banner')
      .then(res => res.json())
      .then(result => {
        if (result.success && result.data && result.data.isActive) {
          setSettings(result.data);

          const lastDismissedMessage = sessionStorage.getItem('stvs_banner_msg_hash');
          const currentMessageHash = result.data.message.substring(0, 20);

          if (!isDismissed || lastDismissedMessage !== currentMessageHash) {
            setIsVisible(true);
            if (result.data.position === 'top') {
              document.body.classList.add('has-top-banner');
            }
          }
        }
      })
      .catch(err => console.error("Banner fetch error", err));

    return () => {
      document.body.classList.remove('has-top-banner');
    };
  }, []);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsVisible(false);
    setIsExpanded(false);
    sessionStorage.setItem('stvs_banner_dismissed', 'true');
    if (settings) {
      sessionStorage.setItem('stvs_banner_msg_hash', settings.message.substring(0, 20));
    }
    document.body.classList.remove('has-top-banner');
  };

  const handleMinimize = (e) => {
    if (e) e.stopPropagation();
    setIsExpanded(false);
  };

  const handleBannerClick = () => {
    if (!isExpanded && hasExpandableContent) {
      setIsExpanded(true);
    }
  };

  if (pathname?.startsWith('/admin')) return null;
  if (!settings || !isVisible) return null;

  const {
    position = 'top',
    shape = 'sharp',
    size = 'medium',
    animation = 'slide',
    backgroundColor,
    textColor,
    message,
    mediaType = 'none',
    mediaUrl,
    expandedContent
  } = settings;

  const hasExpandableContent = expandedContent?.trim() !== '' || (mediaType !== 'none' && mediaUrl?.trim() !== '');

  const getVariants = () => {
    switch (animation) {
      case 'fade':
        return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
      case 'pop':
        return { hidden: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 15 } } };
      case 'bounce':
        return {
          hidden: { opacity: 0, y: position.includes('top') ? -100 : position === 'center-modal' ? -50 : 100 },
          visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 10 } }
        };
      default: // 'slide'
        return {
          hidden: { opacity: 0, y: position.includes('top') || position === 'center-modal' ? -50 : 50 },
          visible: { opacity: 1, y: 0, transition: { ease: "easeOut", duration: 0.4 } }
        };
    }
  };

  const getSizeClasses = () => {
    if (position === 'top' || size === 'full') return 'w-full px-4';
    switch (size) {
      case 'small': return 'max-w-[280px] text-sm';
      case 'large': return 'max-w-2xl text-lg';
      case 'medium':
      default: return 'max-w-md text-base';
    }
  };

  const getPositionClasses = () => {
    if (isExpanded) {
      return 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[95vw] md:max-w-2xl w-full z-[9999]';
    }

    let posStr = '';
    switch (position) {
      case 'top': posStr = 'fixed top-0 left-0 w-full z-[9999]'; break;
      case 'top-left': posStr = 'fixed top-4 left-4 z-[9999]'; break;
      case 'top-right': posStr = 'fixed top-4 right-4 z-[9999]'; break;
      case 'bottom-center': posStr = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-full flex justify-center px-4 max-w-[90vw] mb-[80px] md:mb-0'; break;
      case 'center-modal': posStr = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full flex justify-center px-4'; break;
      case 'bottom-left': posStr = 'fixed bottom-4 left-4 z-[9999] max-w-[90vw] mb-[80px] md:mb-0'; break;
      case 'bottom-right': posStr = 'fixed bottom-4 right-4 z-[9999] max-w-[90vw] mb-[80px] md:mb-0'; break;
      default: posStr = 'fixed top-0 left-0 w-full z-[9999]'; break;
    }
    return posStr;
  };

  const getShapeClasses = () => {
    if (isExpanded) return 'rounded-2xl shadow-2xl'; // Expanded is always a nice rounded modal box

    if (position === 'top') return '';
    switch (shape) {
      case 'sharp': return 'rounded-none shadow-2xl';
      case 'rounded': return 'rounded-lg shadow-2xl border border-black/5';
      case 'rounded-2xl': return 'rounded-2xl shadow-2xl border border-black/5';
      case 'pill': return 'rounded-full px-6 py-1 shadow-2xl border border-black/5';
      case 'leaf': return 'rounded-tl-2xl rounded-br-2xl rounded-tr-sm rounded-bl-sm shadow-2xl border border-black/5';
      default: return 'shadow-2xl';
    }
  };

  return (
    <>
      {/* Background dimmer for center-modal or when expanded */}
      <AnimatePresence>
        {(position === 'center-modal' || isExpanded) && isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
            onClick={handleMinimize} // Clicking outside minimizes it, not permanently closing it.
            style={{ margin: 0 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={getVariants()}
            className={`${getPositionClasses()} transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
            style={{
              // Need to ensure when transition happens it doesn't instantly snap layout bounds
              transformOrigin: 'center center'
            }}
          >
            <div
              className={`overflow-hidden backdrop-blur-xl bg-opacity-95 flex flex-col ${getShapeClasses()} ${!isExpanded ? getSizeClasses() : ''} ${!isExpanded && hasExpandableContent ? 'cursor-pointer hover:brightness-110' : ''} transition-all duration-500`}
              style={{ backgroundColor: backgroundColor, color: textColor }}
              onClick={handleBannerClick}
            >
              {!isExpanded ? (
                // --- SMALL COMPACT STATE ---
                <div className={`flex items-center p-3 w-full ${position === 'top' ? 'max-w-7xl mx-auto' : ''} ${hasExpandableContent ? 'group' : ''}`}>

                  {/* Thumbnail */}
                  {mediaType !== 'none' && mediaUrl && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden shrink-0 mr-4 border border-white/20 shadow-sm relative">
                      {mediaType === 'image' && (
                        <img src={mediaUrl} className="w-full h-full object-cover" alt="Banner Media" />
                      )}
                    </div>
                  )}

                  {/* Message */}
                  <div className={`font-medium flex-1 ${(!hasExpandableContent && (position === 'top' || position === 'bottom-center' || position === 'center-modal')) ? 'text-center' : 'text-left'} line-clamp-2`} dangerouslySetInnerHTML={{ __html: message }} />

                  {/* Action Icons */}
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {hasExpandableContent && (
                      <button className="p-[6px] rounded-full sm:bg-black/10 sm:opacity-70 opacity-100 hover:opacity-100 hover:bg-black/20 group-hover:bg-black/20 transition-all font-bold">
                        <Maximize2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="p-[6px] rounded-full opacity-70 hover:opacity-100 hover:bg-black/20 transition-all"
                      aria-label="Close banner completely"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                // --- EXPANDED POPUP STATE ---
                <div className="w-full flex flex-col relative max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
                  {/* Minimize Button (NOT CLOSE FOR GOOD) */}
                  <button
                    onClick={handleMinimize}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors shadow-lg border border-white/20"
                    aria-label="Minimize back to banner"
                  >
                    <Minus size={20} />
                  </button>

                  {/* Large Media */}
                  {mediaType !== 'none' && mediaUrl && (
                    <div className="w-full h-48 sm:h-64 md:h-80 relative bg-black/10 shrink-0">
                      {mediaType === 'image' && (
                        <img src={mediaUrl} className="w-full h-full object-cover" alt="Expanded Media" />
                      )}
                    </div>
                  )}

                  {/* Expanded Content */}
                  <div className="p-6 md:p-10 text-left w-full break-words">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 break-words" dangerouslySetInnerHTML={{ __html: message }} />
                    <div className="w-full opacity-90 text-[15px] sm:text-base leading-relaxed space-y-4 break-words" dangerouslySetInnerHTML={{ __html: expandedContent }} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
