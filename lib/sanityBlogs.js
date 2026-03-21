import { getLocalBlogs, normalizeBlog } from '@/lib/blogs';

const DEFAULT_API_VERSION = process.env.SANITY_API_VERSION || '2025-02-19';
const BLOG_TYPE = 'post';

function getSanityConfig() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
  const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || '';
  const readToken = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_API_TOKEN ?? '';
  const writeToken = process.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_API_TOKEN ?? '';

  return {
    projectId,
    dataset,
    readToken,
    writeToken,
    apiVersion: DEFAULT_API_VERSION,
  };
}

function buildBaseUrl(useCdn = false) {
  const { projectId, apiVersion } = getSanityConfig();
  const host = useCdn ? 'apicdn.sanity.io' : 'api.sanity.io';
  return `https://${projectId}.${host}/v${apiVersion}`;
}

function tryParseSanityAssetDocIdFromUrl(url) {
  const { projectId, dataset } = getSanityConfig();
  if (!url || typeof url !== 'string') return '';

  const trimmed = url.trim();
  if (!trimmed.startsWith('http')) return '';
  if (!projectId || !dataset) return '';

  // Images: https://cdn.sanity.io/images/<projectId>/<dataset>/<hash>-<w>x<h>.<ext>
  const imagesPrefix = `/images/${projectId}/${dataset}/`;
  const filesPrefix = `/files/${projectId}/${dataset}/`;

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname || '';

    if (pathname.includes(imagesPrefix)) {
      const filename = pathname.split(imagesPrefix)[1]?.split('/')[0] || '';
      const last = filename.split('/').pop() || '';
      const [namePart, ext] = last.split('.');
      if (!namePart || !ext) return '';

      const dashIndex = namePart.lastIndexOf('-');
      if (dashIndex < 0) return '';
      const hash = namePart.slice(0, dashIndex);
      const dims = namePart.slice(dashIndex + 1);
      if (!hash || !/^\d+x\d+$/.test(dims)) return '';

      return `image-${hash}-${dims}-${ext}`;
    }

    if (pathname.includes(filesPrefix)) {
      const filename = pathname.split(filesPrefix)[1]?.split('/')[0] || '';
      const last = filename.split('/').pop() || '';
      const dotIndex = last.lastIndexOf('.');
      if (dotIndex < 0) return '';
      const hash = last.slice(0, dotIndex);
      const ext = last.slice(dotIndex + 1);
      if (!hash || !ext) return '';
      return `file-${hash}-${ext}`;
    }
  } catch {
    return '';
  }

  return '';
}

function toSanityImageUrl(image) {
  if (typeof image === 'string') {
    return image.trim();
  }

  return image?.asset?.url || image?.url || '';
}

function normalizeSanityBlog(post) {
  return normalizeBlog({
    ...post,
    image: toSanityImageUrl(post.image || post.imageUrl),
  });
}

async function fetchSanityJson(url, options = {}) {
  const res = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.message || data?.error?.description || 'Sanity request failed.';
    if (/insufficient permissions|permission\s+"create"\s+required/i.test(message)) {
      throw new Error('Sanity token does not have write permission. Set SANITY_WRITE_TOKEN with Editor permissions.');
    }
    throw new Error(message);
  }

  return data;
}

async function sanityQuery(query, params = {}, { token } = {}) {
  if (!isSanityConfigured()) {
    throw new Error('Sanity is not configured.');
  }

  const { dataset, readToken, writeToken } = getSanityConfig();
  const authToken = token ?? (readToken || writeToken);
  const useCdn = !authToken;

  const urlParams = new URLSearchParams();
  urlParams.set('query', query);
  for (const [key, value] of Object.entries(params || {})) {
    urlParams.set(`$${key}`, JSON.stringify(value));
  }

  const url = `${buildBaseUrl(useCdn)}/data/query/${dataset}?${urlParams.toString()}`;
  const data = await fetchSanityJson(url, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });

  return data?.result;
}

async function countReferencesToId(docId) {
  const safeId = String(docId || '').trim();
  if (!safeId) return 0;

  const result = await sanityQuery('count(*[references($id)])', { id: safeId });
  return typeof result === 'number' ? result : 0;
}

