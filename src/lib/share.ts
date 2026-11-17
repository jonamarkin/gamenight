'use client';

export type ShareOutcome = 'shared' | 'saved' | 'cancelled' | 'failed';

/**
 * Share a picture. On phones this opens the system share sheet with the image
 * attached (WhatsApp, Status, Instagram and so on). Where the browser cannot
 * share files, the image is downloaded instead so it can be attached by hand.
 */
export async function shareImage(url: string, filename: string, text: string): Promise<ShareOutcome> {
  let blob: Blob;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return 'failed';
    blob = await r.blob();
  } catch {
    return 'failed';
  }

  const file = new File([blob], filename, { type: 'image/png' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // Fall through to saving the file.
    }
  }

  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10000);
  return 'saved';
}
