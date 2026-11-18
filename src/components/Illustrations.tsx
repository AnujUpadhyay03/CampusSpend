import React from 'react';

export function StudentHeroIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Illustration of an Indian college student desk with monthly budget tracker, smartphone UPI scan, textbook, and steaming chai"
    >
      <defs>
        <linearGradient id="heroCardGrad" x1="0" y1="0" x2="460" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0FDFA" />
          <stop offset="100%" stopColor="#E6F4F1" />
        </linearGradient>
        <linearGradient id="walletGrad" x1="150" y1="54" x2="310" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#115E59" />
        </linearGradient>
      </defs>

      {/* Soft campus backdrop */}
      <rect width="460" height="280" rx="20" fill="url(#heroCardGrad)" />
      {/* Subtle campus arch silhouette */}
      <path
        d="M42 232V132C42 87.8172 77.8172 52 122 52H338C382.183 52 418 87.8172 418 132V232"
        stroke="#99F6E4"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />
      {/* Desk surface */}
      <rect x="28" y="226" width="404" height="10" rx="5" fill="#CBD5E1" opacity="0.55" />

      {/* Left: Notebook / Study & Books stack */}
      <g>
        <rect x="56" y="176" width="98" height="50" rx="8" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="64" y="186" width="54" height="6" rx="3" fill="#0F766E" opacity="0.25" />
        <rect x="64" y="198" width="76" height="5" rx="2.5" fill="#CBD5E1" />
        <rect x="64" y="208" width="44" height="5" rx="2.5" fill="#CBD5E1" />
        {/* Top tilted notebook */}
        <rect x="66" y="144" width="84" height="34" rx="7" fill="#0D9488" />
        <rect x="76" y="154" width="46" height="5" rx="2.5" fill="#CCFBF1" />
        <rect x="76" y="164" width="28" height="4" rx="2" fill="#99F6E4" />
      </g>

      {/* Center: CampusSpend Budget Card + Rupee Gauge */}
      <g>
        <rect x="166" y="54" width="168" height="172" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
        {/* Emerald allowance header */}
        <rect x="176" y="64" width="148" height="72" rx="12" fill="url(#walletGrad)" />
        <rect x="188" y="76" width="64" height="6" rx="3" fill="#99F6E4" opacity="0.8" />
        {/* Rupee symbol & value */}
        <text
          x="188"
          y="108"
          fill="#FFFFFF"
          fontFamily="JetBrains Mono, monospace"
          fontSize="20"
          fontWeight="700"
        >
          ₹8,000
        </text>
        {/* Budget bar */}
        <rect x="188" y="118" width="124" height="6" rx="3" fill="#134E4A" />
        <rect x="188" y="118" width="78" height="6" rx="3" fill="#5EEAD4" />

        {/* Mini expense rows */}
        <circle cx="192" cy="156" r="9" fill="#CCFBF1" />
        <path d="M189 156L191.5 158.5L195.5 153.5" stroke="#0F766E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="208" y="151" width="58" height="5" rx="2.5" fill="#334155" opacity="0.8" />
        <rect x="208" y="160" width="38" height="4" rx="2" fill="#94A3B8" />
        <text x="284" y="160" fill="#0F766E" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="600">
          ₹90
        </text>

        <line x1="184" y1="176" x2="316" y2="176" stroke="#F1F5F9" strokeWidth="1.5" />

        <circle cx="192" cy="196" r="9" fill="#FEF3C7" />
        <circle cx="192" cy="196" r="3.5" fill="#D97706" />
        <rect x="208" y="191" width="52" height="5" rx="2.5" fill="#334155" opacity="0.8" />
        <rect x="208" y="200" width="32" height="4" rx="2" fill="#94A3B8" />
        <text x="284" y="200" fill="#334155" fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="600">
          ₹30
        </text>
      </g>

      {/* Right: Steaming Chai Cup + Coin */}
      <g>
        {/* Steam wisps */}
        <path d="M368 156C365 148 372 142 368 134" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <path d="M382 154C379 145 386 139 382 130" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        {/* Cup body */}
        <path d="M352 166H398L392 216C391.4 221.5 386.8 226 381.2 226H368.8C363.2 226 358.6 221.5 358 216L352 166Z" fill="#D97706" />
        <path d="M352 166H398V174H352V166Z" fill="#F59E0B" />
        {/* Cup handle */}
        <path d="M396 178H404C408.4 178 412 181.6 412 186V194C412 198.4 408.4 202 404 202H394" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />

        {/* Floating Rupee Coin */}
        <circle cx="384" cy="90" r="22" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
        <text
          x="377"
          y="97"
          fill="#B45309"
          fontFamily="JetBrains Mono, monospace"
          fontSize="20"
          fontWeight="700"
        >
          ₹
        </text>
      </g>
    </svg>
  );
}

export function EmptySplitsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Illustration of hostel friends sharing a canteen bill and splitting expenses"
    >
      <rect width="320" height="200" rx="16" fill="#F8FAFC" />

      {/* Center Receipt Card */}
      <rect x="104" y="28" width="112" height="142" rx="12" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
      <rect x="120" y="44" width="80" height="24" rx="6" fill="#F0FDFA" />
      <text
        x="137"
        y="60"
        fill="#0F766E"
        fontFamily="JetBrains Mono, monospace"
        fontSize="12"
        fontWeight="700"
      >
        SPLIT ₹
      </text>

      {/* Receipt Lines */}
      <rect x="120" y="82" width="46" height="5" rx="2.5" fill="#94A3B8" />
      <rect x="176" y="82" width="24" height="5" rx="2.5" fill="#0F766E" opacity="0.7" />
      <rect x="120" y="98" width="52" height="5" rx="2.5" fill="#CBD5E1" />
      <rect x="176" y="98" width="24" height="5" rx="2.5" fill="#0F766E" opacity="0.7" />
      <rect x="120" y="114" width="40" height="5" rx="2.5" fill="#CBD5E1" />
      <rect x="176" y="114" width="24" height="5" rx="2.5" fill="#0F766E" opacity="0.7" />

      <line x1="120" y1="132" x2="200" y2="132" stroke="#E2E8F0" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="120" y="144" width="80" height="12" rx="6" fill="#0F766E" opacity="0.14" />

      {/* Left Student Avatar */}
      <circle cx="60" cy="96" r="24" fill="#CCFBF1" stroke="#0F766E" strokeWidth="1.5" />
      <circle cx="60" cy="89" r="8" fill="#0F766E" />
      <path d="M45 113C48 105 53.5 101 60 101C66.5 101 72 105 75 113" fill="#0F766E" />

      {/* Right Student Avatar */}
      <circle cx="260" cy="96" r="24" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="260" cy="89" r="8" fill="#D97706" />
      <path d="M245 113C248 105 253.5 101 260 101C266.5 101 272 105 275 113" fill="#D97706" />

      {/* Connector arrows */}
      <path d="M88 96H100" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" />
      <path d="M220 96H232" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" />
    </svg>
  );
}
