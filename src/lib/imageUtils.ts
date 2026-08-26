/**
 * Utility to compress and resize image files before converting to Data URL.
 * Prevents LocalStorage QuotaExceededError caused by multi-megabyte base64 strings.
 */
export async function compressImage(
 file: File,
 maxWidth: number = 300,
 maxHeight: number = 300,
 quality: number = 0.75
): Promise<string> {
 return new Promise((resolve, reject) => {
 const reader = new FileReader();
 reader.onerror = () => reject(new Error('Failed to read file'));
 reader.onload = (event) => {
 const img = new Image();
 img.onerror = () => reject(new Error('Failed to load image'));
 img.onload = () => {
 let width = img.width;
 let height = img.height;

 // Calculate aspect ratio preserving dimensions
 if (width > maxWidth) {
 height = Math.round((height * maxWidth) / width);
 width = maxWidth;
 }
 if (height > maxHeight) {
 width = Math.round((width * maxHeight) / height);
 height = maxHeight;
 }

 const canvas = document.createElement('canvas');
 canvas.width = width;
 canvas.height = height;

 const ctx = canvas.getContext('2d');
 if (!ctx) {
 resolve(event.target?.result as string);
 return;
 }

 ctx.drawImage(img, 0, 0, width, height);

 // Export as compressed WebP to support transparency and better quality
 const compressedDataUrl = canvas.toDataURL('image/webp', quality);
 resolve(compressedDataUrl);
 };
 img.src = event.target?.result as string;
 };
 reader.readAsDataURL(file);
 });
}
