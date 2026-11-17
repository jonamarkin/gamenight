import { ImageResponse } from 'next/og';

export const size = { width: 96, height: 96 };
export const contentType = 'image/png';

/** PNG favicon, for browsers and apps that do not take the SVG one. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0C13', borderRadius: 21 }}>
        <svg width="76" height="76" viewBox="0 0 64 64">
          <g transform="rotate(-6 32 32)">
            <rect x="5" y="9" width="54" height="54" rx="16" fill="#B8900F" />
            <rect x="5" y="3" width="54" height="54" rx="16" fill="#FFD23F" />
            <circle cx="32" cy="29" r="12.500" fill="none" stroke="#15141B" strokeWidth="8.500" />
            <path d="M19 36 L13.500 49 L27 43.500 Z" fill="#15141B" />
          </g>
        </svg>
      </div>
    ),
    size,
  );
}
