export const ALLOWED_EXTENSIONS = [
  'xlsx', 'xls', 'xlsm', 'csv', 'ods', 'numbers', 'pdf', 'doc', 'docx', 'txt', 'rtf',
  'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif',
];
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 30 * 1024 * 1024;

export const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(',');

export function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Returns an error message for the person, or null when the files are fine. */
export function checkFiles(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_FILES) return `Please send at most ${MAX_FILES} files.`;
  let total = 0;
  for (const f of files) {
    if (!ALLOWED_EXTENSIONS.includes(extension(f.name))) {
      return `${f.name} isn't a file type we accept. Use Excel, CSV, PDF, Word or a photo.`;
    }
    if (f.size > MAX_FILE_BYTES) return `${f.name} is over 15 MB.`;
    if (f.size === 0) return `${f.name} is empty.`;
    total += f.size;
  }
  if (total > MAX_TOTAL_BYTES) return 'The files add up to more than 30 MB.';
  return null;
}

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '').slice(-120);
  return cleaned || 'file';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
