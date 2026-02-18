

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function createPageUrl(pageName: string) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}

/**
 * Resolve an upload URL to an absolute path.
 * Handles relative /uploads/... paths by prefixing the API URL.
 */
export function resolveUploadUrl(url: string | null | undefined): string {
    if (!url) return '';
    // Already absolute
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Relative path — prefix with API URL
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}