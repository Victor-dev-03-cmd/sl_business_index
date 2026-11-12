import type { ReactNode } from "react";

/** Local SVG artwork: no remote requests, animation libraries, raster downloads or extra JS. */
export function GrowthConstellation() {
  const card = (x: number, y: number, title: string, subtitle: string, n: string, width = 174): ReactNode => (
    <g key={title} transform={"translate(" + x + " " + y + ")"}>
      <rect width={width} height="87" rx="16" fill="#ffffff" stroke="#d7e7dc" strokeWidth="1.5"/>
      <circle cx="27" cy="27" r="13" fill="#e7f3ea"/>
      <text x="27" y="32" textAnchor="middle" fontSize="12" fontWeight="800" fill="#367b58">{n}</text>
      <text x="18" y="57" fontSize="15" fontWeight="750" fill="#183a2c">{title}</text>
      <text x="18" y="73" fontSize="10.5" fill="#6d8172">{subtitle}</text>
    </g>
  );

  return (
    <svg viewBox="0 0 730 568" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-labelledby="about-constellation-title about-constellation-desc" className="block h-auto w-full">
      <title id="about-constellation-title">SL Business Index connected growth operating system</title>
      <desc id="about-constellation-desc">A central business workspace connected conceptually to discovery, engagement, growth, campaigns, trust and insights.</desc>
      <defs>
        <radialGradient id="about-bg-glow" cx="50%" cy="48%" r="59%">
          <stop offset="0" stopColor="#d6ebda" stopOpacity=".86"/>
          <stop offset=".67" stopColor="#edf5eb" stopOpacity=".45"/>
          <stop offset="1" stopColor="#f7faf4" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="about-core-fill" x1="245" y1="170" x2="495" y2="388" gradientUnits="userSpaceOnUse">
          <stop stopColor="#204c38"/>
          <stop offset="1" stopColor="#10271f"/>
        </linearGradient>
        <linearGradient id="about-core-border" x1="251" y1="168" x2="489" y2="387" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9bc19b"/>
          <stop offset="1" stopColor="#396c52"/>
        </linearGradient>
        <pattern id="about-dots" width="23" height="23" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1.25" fill="#adcfb3" opacity=".4"/>
        </pattern>
        <filter id="about-shadow" x="-30%" y="-35%" width="160%" height="170%">
          <feDropShadow dx="0" dy="18" stdDeviation="21" floodColor="#164331" floodOpacity=".15"/>
        </filter>
      </defs>
      <rect width="730" height="568" rx="28" fill="#f8faf5"/>
      <rect width="730" height="568" rx="28" fill="url(#about-dots)"/>
      <ellipse cx="366" cy="282" rx="320" ry="239" fill="url(#about-bg-glow)"/>
      <circle cx="365" cy="285" r="215" fill="none" stroke="#bdd7c6" strokeDasharray="5 9" opacity=".6"/>
      <circle cx="365" cy="285" r="154" fill="none" stroke="#b0d0b9" opacity=".45"/>
      <g fill="none" stroke="#75a888" strokeWidth="2" strokeLinecap="round">
        <path d="M292 235L223 138"/><path d="M439 235L510 138"/>
        <path d="M287 325L223 438"/><path d="M445 325L507 438"/>
        <path d="M365 183V106"/><path d="M365 388V460"/>
      </g>
      <g fill="#eac187" stroke="#ffffff" strokeWidth="3">
        <circle cx="223" cy="138" r="6"/><circle cx="510" cy="138" r="6"/>
        <circle cx="223" cy="438" r="6"/><circle cx="507" cy="438" r="6"/>
        <circle cx="365" cy="106" r="6"/><circle cx="365" cy="460" r="6"/>
      </g>
      <g filter="url(#about-shadow)">
        <rect x="247" y="181" width="236" height="211" rx="25" fill="url(#about-core-fill)" stroke="url(#about-core-border)" strokeWidth="2"/>
        <rect x="263" y="197" width="204" height="179" rx="17" fill="none" stroke="#d1eacb" strokeOpacity=".18"/>
      </g>
      <g>
        <circle cx="365" cy="240" r="29" fill="#d3e5ce" fillOpacity=".1" stroke="#c5e2c9" strokeOpacity=".45"/>
        <path d="M350 243l10-11 8 8 13-15" fill="none" stroke="#e3c187" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="381" cy="225" r="3.8" fill="#e3c187"/>
        <text x="365" y="294" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fffaf1" letterSpacing="2">SL BUSINESS INDEX</text>
        <text x="365" y="318" textAnchor="middle" fontSize="14" fontWeight="600" fill="#d6ead8" letterSpacing="1.4">GROWTH OS</text>
        <rect x="297" y="339" width="136" height="23" rx="11.5" fill="#e8c287" fillOpacity=".13" stroke="#e8c287" strokeOpacity=".35"/>
        <text x="365" y="355" textAnchor="middle" fontSize="10" fontWeight="700" fill="#f1d3a2">CONNECTED VISION</text>
      </g>
      {card(39, 90, "Discover", "Find local businesses", "01")}
      {card(517, 90, "Connect", "Meaningful contact", "02")}
      {card(39, 391, "Promote", "Business visibility", "03")}
      {card(517, 391, "Protect", "Responsible security", "04")}
      <g transform="translate(278 15)">
        <rect width="174" height="84" rx="16" fill="#ffffff" stroke="#d7e7dc" strokeWidth="1.5"/>
        <circle cx="27" cy="27" r="13" fill="#e7f3ea"/>
        <text x="27" y="32" textAnchor="middle" fontSize="12" fontWeight="800" fill="#367b58">05</text>
        <text x="18" y="57" fontSize="15" fontWeight="750" fill="#183a2c">Grow</text>
        <text x="18" y="73" fontSize="10.5" fill="#6d8172">New opportunities</text>
      </g>
      <g transform="translate(278 468)">
        <rect width="174" height="84" rx="16" fill="#ffffff" stroke="#d7e7dc" strokeWidth="1.5"/>
        <circle cx="27" cy="27" r="13" fill="#e7f3ea"/>
        <text x="27" y="32" textAnchor="middle" fontSize="12" fontWeight="800" fill="#367b58">06</text>
        <text x="18" y="57" fontSize="15" fontWeight="750" fill="#183a2c">Understand</text>
        <text x="18" y="73" fontSize="10.5" fill="#6d8172">Useful business signals</text>
      </g>
      <text x="16" y="556" fontSize="9" fill="#77927d" letterSpacing=".3">Illustration of our product direction — not a live feature status map</text>
    </svg>
  );
}

