import { useRef, useState } from 'react';
import { T, LABEL } from '../theme.js';
import ImageCropModal from './ImageCropModal.jsx';

export default function PhotoUploadField({ label, value, onChange }) {
  const inputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setPendingFile(file);
  }

  return (
    <div>
      <label style={LABEL}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 76, height: 57, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
          border: `1.5px solid ${T.border}`, background: T.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {value ? (
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 22 }}>📷</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button" onClick={() => inputRef.current?.click()}
            style={{
              padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1.5px solid ${T.border}`, background: T.surface, color: T.textSub,
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            }}
          >
            {value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && (
            <button
              type="button" onClick={() => onChange(null)}
              style={{
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                border: '1.5px solid #fecaca', background: 'transparent', color: T.red,
                fontFamily: 'inherit', fontSize: 13,
              }}
            >
              Remove
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>
      {pendingFile && (
        <ImageCropModal
          file={pendingFile}
          onConfirm={photo => { onChange(photo); setPendingFile(null); }}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </div>
  );
}