async function deleteSanityDocumentIds(ids) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured.');
  }

  const safeIds = Array.isArray(ids)
    ? ids.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  if (safeIds.length === 0) {
    return;
  }

  const { dataset, writeToken } = getSanityConfig();
  await fetchSanityJson(`${buildBaseUrl(false)}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${writeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mutations: safeIds.map((docId) => ({ delete: { id: docId } })),
    }),
  });
}

export function isSanityConfigured() {
  const { projectId, dataset } = getSanityConfig();
  return Boolean(projectId && dataset);
}

export function isSanityWriteConfigured() {
  const { writeToken } = getSanityConfig();
  return Boolean(isSanityConfigured() && writeToken);
}

export async function getSanityBlogs() {
  const localBlogs = getLocalBlogs();

  if (!isSanityConfigured()) {
    return { blogs: localBlogs.map((post) => ({ ...post, source: 'local' })), source: 'local' };
  }

  const { dataset, readToken, writeToken } = getSanityConfig();
  const token = readToken || writeToken;
  const query = '*[_type == "post"] | order(createdAt desc){_id,title,excerpt,content,category,author,createdAt,image,imageUrl}';
  const url = `${buildBaseUrl(!token)}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const data = await fetchSanityJson(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const sanityBlogs = Array.isArray(data.result)
    ? data.result.map(normalizeSanityBlog).map((post) => ({ ...post, source: 'sanity' }))
    : [];
  const taggedLocalBlogs = localBlogs.map((post) => ({ ...post, source: 'local' }));
  
  // Combine local and Sanity blogs, then sort by date (newest first)
  const allBlogs = [...taggedLocalBlogs, ...sanityBlogs].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return {
    blogs: allBlogs,
    source: 'mixed (local + sanity)',
  };
}

export async function getSanityBlogById(blogId) {
  if (!isSanityConfigured()) {
    return null;
  }

  const safeId = String(blogId || '').trim();
  if (!safeId) {
    return null;
  }

  const { dataset, readToken, writeToken } = getSanityConfig();
  const token = readToken || writeToken;
  const query = '*[_type == "post" && _id == $id][0]{_id,title,excerpt,content,category,author,createdAt,image,imageUrl}';
  const url = `${buildBaseUrl(!token)}/data/query/${dataset}?query=${encodeURIComponent(query)}&$id=${encodeURIComponent(
    JSON.stringify(safeId)
  )}`;

  const data = await fetchSanityJson(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!data?.result) {
    return null;
  }

  return { ...normalizeSanityBlog(data.result), source: 'sanity' };
}

export async function updateSanityBlog(blogId, input) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured.');
  }

  const safeId = String(blogId || '').trim();
  if (!safeId) {
    throw new Error('Blog id is required.');
  }

  const { dataset, writeToken } = getSanityConfig();
  const normalized = normalizeBlog({
    _id: safeId,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    author: input.author,
    image: input.image,
    createdAt: input.createdAt || new Date().toISOString(),
  });

  await fetchSanityJson(`${buildBaseUrl(false)}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${writeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mutations: [
        {
          patch: {
            id: safeId,
            set: {
              title: normalized.title,
              excerpt: normalized.excerpt,
              content: normalized.content,
              category: normalized.category,
              author: normalized.author,
              image: normalized.image,
            },
          },
        },
      ],
    }),
  });

  return { ...normalized, source: 'sanity' };
}

export async function createSanityBlog(input) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured.');
  }

  const { dataset, writeToken } = getSanityConfig();
  const blog = normalizeBlog({
    _id: `post-${crypto.randomUUID()}`,
    title: input.title,
    excerpt: input.excerpt,
    content: input.content,
    category: input.category,
    author: input.author,
    image: input.image,
    createdAt: new Date().toISOString(),
  });

  await fetchSanityJson(`${buildBaseUrl(false)}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${writeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mutations: [
        {
          create: {
            _id: blog._id,
            _type: BLOG_TYPE,
            title: blog.title,
            excerpt: blog.excerpt,
            content: blog.content,
            category: blog.category,
            author: blog.author,
            image: blog.image,
            createdAt: blog.createdAt,
          },
        },
      ],
    }),
  });

  return blog;
}

export async function deleteSanityBlog(blogId) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured.');
  }

  await deleteSanityDocumentIds([blogId]);
}

export async function deleteSanityBlogWithAssets(blogId) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured.');
  }

  const safeId = String(blogId || '').trim();
  if (!safeId) {
    throw new Error('Blog id is required.');
  }

  // Fetch the raw doc so we can pick up asset references.
  const raw = await sanityQuery(
    '*[_type == "post" && _id == $id][0]{_id,image,imageUrl, "imageAssetId": image.asset._ref, "imageAssetUrl": image.asset->url}',
    { id: safeId },
  );

  const candidateAssetIds = [];

  if (raw?.imageAssetId) {
    candidateAssetIds.push(String(raw.imageAssetId));
  }

  if (typeof raw?.imageAssetUrl === 'string') {
    const parsed = tryParseSanityAssetDocIdFromUrl(raw.imageAssetUrl);
    if (parsed) candidateAssetIds.push(parsed);
  }

  if (typeof raw?.imageUrl === 'string') {
    const parsed = tryParseSanityAssetDocIdFromUrl(raw.imageUrl);
    if (parsed) candidateAssetIds.push(parsed);
  }

  if (typeof raw?.image === 'string') {
    const parsed = tryParseSanityAssetDocIdFromUrl(raw.image);
    if (parsed) candidateAssetIds.push(parsed);
  }

  // Delete the post document first.
  await deleteSanityDocumentIds([safeId]);

  // Then attempt deleting assets (best-effort), but only if unreferenced.
  const uniqueAssetIds = Array.from(new Set(candidateAssetIds.filter(Boolean)));
  if (uniqueAssetIds.length === 0) {
    return;
  }

  const deletable = [];
  for (const assetId of uniqueAssetIds) {
    try {
      const refCount = await countReferencesToId(assetId);
      if (refCount === 0) {
        deletable.push(assetId);
      }
    } catch {
      // If we cannot count references, don't risk deleting a shared asset.
    }
  }

  if (deletable.length) {
    try {
      await deleteSanityDocumentIds(deletable);
    } catch {
      // best-effort
    }
  }
}
