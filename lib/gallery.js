const GOOGLE_IMAGE_HOSTS = ['googleusercontent.com', 'ggpht.com'];

export const STATIC_GALLERY_MEDIA = [
  {
    type: 'video',
    src: '/assets/vid1.mp4',
    alt: "Dr. Shri Shri Subudhendra Teertha speaks on the Founder's Vision",
    title: "Dr. Shri Shri Subudhendra Teertha speaks on the Founder's Vision",
    className: 'md:col-span-2 md:row-span-2',
    thumb: '/assets/Thumb1.jpeg',
    thumbPos: 'object-top',
    category: 'video',
    source: 'static',
  },
  { type: 'image', src: '/assets/pic1.jpeg', alt: 'Community Outreach', title: 'Community Outreach', className: 'md:col-span-1', thumbPos: 'object-center', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/pic4.jpeg', alt: 'Social Work', title: 'Social Work', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/pic5.jpeg', alt: 'Community Service', title: 'Community Service', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/pic6.jpeg', alt: 'Founder at Event', title: 'Founder at Event', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew1.jpg', alt: 'Educational Initiative', title: 'Educational Initiative', className: 'md:col-span-1', thumbPos: 'object-center', category: 'awards', source: 'static' },
  { type: 'image', src: '/assets/picNew2.jpg', alt: 'Community Gathering', title: 'Community Gathering', className: 'md:col-span-2', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew3.jpeg', alt: 'Recognition Ceremony', title: 'Recognition Ceremony', className: 'md:col-span-1', thumbPos: 'object-top', category: 'awards', source: 'static' },
  { type: 'image', src: '/assets/picNew4.jpeg', alt: 'Spiritual Engagement', title: 'Spiritual Engagement', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew5.png', alt: 'Trust Activities', title: 'Trust Activities', className: 'md:col-span-1', thumbPos: 'object-center', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew6.jpg', alt: 'Leadership & Service', title: 'Leadership & Service', className: 'md:col-span-1', thumbPos: 'object-top', category: 'awards', source: 'static' },
  { type: 'image', src: '/assets/picNew7.jpg', alt: 'Community Meeting', title: 'Community Meeting', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew8.jpg', alt: 'Volunteer Work', title: 'Volunteer Work', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew9.jpg', alt: 'Social Impact', title: 'Social Impact', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew10.jpg', alt: 'Free Education Drive', title: 'Free Education Drive', className: 'md:col-span-1', thumbPos: 'object-center', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew11.jpg', alt: 'Community Events', title: 'Community Events', className: 'md:col-span-2', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew12.jpg', alt: 'Award & Honours', title: 'Award & Honours', className: 'md:col-span-1', thumbPos: 'object-top', category: 'awards', source: 'static' },
  { type: 'image', src: '/assets/picNew13.jpg', alt: 'Empowering Lives', title: 'Empowering Lives', className: 'md:col-span-2', thumbPos: 'object-top', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew14.jpg', alt: 'Visionary Leadership', title: 'Visionary Leadership', className: 'md:col-span-1', thumbPos: 'object-top', category: 'awards', source: 'static' },
  { type: 'image', src: '/assets/picNew15.jpg', alt: 'Philanthropy at Work', title: 'Philanthropy at Work', className: 'md:col-span-1', thumbPos: 'object-center', category: 'service', source: 'static' },
  { type: 'image', src: '/assets/picNew16.jpg', alt: 'Service with Heart', title: 'Service with Heart', className: 'md:col-span-1', thumbPos: 'object-top', category: 'service', source: 'static' },
];

export const STATIC_GALLERY_PREVIEW = [
  { src: '/assets/pic1.jpeg', pos: 'object-center' },
  { src: '/assets/picNew13.jpg', pos: 'object-top' },
  { src: '/assets/picNew4.jpeg', pos: 'object-top' },
  { src: '/assets/picNew11.jpg', pos: 'object-top' },
  { src: '/assets/picNew2.jpg', pos: 'object-top' },
  { src: '/assets/pic5.jpeg', pos: 'object-top' },
];

const CATEGORY_MAP = {
  service: 'service',
  'community service': 'service',
  'recognition & awards': 'awards',
  recognition: 'awards',
  awards: 'awards',
  award: 'awards',
  video: 'video',
};

function extractDriveFileId(url) {
  const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];
  return url.searchParams.get('id');
}

function normalizeGoogleHostedUrl(rawUrl) {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();

  if (hostname.endsWith('google.com')) {
    if (url.pathname === '/imgres') {
      const imageUrl = url.searchParams.get('imgurl');
      if (imageUrl) return normalizeGoogleHostedUrl(imageUrl);
    }

    if (url.pathname === '/url') {
      const target = url.searchParams.get('q') || url.searchParams.get('url');
      if (target) return normalizeGoogleHostedUrl(target);
    }

    if (url.pathname === '/search') {
      const imageUrl = url.searchParams.get('imgurl');
      if (imageUrl) return normalizeGoogleHostedUrl(imageUrl);
      throw new Error('Google search result pages cannot be shown in the gallery. Paste the direct shared image URL.');
    }
  }

  if (hostname === 'drive.google.com' || hostname === 'docs.google.com') {
    const fileId = extractDriveFileId(url);
    if (!fileId) {
      throw new Error('Google Drive link is missing a shareable file id.');
    }
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  if (
    GOOGLE_IMAGE_HOSTS.some((allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`))
  ) {
    return rawUrl;
  }

  return rawUrl;
}

export function isRemoteUrl(src = '') {
  return /^https?:\/\//i.test(src);
}

export function toGalleryCategory(category, type = 'image') {
  if (type === 'video') return 'video';
  const normalized = String(category || '').trim().toLowerCase();
  return CATEGORY_MAP[normalized] || 'service';
}

export function normalizeGalleryUrl(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) {
    throw new Error('Media URL is required.');
  }

  if (value.startsWith('/')) {
    return value;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Please enter a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.');
  }

  return normalizeGoogleHostedUrl(parsed.toString());
}

export function prepareGalleryItemInput(input = {}) {
  const title = String(input.title || '').trim();
  const type = input.type === 'video' ? 'video' : 'image';
  const src = normalizeGalleryUrl(input.src);
  const category = String(input.category || 'Community Service').trim() || 'Community Service';
  const normalized = {
    title,
    type,
    src,
    category,
  };

  if (!title) {
    throw new Error('Title is required.');
  }

  if (type === 'video') {
    normalized.thumb = input.thumb ? normalizeGalleryUrl(input.thumb) : '';
  }

  return normalized;
}

export function mapDbGalleryItems(items = []) {
  return items.map((item, index) => ({
    _id: item._id?.toString?.() || item._id || `${item.src}-${index}`,
    type: item.type === 'video' ? 'video' : 'image',
    src: item.src,
    thumb: item.thumb || '',
    alt: item.title || 'Gallery media',
    title: item.title || 'Gallery media',
    className: index % 5 === 1 ? 'md:col-span-2' : 'md:col-span-1',
    thumbPos: 'object-center',
    category: toGalleryCategory(item.category, item.type),
    source: 'db',
  }));
}