export function GrowthJourneyIllustration() {
  return (
    <svg viewBox="0 0 670 365" role="img" aria-labelledby="about-journey-title about-journey-desc"
      xmlns="http://www.w3.org/2000/svg" className="h-auto w-full">
      <title id="about-journey-title">Connected local business discovery and growth journey</title>
      <desc id="about-journey-desc">A listing card leads to a customer connection, which leads to useful business insights and improvements.</desc>
      <defs>
        <linearGradient id="about-journey-grad" x1="0" y1="0" x2="670" y2="365">
          <stop stopColor="#e4efe3"/><stop offset="1" stopColor="#f7f5e9"/>
        </linearGradient>
      </defs>
      <rect width="670" height="365" rx="22" fill="url(#about-journey-grad)"/>
      <g opacity=".4" stroke="#a3c7ae" strokeWidth="1.1" fill="none">
        <circle cx="326" cy="187" r="130"/><circle cx="326" cy="187" r="171"/>
      </g>
      <path d="M181 169C232 115 279 115 337 163S444 235 503 183" stroke="#5b9874" strokeWidth="2.5" strokeDasharray="6 9" fill="none"/>
      <path d="M493 180l15-3-7 14" stroke="#5b9874" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <rect x="39" y="65" width="208" height="221" rx="18" fill="#fff" stroke="#d7e4d9" strokeWidth="2"/>
      <rect x="54" y="81" width="178" height="96" rx="10" fill="#eaf2e8"/>
      <path d="M77 153h132l-22-36-32 25-21-14-19 20-12-7Z" fill="#a1c8ac"/>
      <circle cx="111" cy="110" r="13" fill="#f4d7a2"/>
      <rect x="55" y="189" width="81" height="7" rx="3.5" fill="#2d6247"/>
      <rect x="55" y="204" width="141" height="6" rx="3" fill="#d7e3d8"/>
      <rect x="55" y="219" width="112" height="6" rx="3" fill="#e3e8e1"/>
      <rect x="55" y="244" width="95" height="28" rx="8" fill="#26533c"/>
      <text x="103" y="262" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">Get discovered</text>
      <circle cx="245" cy="86" r="22" fill="#c78c4f"/>
      <path d="M237 86l6 6 11-14" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <rect x="276" y="116" width="184" height="135" rx="18" fill="#204b37" stroke="#668d74" strokeWidth="2"/>
      <rect x="292" y="136" width="151" height="13" rx="6.5" fill="#749b82"/>
      <rect x="292" y="163" width="119" height="8" rx="4" fill="#a6c1ad"/>
      <rect x="292" y="181" width="137" height="8" rx="4" fill="#608c6b"/>
      <rect x="292" y="214" width="95" height="21" rx="7" fill="#e6c48e"/>
      <text x="340" y="228" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#234b36">Connect</text>
      <rect x="467" y="83" width="166" height="187" rx="17" fill="#fff" stroke="#d7e4d9" strokeWidth="2"/>
      <text x="483" y="110" fontSize="11" fontWeight="800" fill="#356d50">Growth insights</text>
      <path d="M483 229h132M487 224v-58M486 217l34-16 25 7 31-47 38-30" fill="none" stroke="#c2d5c4" strokeWidth="2"/>
      <path d="M486 217l34-16 25 7 31-47 38-30" fill="none" stroke="#4a9b72" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="613" cy="131" r="5" fill="#e3b979" stroke="white" strokeWidth="2"/>
      <rect x="483" y="242" width="95" height="6" rx="3" fill="#d7e1d8"/>
      <text x="44" y="330" fontSize="14" fontWeight="800" fill="#254e3a">Find.</text>
      <text x="133" y="330" fontSize="14" fontWeight="800" fill="#254e3a">Connect.</text>
      <text x="247" y="330" fontSize="14" fontWeight="800" fill="#254e3a">Improve.</text>
      <text x="44" y="348" fontSize="10.2" fill="#769381">Business listing is the starting point, not the finish line.</text>
    </svg>
  );
}

