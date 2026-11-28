// Which fields the status line shows on each kind of page (data-model.md § PageKind and StatusFields).
export type PageKind = 'card' | 'home' | 'catalog' | 'domain' | 'path' | 'radar';

export interface StatusFields {
  mode: string;
  domain?: string;
  file?: string;
  status?: string;
  progress?: string;
}

export interface StatusContext {
  domain?: string;
  file?: string;
  status?: string;
  read?: number;
  total?: number;
}

/** Fields a page has stay present; the rest are left out entirely (not empty strings). */
export function statusFields(kind: PageKind, context: StatusContext = {}): StatusFields {
  if (kind === 'card') {
    const { domain, file, status, read = 0, total = 0 } = context;
    return { mode: 'READ', domain, file, status, progress: `domain ${read}/${total}` };
  }
  if (kind === 'domain') return { mode: 'catalog', domain: context.domain };
  return { mode: kind };
}
