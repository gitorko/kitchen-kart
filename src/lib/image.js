// Photos are stored as a single compressed, cropped JPEG data URL — no separate
// full-resolution original is kept, to keep DB rows small.
export const CROP_OUT_W = 320, CROP_OUT_H = 240;
export const CROP_VIEW_W = 300, CROP_VIEW_H = 225;
export const CROP_OUT_QUALITY = 0.7;

export function canvasToJpeg(draw, w, h, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'));
  return canvas.toDataURL('image/jpeg', quality);
}