export function PrivacyShieldIllustration() {
  return (
    <svg viewBox="0 0 500 300" role="img" aria-labelledby="about-privacy-title" className="h-auto w-full" xmlns="http://www.w3.org/2000/svg">
      <title id="about-privacy-title">Separate privacy-aware growth analytics and operational security</title>
      <defs><linearGradient id="about-shield-fill" x1="0" y1="0" x2="500" y2="300">
        <stop stopColor="#1b4534"/><stop offset="1" stopColor="#346d4f"/>
      </linearGradient></defs>
      <rect width="500" height="300" rx="20" fill="#ecf2e9"/>
      <path d="M84 165H215M280 165H416" stroke="#91bd99" strokeWidth="2.3" strokeDasharray="5 8"/>
      <rect x="22" y="123" width="144" height="84" rx="14" fill="white" stroke="#c9dfcb"/>
      <rect x="337" y="123" width="141" height="84" rx="14" fill="white" stroke="#c9dfcb"/>
      <text x="94" y="151" textAnchor="middle" fontSize="13" fontWeight="750" fill="#244e37">Operations</text>
      <text x="94" y="169" textAnchor="middle" fontSize="10.5" fill="#6e8b75">Access &amp; safety</text>
      <text x="94" y="186" textAnchor="middle" fontSize="10" fill="#8ca090">Restricted events</text>
      <text x="408" y="151" textAnchor="middle" fontSize="13" fontWeight="750" fill="#244e37">Growth</text>
      <text x="408" y="169" textAnchor="middle" fontSize="10.5" fill="#6e8b75">Consented metrics</text>
      <text x="408" y="186" textAnchor="middle" fontSize="10" fill="#8ca090">Aggregated insights</text>
      <path d="M250 47l75 34v71c0 48-32 83-75 103-43-20-75-55-75-103V81Z" fill="url(#about-shield-fill)" stroke="#abd1af" strokeWidth="3"/>
      <path d="M250 75l52 23v52c0 32-22 58-52 74-30-16-52-42-52-74V98Z" fill="none" stroke="#9aca9d" strokeOpacity=".5"/>
      <rect x="233" y="126" width="34" height="31" rx="5" fill="#f2ddad"/>
      <path d="M239 126v-11a11 11 0 0 1 22 0v11" fill="none" stroke="#f2ddad" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="250" cy="140" r="3" fill="#30543d"/>
      <path d="M250 143v6" stroke="#30543d" strokeWidth="2" strokeLinecap="round"/>
      <text x="250" y="275" textAnchor="middle" fontSize="11" fontWeight="750" fill="#47765b">Privacy by design</text>
    </svg>
  );
}
