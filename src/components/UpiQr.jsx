import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { T } from '../theme.js';

export default function UpiQr({ value, size = 160 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size, margin: 1,
        color: { dark: T.text, light: '#ffffff' },
      });
    }
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ borderRadius: 10, border: `1px solid ${T.border}` }} />;
}
