export default function PhotoLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <img src={src} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12 }} />
    </div>
  );
}
