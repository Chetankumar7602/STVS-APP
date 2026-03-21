import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createSanityGalleryItem, isSanityWriteConfigured } from '@/lib/sanityGallery';

function getSanityUploadConfig() {
  const projectId = process.env.SANITY_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
  const dataset = process.env.SANITY_DATASET || process.env.NEXT_PUBLIC_SANITY_DATASET || '';
  const apiVersion = process.env.SANITY_API_VERSION || '2025-02-19';
  const writeToken = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_API_TOKEN || '';
  return { projectId, dataset, apiVersion, writeToken };
}

export async function POST(request) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) {
    return auth;
  }

  if (!isSanityWriteConfigured()) {
    return NextResponse.json(
      { success: false, message: 'Sanity write access is not configured for gallery.' },
      { status: 400 },
    );
  }

  const { projectId, dataset, apiVersion, writeToken } = getSanityUploadConfig();
  if (!projectId || !dataset || !writeToken) {
    return NextResponse.json(
      { success: false, message: 'Sanity project configuration is missing.' },
      { status: 500 },
    );
  }

  try {
    const formData = await request.formData();
    const typeRaw = formData.get('type');
    const file = formData.get('file');
    const thumbFile = formData.get('thumb');
    const thumbUrlRaw = formData.get('thumbUrl');
    const rawTitle = formData.get('title');
    const rawCategory = formData.get('category');

    const type = String(typeRaw || 'image').trim().toLowerCase() === 'video' ? 'video' : 'image';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, message: type === 'video' ? 'Video file is required.' : 'Image file is required.' },
        { status: 400 },
      );
    }

    const titleFallback = type === 'video' ? 'Gallery video' : 'Gallery image';
    const title = String(rawTitle || file.name || titleFallback).trim();
    const category = String(rawCategory || 'Community Service').trim() || 'Community Service';

    const uploadAsset = async ({ endpoint, blob, contentType, failureMessage }) => {
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/assets/${endpoint}/${dataset}`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${writeToken}`,
          'Content-Type': contentType || 'application/octet-stream',
        },
        body: buffer,
      });

      const assetData = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok || !assetData) {
        const message = assetData?.error?.description || assetData?.message || failureMessage;
        return { ok: false, message };
      }

      const assetUrl = assetData.url || assetData.secure_url || assetData.document?.url;
      if (!assetUrl) {
        return { ok: false, message: 'Sanity did not return an asset URL.' };
      }

      return { ok: true, url: assetUrl };
    };

    const mainAsset = await uploadAsset({
      endpoint: type === 'video' ? 'files' : 'images',
      blob: file,
      contentType: file.type,
      failureMessage: type === 'video' ? 'Failed to upload video to Sanity.' : 'Failed to upload image to Sanity.',
    });

    if (!mainAsset.ok) {
      return NextResponse.json({ success: false, message: mainAsset.message }, { status: 500 });
    }

    let thumbUrl = '';
    if (type === 'video' && thumbFile && typeof thumbFile !== 'string') {
      const thumbAsset = await uploadAsset({
        endpoint: 'images',
        blob: thumbFile,
        contentType: thumbFile.type,
        failureMessage: 'Failed to upload thumbnail image to Sanity.',
      });

      if (!thumbAsset.ok) {
        return NextResponse.json({ success: false, message: thumbAsset.message }, { status: 500 });
      }

      thumbUrl = thumbAsset.url;
    } else if (type === 'video' && thumbUrlRaw && typeof thumbUrlRaw === 'string') {
      thumbUrl = thumbUrlRaw.trim();
    }

    const newItem = await createSanityGalleryItem({
      title,
      type,
      src: mainAsset.url,
      thumb: thumbUrl,
      category,
    });

    return NextResponse.json({
      success: true,
      data: newItem,
      message: type === 'video' ? 'Video uploaded and published to Sanity.' : 'Image uploaded and published to Sanity.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
