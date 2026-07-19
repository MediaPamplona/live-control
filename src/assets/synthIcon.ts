const SYNTH_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5a5e"/>
      <stop offset="1" stop-color="#1c1c1e"/>
    </linearGradient>
    <radialGradient id="knobBlue" cx="0.32" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#7dd3fc"/>
      <stop offset="1" stop-color="#0a84ff"/>
    </radialGradient>
    <radialGradient id="knobOrange" cx="0.32" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#ffb26b"/>
      <stop offset="1" stop-color="#ff6b00"/>
    </radialGradient>
    <radialGradient id="knobPurple" cx="0.32" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#d6b4ff"/>
      <stop offset="1" stop-color="#8a3ffc"/>
    </radialGradient>
  </defs>

  <rect x="4" y="8" width="56" height="42" rx="7" fill="url(#body)" stroke="#000" stroke-opacity="0.4" stroke-width="1"/>
  <rect x="6" y="10" width="52" height="5" rx="2.5" fill="#ffffff" opacity="0.08"/>

  <circle cx="15" cy="21" r="5.5" fill="url(#knobBlue)" stroke="#000" stroke-opacity="0.3" stroke-width="0.6"/>
  <circle cx="32" cy="21" r="5.5" fill="url(#knobOrange)" stroke="#000" stroke-opacity="0.3" stroke-width="0.6"/>
  <circle cx="49" cy="21" r="5.5" fill="url(#knobPurple)" stroke="#000" stroke-opacity="0.3" stroke-width="0.6"/>
  <line x1="15" y1="21" x2="15" y2="16.5" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="32" y1="21" x2="35.2" y2="18" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="49" y1="21" x2="45.8" y2="18" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>

  <rect x="9" y="30" width="3" height="11" rx="1.5" fill="#3a3a3c"/>
  <circle cx="10.5" cy="33.5" r="2.3" fill="#e5e5ea"/>
  <rect x="18" y="30" width="3" height="11" rx="1.5" fill="#3a3a3c"/>
  <circle cx="19.5" cy="37.5" r="2.3" fill="#e5e5ea"/>
  <rect x="27" y="30" width="3" height="11" rx="1.5" fill="#3a3a3c"/>
  <circle cx="28.5" cy="35" r="2.3" fill="#e5e5ea"/>
  <rect x="36" y="30" width="3" height="11" rx="1.5" fill="#3a3a3c"/>
  <circle cx="37.5" cy="34" r="2.3" fill="#e5e5ea"/>

  <circle cx="52" cy="35" r="2.2" fill="#30d158"/>
  <circle cx="52" cy="35" r="2.2" fill="#30d158" opacity="0.5">
    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
  </circle>

  <rect x="6" y="44" width="52" height="8" rx="1.5" fill="#f2f2f2"/>
  <rect x="6" y="44" width="52" height="8" rx="1.5" fill="none" stroke="#8e8e93" stroke-width="0.6"/>
  <g fill="#1c1c1e">
    <rect x="12.5" y="44" width="3" height="5" rx="0.5"/>
    <rect x="19.5" y="44" width="3" height="5" rx="0.5"/>
    <rect x="29.5" y="44" width="3" height="5" rx="0.5"/>
    <rect x="36.5" y="44" width="3" height="5" rx="0.5"/>
    <rect x="43.5" y="44" width="3" height="5" rx="0.5"/>
  </g>
</svg>
`.trim()

export const SYNTH_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(SYNTH_SVG)}`
