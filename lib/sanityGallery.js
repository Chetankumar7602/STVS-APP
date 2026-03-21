const DEFAULT_API_VERSION = process.env.SANITY_API_VERSION || '2025-02-19';

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

function getDataset() {
  return getSanityConfig().dataset;
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
    throw new Error(message);
  }

  return data;
}

function toSanityImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image.trim();
  return image?.asset?.url || image?.url || '';
}

function normalizeSanityGalleryItem(doc, index) {
  const type = doc.type === 'video' ? 'video' : 'image';
  const src = doc.src || toSanityImageUrl(doc.image);

  return {
    _id: doc._id || `sanity-gallery-${index}`,
    title: doc.title || 'Gallery media',
    type,
    src,
    thumb: doc.thumb || '',
    category: doc.category || 'Community Service',
    createdAt: doc._createdAt || doc.createdAt || null,
  };
}

export function isSanityConfigured() {
  const { projectId, dataset } = getSanityConfig();
  return Boolean(projectId && dataset);
}

export function isSanityWriteConfigured() {
  const { writeToken } = getSanityConfig();
  return Boolean(isSanityConfigured() && writeToken);
}

export async function getSanityGalleryItems() {
  if (!isSanityConfigured()) {
    return [];
  }

  const { dataset, readToken, writeToken } = getSanityConfig();
  const token = readToken || writeToken;
  const query = '*[_type == "galleryItem"] | order(_createdAt desc){_id,title,type,category,image,src,thumb,_createdAt}';
  const url = `${buildBaseUrl(!token)}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const data = await fetchSanityJson(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const docs = Array.isArray(data.result) ? data.result : [];
  return docs.map(normalizeSanityGalleryItem);
}

export async function getSanityGalleryItemById(id) {
  if (!isSanityConfigured()) {
    return null;
  }

  const { dataset, readToken, writeToken } = getSanityConfig();
  const token = readToken || writeToken;
  const safeId = String(id || '').trim();
  if (!safeId) {
    return null;
  }

  const query = '*[_type == "galleryItem" && _id == $id][0]{_id,title,type,category,image,src,thumb,_createdAt}';
  const url = `${buildBaseUrl(!token)}/data/query/${dataset}?query=${encodeURIComponent(query)}&$id=${encodeURIComponent(JSON.stringify(safeId))}`;

  const data = await fetchSanityJson(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!data?.result) return null;
  return normalizeSanityGalleryItem(data.result, 0);
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

async function deleteSanityDocumentIds(ids) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured for gallery.');
  }

  const safeIds = Array.isArray(ids)
    ? ids.map((value) => String(value || '').trim()).filter(Boolean)
    : [];

  if (safeIds.length === 0) {
    return;
  }

  const { dataset, writeToken } = getSanityConfig();

  // Sanity mutation API supports multiple mutations per request.
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

async function countReferencesToId(docId) {
  if (!isSanityConfigured()) {
    return 0;
  }

  const safeId = String(docId || '').trim();
  if (!safeId) return 0;

  const { dataset, readToken, writeToken } = getSanityConfig();
  const token = readToken || writeToken;
  const query = 'count(*[references($id)])';
  const url = `${buildBaseUrl(!token)}/data/query/${dataset}?query=${encodeURIComponent(query)}&$id=${encodeURIComponent(
    JSON.stringify(safeId),
  )}`;

  const data = await fetchSanityJson(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return typeof data?.result === 'number' ? data.result : 0;
}

export async function createSanityGalleryItem(input) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured for gallery.');
  }

  const { dataset, writeToken } = getSanityConfig();
  const title = String(input.title || '').trim();
  const type = input.type === 'video' ? 'video' : 'image';
  const category = String(input.category || 'Community Service').trim() || 'Community Service';
  const src = String(input.src || '').trim();
  const thumb = String(input.thumb || '').trim();

  if (!title) {
    throw new Error('Title is required.');
  }

  if (!src) {
    throw new Error(type === 'video' ? 'Video URL is required.' : 'Image URL is required.');
  }

  const now = new Date().toISOString();
  const doc = {
    _type: 'galleryItem',
    title,
    type,
    category,
    src,
    thumb,
    createdAt: now,
  };

  const result = await fetchSanityJson(`${buildBaseUrl(false)}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${writeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations: [{ create: doc }] }),
  });

  const created = result?.results?.[0]?.document || doc;
  return normalizeSanityGalleryItem(created, 0);
}

export async function deleteSanityGalleryItem(id) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured for gallery.');
  }

  const { dataset, writeToken } = getSanityConfig();
  const safeId = String(id || '').trim();
  if (!safeId) {
    throw new Error('Gallery item id is required.');
  }

  await fetchSanityJson(`${buildBaseUrl(false)}/data/mutate/${dataset}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${writeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mutations: [{ delete: { id: safeId } }] }),
  });
}

export async function deleteSanityGalleryItemWithAssets(id) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured for gallery.');
  }

  const item = await getSanityGalleryItemById(id);
  if (!item?._id) {
    // If it's already missing, treat as success.
    return;
  }

  const candidateAssetIds = [
    tryParseSanityAssetDocIdFromUrl(item.src),
    tryParseSanityAssetDocIdFromUrl(item.thumb),
  ].filter(Boolean);

  // Delete gallery doc first.
  await deleteSanityDocumentIds([item._id]);

  // Then attempt deleting assets (best-effort).
  const uniqueAssetIds = Array.from(new Set(candidateAssetIds));
  if (uniqueAssetIds.length) {
    const deletable = [];
    for (const assetId of uniqueAssetIds) {
      try {
        const refCount = await countReferencesToId(assetId);
        if (refCount === 0) {
          deletable.push(assetId);
        }
      } catch {
        // If we can't check references, don't risk deleting a shared asset.
      }
    }

    if (deletable.length) {
      try {
        await deleteSanityDocumentIds(deletable);
      } catch {
        // Ignore asset deletion failures to avoid blocking gallery cleanup.
      }
    }
  }
}

export async function deleteAllSanityGalleryItems({ withAssets = true } = {}) {
  if (!isSanityWriteConfigured()) {
    throw new Error('Sanity write access is not configured for gallery.');
  }

  const { dataset, readToken } = getSanityConfig();
  const query = '*[_type == "galleryItem"]{_id,src,thumb}';
  const url = `${buildBaseUrl(!readToken)}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const data = await fetchSanityJson(url, {
    headers: readToken ? { Authorization: `Bearer ${readToken}` } : undefined,
  });

  const docs = Array.isArray(data?.result) ? data.result : [];
  if (docs.length === 0) {
    return { deletedCount: 0 };
  }

  const docIds = docs.map((d) => d._id).filter(Boolean);
  const assetIds = withAssets
    ? docs
        .flatMap((d) => [tryParseSanityAssetDocIdFromUrl(d.src), tryParseSanityAssetDocIdFromUrl(d.thumb)])
        .filter(Boolean)
    : [];

  // Delete in batches to avoid huge mutation payloads.
  const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };

  for (const batch of chunk(docIds, 100)) {
    await deleteSanityDocumentIds(batch);
  }

  if (withAssets && assetIds.length) {
    for (const batch of chunk(Array.from(new Set(assetIds)), 100)) {
      try {
        await deleteSanityDocumentIds(batch);
      } catch {
        // best-effort
      }
    }
  }

  return { deletedCount: docIds.length };
}
