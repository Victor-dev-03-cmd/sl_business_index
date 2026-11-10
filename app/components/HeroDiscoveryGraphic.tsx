import { memo } from "react";

// Static, local SVG: no image requests, map SDK, filters or animation library.
// Four pin LEDs illuminate only once on entry (and not at all with reduced motion).
const mapPins = [
  { id: "north", x: 309, y: 167, delay: "0ms" },
  { id: "central", x: 351, y: 284, delay: "160ms" },
  { id: "west", x: 288, y: 345, delay: "320ms" },
  { id: "south", x: 340, y: 429, delay: "480ms" },
] as const;

const islandOutline =
  "M307 80C294 105 288 120 288 140C290 164 276 175 265 192" +
  "C249 217 242 243 245 264C248 289 261 301 260 320" +
  "C259 341 275 360 288 379C300 397 307 423 324 448" +
  "C341 475 350 485 364 489C381 485 395 466 405 445" +
  "C417 418 416 390 407 366C400 341 385 322 382 305" +
  "C376 285 388 269 391 249C394 226 383 208 371 186" +
  "C364 169 367 151 356 132C346 113 327 92 307 80Z";

function HeroDiscoveryGraphic() {
  return (
    <div
      className="relative z-10 mx-auto w-full max-w-[425px] select-none sm:max-w-[490px] lg:max-w-[610px]"
      role="img"
      aria-label="Illustrated Sri Lanka business discovery network with glowing location pins and nearby services"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 640 560"
        fill="none"
        className="block h-auto w-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="discovery-island" x1="270" y1="90" x2="405" y2="486" gradientUnits="userSpaceOnUse">
            <stop stopColor="#254F41" />
            <stop offset="0.56" stopColor="#193D33" />
            <stop offset="1" stopColor="#102F29" />
          </linearGradient>
          <linearGradient id="discovery-coast" x1="260" y1="90" x2="420" y2="475" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ECD49C" stopOpacity="0.92" />
            <stop offset="0.6" stopColor="#78D2A7" stopOpacity="0.90" />
            <stop offset="1" stopColor="#4DB78D" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="discovery-route" x1="291" y1="160" x2="346" y2="443" gradientUnits="userSpaceOnUse">
            <stop stopColor="#E5D19A" />
            <stop offset="1" stopColor="#75F0BD" />
          </linearGradient>
          <radialGradient id="discovery-led-halo">
            <stop stopColor="#84FBC8" stopOpacity="0.28" />
            <stop offset="0.55" stopColor="#65DEA7" stopOpacity="0.09" />
            <stop offset="1" stopColor="#65DEA7" stopOpacity="0" />
          </radialGradient>
          <pattern id="discovery-grid" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="#92C8A9" opacity="0.13" />
          </pattern>
        </defs>

        {/* Calm cartographic background, with no scrolling or looping work. */}
        <rect x="35" y="23" width="570" height="513" rx="42" fill="url(#discovery-grid)" />
        <circle cx="328" cy="285" r="244" stroke="#A4BFA5" strokeOpacity="0.14" />
        <circle cx="328" cy="285" r="199" stroke="#C4B68C" strokeOpacity="0.15" strokeDasharray="3 11" />
        <circle cx="328" cy="285" r="153" stroke="#6DD3A7" strokeOpacity="0.11" />
        <path d="M328 36V58M328 510V533M78 285H101M557 285H580" stroke="#DCC998" strokeOpacity="0.40" strokeWidth="1.5" strokeLinecap="round" />
        <text x="49" y="54" fill="#C9E1CD" fontSize="11" fontWeight="700" letterSpacing="2.1">DISCOVERY MAP</text>
        <text x="590" y="54" fill="#EFD8A3" textAnchor="end" fontSize="10" letterSpacing="1.5">SRI LANKA</text>

        {/* Stylized island silhouette: a decorative discovery map, not a GPS chart. */}
        <path d={islandOutline} fill="#68C59B" fillOpacity="0.05" stroke="#77D4AB" strokeOpacity="0.08" strokeWidth="19" />
        <path d={islandOutline} fill="url(#discovery-island)" stroke="url(#discovery-coast)" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M296 128C307 157 288 184 295 211M389 300C386 330 401 360 399 389" stroke="#B5D7B3" strokeOpacity=".20" strokeWidth="1.2" strokeDasharray="4 7" />

        {/* Business connections remain static to keep CPU/GPU cost minimal. */}
        <path
          d="M309 167C307 218 331 248 351 284C333 313 302 326 288 345C294 386 321 410 340 429"
          stroke="#75F0BD"
          strokeOpacity="0.09"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M309 167C307 218 331 248 351 284C333 313 302 326 288 345C294 386 321 410 340 429"
          stroke="url(#discovery-route)"
          strokeWidth="2.5"
          strokeDasharray="5 8"
          strokeLinecap="round"
        />

        {mapPins.map(pin => (
          <g key={pin.id}>
            <circle cx={pin.x} cy={pin.y} r="39" fill="url(#discovery-led-halo)" />
            <circle cx={pin.x} cy={pin.y} r="18" fill="#75F0BD" fillOpacity="0.06" stroke="#88F5C4" strokeOpacity="0.45" />
            <circle
              className="hero-discovery-led"
              style={{ animationDelay: pin.delay }}
              cx={pin.x}
              cy={pin.y}
              r="8"
              fill="#8EFFD0"
              fillOpacity="0.95"
            />
            <circle cx={pin.x} cy={pin.y} r="3.3" fill="#FFFFFF" />
          </g>
        ))}

        {/* Context chips are SVG-native so they do not trigger custom element work. */}
        <g>
          <path d="M170 200H235L274 225" stroke="#96DDB6" strokeOpacity="0.50" strokeWidth="1.5" strokeDasharray="4 5" />
          <rect x="21" y="155" width="168" height="93" rx="19" fill="#173B32" stroke="#6FAE90" strokeOpacity="0.55" />
          <rect x="36" y="170" width="31" height="31" rx="9" fill="#2C6550" />
          <path d="M47 191L57 181M49 181H57V189" stroke="#DDFDE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="78" y="183" fill="#A9EAC4" fontSize="10" fontWeight="700" letterSpacing="1.2">EXPLORE</text>
          <text x="78" y="199" fill="#FFFFFF" fontSize="13.5" fontWeight="700">Local businesses</text>
          <path d="M38 215H164" stroke="#A7D9B9" strokeOpacity="0.18" />
          <circle cx="44" cy="230" r="3.5" fill="#89EFBF" />
          <text x="55" y="234" fill="#C5DFCD" fontSize="10.5">Discover across the island</text>
        </g>

        <g>
          <path d="M376 306L433 291H459" stroke="#9BEEBD" strokeOpacity="0.60" strokeWidth="1.5" strokeDasharray="4 5" />
          <rect x="443" y="240" width="181" height="98" rx="19" fill="#173B32" stroke="#81D7A7" strokeOpacity="0.58" />
          <circle cx="468" cy="266" r="11" fill="#3E8066" />
          <path d="M468 260C460 260 460 270 468 277C476 270 476 260 468 260ZM468 266.7h.01" stroke="#D2FFE8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <text x="486" y="270" fill="#99EBC0" fontSize="10.5" fontWeight="700" letterSpacing="1.2">NEARBY</text>
          <text x="458" y="298" fill="#FFFFFF" fontSize="16" fontWeight="700">Find services</text>
          <text x="458" y="318" fill="#BDDDC9" fontSize="11">Close to where you are</text>
        </g>

        {/* Location labels are geographic cues, not an interactive map. */}
        <g>
          <rect x="355" y="137" width="69" height="27" rx="10" fill="#23473C" stroke="#8CE2B1" strokeOpacity="0.35" />
          <text x="389.5" y="155" fill="#D8F6E5" fontSize="11" fontWeight="600" textAnchor="middle">Jaffna</text>
          <rect x="385" y="343" width="68" height="27" rx="10" fill="#23473C" stroke="#8CE2B1" strokeOpacity="0.35" />
          <text x="419" y="361" fill="#D8F6E5" fontSize="11" fontWeight="600" textAnchor="middle">Kandy</text>
          <rect x="181" y="369" width="77" height="27" rx="10" fill="#23473C" stroke="#8CE2B1" strokeOpacity="0.35" />
          <text x="219.5" y="387" fill="#D8F6E5" fontSize="11" fontWeight="600" textAnchor="middle">Colombo</text>
        </g>

        <g>
          <rect x="194" y="494" width="259" height="43" rx="21" fill="#15382F" stroke="#A8D8AE" strokeOpacity="0.32" />
          <circle cx="222" cy="515" r="10" fill="#326E55" />
          <path d="M218 515L221 518L227 511" stroke="#E2FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="244" y="519" fill="#E4F6E7" fontSize="12.5" fontWeight="600">Discover · Connect · Grow</text>
        </g>
      </svg>
    </div>
  );
}

export default memo(HeroDiscoveryGraphic);
