// Shared helpers for turning a raw exported .mp4 filename + file stats
// (as returned by GET /api/list-reels) into the display fields the
// dashboard and projects views need. Keeping this in one place means
// both views always agree on how a reel is titled, sized, and dated.

export interface ExportedReel {
  filename: string;
  sizeBytes: number;
  createdAtMs: number;
}

/**
 * Turns a raw export filename like
 * "XEERO_AI_REEL_MUSTAQBALKA_AI_20S.mp4" into a readable title like
 * "Mustaqbalka Ai".
 */
export function formatReelTitle(filename: string): string {
  let name = filename.replace(/\.mp4$/i, '');
  name = name.replace(/^XEERO(_AI)?_REEL_/i, '');
  name = name.replace(/_\d+S$/i, ''); // trailing duration suffix like _20S

  const words = name.split(/[_\-]+/).filter(Boolean);
  if (words.length === 0) return filename;

  return words
    .map((w) => {
      if (/^\d+$/.test(w)) return w; // keep pure numbers as-is
      if (w.toUpperCase() === 'AI') return 'AI'; // keep the "AI" acronym capitalized
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Somali-language relative date label, e.g. "Maanta", "Shalay", "3 maalmood ka hor". */
export function formatReelDateSomali(ms: number): string {
  const dayMs = 24 * 60 * 60 * 1000;
  const diffMs = Date.now() - ms;

  if (diffMs < dayMs) return 'Maanta';
  if (diffMs < 2 * dayMs) return 'Shalay';

  const days = Math.floor(diffMs / dayMs);
  if (days < 7) return `${days} maalmood ka hor`;

  const date = new Date(ms);
  const day = date.getDate();
  const months = [
    'Jan', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ogo', 'Sep', 'Okt', 'Nof', 'Dis',
  ];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
