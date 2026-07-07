/**
 * Utility to convert a remote image URL into a Base64 data URL.
 * Works for images that support CORS (like iTunes Search API and Wikimedia Commons).
 */
export async function fetchBase64Image(url: string): Promise<string> {
  if (!url) return '';
  // If it's already a data URL, return it
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Conversion to base64 failed'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`[ImageLoader] Failed to fetch/convert image to base64: ${url}`, error);
    // Return original url as fallback so it still displays in UI even if export fails
    return url;
  }
}
