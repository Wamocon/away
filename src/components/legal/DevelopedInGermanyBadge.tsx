'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export function DevelopedInGermanyBadge() {
  const pathname = usePathname();
  
  // Hide on certain paths if needed
  if (pathname?.startsWith('/api')) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-6 opacity-40 hover:opacity-100 transition-opacity">
      <div className="relative group">
        <svg
          width="42"
          height="42"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Circles */}
          <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="4" className="text-[var(--border)] opacity-20" />
          <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="2" className="text-[var(--border)] opacity-10" />
          
          {/* Star/Polygon */}
          <polygon
            points="100,28 106,46 124,46 110,56 115,74 100,64 85,74 90,56 76,46 94,46"
            fill="currentColor"
            className="text-[var(--text-base)]"
          />
          
          {/* Curved Text Paths */}
          <path id="sealTextTop" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
          <text
            fontFamily="Inter, sans-serif"
            fontSize="16"
            fontWeight="800"
            letterSpacing="3"
            fill="currentColor"
            className="text-[var(--text-base)]"
          >
            <textPath href="#sealTextTop" startOffset="50%" textAnchor="middle">
              DEVELOPED IN
            </textPath>
          </text>
          
          <path id="sealTextBot" d="M 28,108 A 72,72 0 0,0 172,108" fill="none" />
          <text
            fontFamily="Inter, sans-serif"
            fontSize="16"
            fontWeight="800"
            letterSpacing="3"
            fill="currentColor"
            className="text-[var(--text-base)]"
          >
            <textPath href="#sealTextBot" startOffset="50%" textAnchor="middle">
              GERMANY
            </textPath>
          </text>
          
          {/* Flag */}
          <rect x="70" y="82" width="60" height="8" rx="1" fill="#000000" />
          <rect x="70" y="90" width="60" height="8" fill="#DD0000" />
          <rect x="70" y="98" width="60" height="8" rx="1" fill="#FFCC00" />
        </svg>
      </div>
      
      <span className="text-[14px] font-medium tracking-wide text-[var(--text-muted)]">
        Entwickelt in Deutschland
      </span>
    </div>
  );
}
