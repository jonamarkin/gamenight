import { headers } from 'next/headers';

/** The address people reached us on, e.g. "https://oya.example". Set OYA_SITE_URL to pin it. */
export async function siteBase(): Promise<string> {
  if (process.env.OYA_SITE_URL) return process.env.OYA_SITE_URL.replace(/\/+$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
