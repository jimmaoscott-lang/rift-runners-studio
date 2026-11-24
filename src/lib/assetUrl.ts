export function assetUrl(p: string): string {
  if (!p || /^https?:\/\//i.test(p) || p.startsWith('data:') || p.startsWith('blob:')) {
    return p;
  }
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${p.replace(/^\/+/, '')}`;
}

export function isStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.github.io');
}
