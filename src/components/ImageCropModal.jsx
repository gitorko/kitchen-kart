import { useState, useEffect, useRef } from 'react';
import { T, LABEL } from '../theme.js';
import { CROP_OUT_W, CROP_OUT_H, CROP_VIEW_W, CROP_VIEW_H, CROP_OUT_QUALITY, canvasToJpeg } from '../lib/image.js';

const CROP_MAX_ZOOM = 3;

// Drag-to-reposition cropper for one uploaded photo. Confirms with both a fixed-size
// crop (what was framed, for cards) and the full original (untouched, just downscaled).
export default function ImageCropModal({ file, onConfirm, onCancel }) {
  const [img, setImg] = useState(null);
  const [url, setUrl] = useState('');
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const dragRef = useRef(null);
  const scale = baseScale * zoom;

  useEffect(() => {
    let cancelled = false;
    setImg(null);
    setError('');
    setZoom(1);
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const s = Math.max(CROP_VIEW_W / image.width, CROP_VIEW_H / image.height);
      setBaseScale(s);
      setOffset({
        x: Math.max(0, (image.width - CROP_VIEW_W / s) / 2),
        y: Math.max(0, (image.height - CROP_VIEW_H / s) / 2),
      });
      setImg(image);
    };
    image.onerror = () => { if (!cancelled) setError('Could not read that image'); };
    image.src = objUrl;
    return () => { cancelled = true; URL.revokeObjectURL(objUrl); };
  }, [file]);

  function clamp(o, s) {
    const maxX = Math.max(0, img.width - CROP_VIEW_W / s);
    const maxY = Math.max(0, img.height - CROP_VIEW_H / s);
    return { x: Math.min(Math.max(0, o.x), maxX), y: Math.min(Math.max(0, o.y), maxY) };
  }

  function onZoomChange(e) {
    const nextZoom = parseFloat(e.target.value);
    const nextScale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset(o => clamp(o, nextScale));
  }

  function onPointerDown(e) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, offset };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragRef.current || !img) return;
    const dx = (e.clientX - dragRef.current.startX) / scale;
    const dy = (e.clientY - dragRef.current.startY) / scale;
    setOffset(clamp({ x: dragRef.current.offset.x - dx, y: dragRef.current.offset.y - dy }, scale));
  }
  function onPointerUp() { dragRef.current = null; }

  function confirm() {
    if (!img) return;
    const cropW = CROP_VIEW_W / scale, cropH = CROP_VIEW_H / scale;
    const photo = canvasToJpeg(
      ctx => ctx.drawImage(img, offset.x, offset.y, cropW, cropH, 0, 0, CROP_OUT_W, CROP_OUT_H),
      CROP_OUT_W, CROP_OUT_H, CROP_OUT_QUALITY
    );
    onConfirm(photo);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: T.surface, borderRadius: 18, padding: 22,
        width: '100%', maxWidth: 380, border: `1px solid ${T.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <h2 style={{ color: T.text, marginBottom: 4, fontSize: 17, fontWeight: 700 }}>Position photo</h2>
        <p style={{ fontSize: 12.5, color: T.textSub, marginBottom: 14 }}>
          Drag to frame the photo the way you'd like it shown.
        </p>
        {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{error}</p>}
        {img ? (
          <>
            <div
              style={{
                position: 'relative', overflow: 'hidden', margin: '0 auto',
                width: CROP_VIEW_W, height: CROP_VIEW_H, maxWidth: '100%',
                borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg,
                cursor: 'grab', touchAction: 'none',
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              <img
                src={url}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: 'absolute', top: 0, left: 0, userSelect: 'none',
                  width: img.width * scale, height: img.height * scale,
                  transform: `translate(${-offset.x * scale}px, ${-offset.y * scale}px)`,
                }}
              />
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={LABEL}>Zoom{zoom > 1 ? ' — drag to reposition' : ''}</label>
              <input type="range" min={1} max={CROP_MAX_ZOOM} step={0.01} value={zoom} onChange={onZoomChange} style={{ width: '100%' }} />
            </div>
          </>
        ) : !error && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: T.textMuted, fontSize: 13 }}>Loading…</div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            type="button" onClick={onCancel}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 10,
              border: `1.5px solid ${T.border}`, background: 'transparent',
              color: T.textSub, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={confirm} disabled={!img}
            style={{
              flex: 2, padding: '11px 0', borderRadius: 10, border: 'none',
              background: T.primaryBg, color: T.primary,
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              cursor: img ? 'pointer' : 'not-allowed', opacity: img ? 1 : 0.6,
            }}
          >
            Use this photo
          </button>
        </div>
      </div>
    </div>
  );
}
