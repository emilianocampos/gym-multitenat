'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeGenerator({ value, size = 256, className = '' }: QRCodeGeneratorProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        setDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generando QR verdadero:', err);
      });
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 rounded-xl font-bold text-xs text-zinc-400 ${className}`}
        style={{ width: size, height: size }}
      >
        Generando QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`Código QR para ${value}`}
      width={size}
      height={size}
      className={`rounded-xl shadow-md ${className}`}
    />
  );
}
