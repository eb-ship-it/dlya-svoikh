export default function MayachokIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
      <defs>
        <linearGradient id="mayachok-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8b5cf6' }} />
          <stop offset="100%" style={{ stopColor: '#ec4899' }} />
        </linearGradient>
      </defs>
      <path d="M50 8 L58 18 L55 18 L60 85 L40 85 L45 18 L42 18 Z" fill="url(#mayachok-grad)" />
      <rect x="35" y="85" width="30" height="8" rx="2" fill="url(#mayachok-grad)" />
      <circle cx="50" cy="12" r="8" fill="none" stroke="url(#mayachok-grad)" strokeWidth="3" opacity="0.4" />
      <circle cx="50" cy="12" r="14" fill="none" stroke="url(#mayachok-grad)" strokeWidth="2" opacity="0.2" />
      <line x1="30" y1="6" x2="38" y2="10" stroke="url(#mayachok-grad)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="70" y1="6" x2="62" y2="10" stroke="url(#mayachok-grad)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="50" y1="-2" x2="50" y2="3" stroke="url(#mayachok-grad)" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <rect x="43" y="35" width="14" height="4" rx="1" fill="white" opacity="0.4" />
      <rect x="42" y="50" width="16" height="4" rx="1" fill="white" opacity="0.3" />
      <rect x="41" y="65" width="18" height="4" rx="1" fill="white" opacity="0.2" />
    </svg>
  )
}
