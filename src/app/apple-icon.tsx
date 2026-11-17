import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon: the Oya tile on the night ground. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D0C13' }}>
        <svg width="140" height="140" viewBox="0 0 64 64">
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
