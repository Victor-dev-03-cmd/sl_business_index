import { memo } from "react";

// Coastline source: Natural Earth admin-0 vector (public domain), via
// eFrane/admin0/asia/LK.geojson. Polygon simplified to ~1 SVG pixel offline.
// Pins are projected from geographic coordinates; no runtime maps or requests.
// This is a decorative business-discovery map, not an administrative boundary map.
const mainland = "M306.3 96.8 L333.9 119.9 L339.3 126.6 L333.1 125.1 L338.8 131.2 L340.8 132.4 L339.8 129.0 L341.8 129.1 L347.6 142.2 L343.4 141.1 L342.9 142.5 L346.7 144.1 L347.0 146.5 L349.1 145.1 L351.1 150.8 L355.3 155.4 L353.9 157.2 L352.5 155.1 L347.0 153.0 L352.9 160.9 L350.9 163.1 L354.2 164.3 L357.3 159.4 L364.1 169.5 L368.7 172.7 L370.8 178.1 L374.4 180.5 L377.1 188.6 L377.7 187.2 L379.2 187.9 L382.6 193.6 L382.6 195.4 L379.9 197.8 L381.9 197.1 L384.4 204.5 L381.9 204.9 L382.4 203.3 L380.6 201.7 L380.5 208.5 L375.3 205.7 L372.8 209.1 L376.4 207.1 L382.9 212.8 L387.5 212.7 L389.1 211.7 L388.1 209.3 L391.7 207.7 L395.2 209.7 L398.4 223.4 L394.6 219.2 L395.1 223.6 L399.3 226.0 L404.3 248.0 L402.5 250.6 L399.8 241.3 L399.0 247.1 L403.0 251.6 L405.9 249.2 L411.4 261.3 L412.8 259.9 L413.4 262.7 L415.5 261.3 L415.5 265.6 L419.0 269.9 L417.0 272.8 L418.2 276.3 L420.2 278.8 L423.1 278.4 L430.7 291.2 L428.5 291.9 L422.1 286.2 L419.0 289.7 L425.3 290.0 L430.6 297.6 L430.6 300.5 L430.8 298.3 L434.3 300.5 L436.7 306.2 L436.7 310.8 L435.2 312.7 L437.4 316.2 L436.5 317.8 L438.8 316.9 L440.2 322.6 L441.5 315.7 L442.9 316.9 L447.5 331.3 L447.9 367.3 L442.6 389.7 L437.4 400.3 L437.0 405.8 L427.6 421.2 L391.9 447.9 L379.9 452.4 L378.2 450.4 L377.1 453.6 L370.7 456.8 L349.7 461.9 L345.7 465.1 L340.3 465.6 L330.9 473.7 L325.0 473.7 L318.5 477.2 L313.4 475.1 L305.9 475.4 L303.8 472.3 L300.6 473.4 L295.3 471.5 L293.5 472.3 L279.8 466.6 L268.8 455.1 L262.6 441.6 L260.6 431.7 L255.8 420.2 L257.2 419.5 L256.4 413.6 L245.7 385.3 L244.2 376.7 L245.6 364.0 L240.8 346.5 L241.5 343.9 L244.2 352.5 L245.6 347.9 L244.9 345.3 L242.1 343.4 L242.8 341.1 L237.3 302.6 L238.7 302.6 L239.6 296.7 L229.1 251.1 L230.1 246.5 L229.1 238.5 L232.3 235.3 L237.3 224.9 L233.9 232.0 L237.3 234.2 L234.0 239.8 L232.2 249.7 L232.4 252.8 L234.6 255.6 L232.6 259.9 L235.8 262.3 L240.4 262.7 L242.8 261.0 L238.8 253.7 L242.1 247.1 L239.9 237.5 L242.1 232.4 L246.8 205.3 L251.1 201.4 L253.6 194.5 L254.5 184.3 L252.1 177.9 L252.4 169.3 L251.0 163.7 L264.2 154.5 L270.0 137.2 L271.2 126.0 L266.0 122.7 L264.7 116.6 L273.5 112.5 L279.1 108.0 L275.6 103.1 L264.7 95.3 L282.8 101.7 L286.6 104.8 L286.0 108.7 L288.1 110.2 L302.1 105.3 L320.9 110.9 L306.6 102.4 L302.3 103.4 L296.3 102.1 L289.2 95.8 L278.0 89.8 L276.8 89.8 L277.0 92.3 L279.4 95.0 L278.8 96.3 L268.8 90.2 L273.0 94.5 L268.2 93.0 L254.1 85.2 L250.4 77.4 L258.3 71.7 L271.7 72.1 L272.4 76.4 L281.7 78.8 L293.3 91.8 L303.8 97.4 L291.4 87.3 L284.2 78.7 L273.3 74.2 L273.1 72.6 L275.2 71.7 L284.1 71.4 L300.4 93.1 L306.3 96.8 Z";
const offshoreIslands = ["M441.7 314.2 L440.2 315.4 L438.2 313.6 L438.2 303.6 L433.3 296.6 L431.9 288.3 L440.1 303.0 L441.7 314.2 Z","M247.7 151.7 L251.1 155.1 L244.9 153.0 L250.4 160.1 L248.0 159.7 L239.4 152.2 L229.2 148.0 L230.8 146.5 L235.3 146.5 L247.7 151.7 Z","M230.9 106.8 L225.0 104.9 L225.3 99.5 L227.1 101.6 L231.3 102.7 L232.5 105.3 L230.9 106.8 Z","M249.7 86.7 L252.1 86.7 L252.8 89.2 L257.2 92.3 L249.0 93.1 L247.5 91.9 L243.5 84.5 L245.5 78.6 L248.8 78.5 L248.3 83.4 L249.7 86.7 Z"];
const coastline = "M306.3 96.8 L333.9 119.9 L339.3 126.6 L333.1 125.1 L338.8 131.2 L340.8 132.4 L339.8 129.0 L341.8 129.1 L347.6 142.2 L343.4 141.1 L342.9 142.5 L346.7 144.1 L347.0 146.5 L349.1 145.1 L351.1 150.8 L355.3 155.4 L353.9 157.2 L352.5 155.1 L347.0 153.0 L352.9 160.9 L350.9 163.1 L354.2 164.3 L357.3 159.4 L364.1 169.5 L368.7 172.7 L370.8 178.1 L374.4 180.5 L377.1 188.6 L377.7 187.2 L379.2 187.9 L382.6 193.6 L382.6 195.4 L379.9 197.8 L381.9 197.1 L384.4 204.5 L381.9 204.9 L382.4 203.3 L380.6 201.7 L380.5 208.5 L375.3 205.7 L372.8 209.1 L376.4 207.1 L382.9 212.8 L387.5 212.7 L389.1 211.7 L388.1 209.3 L391.7 207.7 L395.2 209.7 L398.4 223.4 L394.6 219.2 L395.1 223.6 L399.3 226.0 L404.3 248.0 L402.5 250.6 L399.8 241.3 L399.0 247.1 L403.0 251.6 L405.9 249.2 L411.4 261.3 L412.8 259.9 L413.4 262.7 L415.5 261.3 L415.5 265.6 L419.0 269.9 L417.0 272.8 L418.2 276.3 L420.2 278.8 L423.1 278.4 L430.7 291.2 L428.5 291.9 L422.1 286.2 L419.0 289.7 L425.3 290.0 L430.6 297.6 L430.6 300.5 L430.8 298.3 L434.3 300.5 L436.7 306.2 L436.7 310.8 L435.2 312.7 L437.4 316.2 L436.5 317.8 L438.8 316.9 L440.2 322.6 L441.5 315.7 L442.9 316.9 L447.5 331.3 L447.9 367.3 L442.6 389.7 L437.4 400.3 L437.0 405.8 L427.6 421.2 L391.9 447.9 L379.9 452.4 L378.2 450.4 L377.1 453.6 L370.7 456.8 L349.7 461.9 L345.7 465.1 L340.3 465.6 L330.9 473.7 L325.0 473.7 L318.5 477.2 L313.4 475.1 L305.9 475.4 L303.8 472.3 L300.6 473.4 L295.3 471.5 L293.5 472.3 L279.8 466.6 L268.8 455.1 L262.6 441.6 L260.6 431.7 L255.8 420.2 L257.2 419.5 L256.4 413.6 L245.7 385.3 L244.2 376.7 L245.6 364.0 L240.8 346.5 L241.5 343.9 L244.2 352.5 L245.6 347.9 L244.9 345.3 L242.1 343.4 L242.8 341.1 L237.3 302.6 L238.7 302.6 L239.6 296.7 L229.1 251.1 L230.1 246.5 L229.1 238.5 L232.3 235.3 L237.3 224.9 L233.9 232.0 L237.3 234.2 L234.0 239.8 L232.2 249.7 L232.4 252.8 L234.6 255.6 L232.6 259.9 L235.8 262.3 L240.4 262.7 L242.8 261.0 L238.8 253.7 L242.1 247.1 L239.9 237.5 L242.1 232.4 L246.8 205.3 L251.1 201.4 L253.6 194.5 L254.5 184.3 L252.1 177.9 L252.4 169.3 L251.0 163.7 L264.2 154.5 L270.0 137.2 L271.2 126.0 L266.0 122.7 L264.7 116.6 L273.5 112.5 L279.1 108.0 L275.6 103.1 L264.7 95.3 L282.8 101.7 L286.6 104.8 L286.0 108.7 L288.1 110.2 L302.1 105.3 L320.9 110.9 L306.6 102.4 L302.3 103.4 L296.3 102.1 L289.2 95.8 L278.0 89.8 L276.8 89.8 L277.0 92.3 L279.4 95.0 L278.8 96.3 L268.8 90.2 L273.0 94.5 L268.2 93.0 L254.1 85.2 L250.4 77.4 L258.3 71.7 L271.7 72.1 L272.4 76.4 L281.7 78.8 L293.3 91.8 L303.8 97.4 L291.4 87.3 L284.2 78.7 L273.3 74.2 L273.1 72.6 L275.2 71.7 L284.1 71.4 L300.4 93.1 L306.3 96.8 Z M441.7 314.2 L440.2 315.4 L438.2 313.6 L438.2 303.6 L433.3 296.6 L431.9 288.3 L440.1 303.0 L441.7 314.2 Z M247.7 151.7 L251.1 155.1 L244.9 153.0 L250.4 160.1 L248.0 159.7 L239.4 152.2 L229.2 148.0 L230.8 146.5 L235.3 146.5 L247.7 151.7 Z M230.9 106.8 L225.0 104.9 L225.3 99.5 L227.1 101.6 L231.3 102.7 L232.5 105.3 L230.9 106.8 Z M249.7 86.7 L252.1 86.7 L252.8 89.2 L257.2 92.3 L249.0 93.1 L247.5 91.9 L243.5 84.5 L245.5 78.6 L248.8 78.5 L248.3 83.4 L249.7 86.7 Z";

const locations = [
  {
    "name": "Jaffna",
    "lat": 9.6685,
    "lon": 80.0074,
    "boxX": 151,
    "boxY": 54,
    "w": 72,
    "edgeX": 223,
    "edgeY": 68,
    "x": 260.2,
    "y": 87.8,
    "delay": "0ms"
  },
  {
    "name": "Kilinochchi",
    "lat": 9.3961,
    "lon": 80.3982,
    "boxX": 264,
    "boxY": 31,
    "w": 105,
    "edgeX": 302,
    "edgeY": 58,
    "x": 299.2,
    "y": 116.1,
    "delay": "95ms"
  },
  {
    "name": "Mullaitivu",
    "lat": 9.268,
    "lon": 80.815,
    "boxX": 381,
    "boxY": 112,
    "w": 95,
    "edgeX": 381,
    "edgeY": 128,
    "x": 340.9,
    "y": 129.4,
    "delay": "190ms"
  },
  {
    "name": "Mannar",
    "lat": 8.9778,
    "lon": 79.9093,
    "boxX": 153,
    "boxY": 177,
    "w": 73,
    "edgeX": 226,
    "edgeY": 188,
    "x": 250.4,
    "y": 159.6,
    "delay": "285ms"
  },
  {
    "name": "Anuradhapura",
    "lat": 8.3114,
    "lon": 80.4037,
    "boxX": 344,
    "boxY": 207,
    "w": 113,
    "edgeX": 344,
    "edgeY": 227,
    "x": 299.8,
    "y": 228.9,
    "delay": "380ms"
  },
  {
    "name": "Batticaloa",
    "lat": 7.7172,
    "lon": 81.702,
    "boxX": 478,
    "boxY": 261,
    "w": 98,
    "edgeX": 478,
    "edgeY": 278,
    "x": 429.6,
    "y": 290.7,
    "delay": "475ms"
  },
  {
    "name": "Kandy",
    "lat": 7.2906,
    "lon": 80.6337,
    "boxX": 363,
    "boxY": 346,
    "w": 70,
    "edgeX": 363,
    "edgeY": 358,
    "x": 322.8,
    "y": 335.1,
    "delay": "570ms"
  },
  {
    "name": "Colombo",
    "lat": 6.9275,
    "lon": 79.8484,
    "boxX": 141,
    "boxY": 384,
    "w": 80,
    "edgeX": 221,
    "edgeY": 398,
    "x": 244.3,
    "y": 372.8,
    "delay": "665ms"
  }
] as const;

function HeroDiscoveryGraphic() {
  return (
    <div
      className="relative z-10 mx-auto w-full max-w-[425px] select-none sm:max-w-[490px] lg:max-w-[610px]"
      role="img"
      aria-label="Neon outline of Sri Lanka with location markers for Jaffna, Kilinochchi, Mullaitivu, Mannar, Anuradhapura, Batticaloa, Kandy, and Colombo"
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
          <linearGradient id="island-map-fill" x1="260" y1="80" x2="400" y2="470" gradientUnits="userSpaceOnUse">
            <stop stopColor="#265647" stopOpacity="0.75" />
            <stop offset="0.53" stopColor="#173F35" stopOpacity="0.84" />
            <stop offset="1" stopColor="#10372F" stopOpacity="0.91" />
          </linearGradient>
          <linearGradient id="island-neon-coast" x1="255" y1="76" x2="454" y2="476" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F1D8A3" />
            <stop offset="0.38" stopColor="#A6E3BB" />
            <stop offset="0.73" stopColor="#67E2B0" />
            <stop offset="1" stopColor="#D4BD85" />
          </linearGradient>
          <linearGradient id="island-network" x1="260" y1="100" x2="440" y2="420" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EFD59A" />
            <stop offset="1" stopColor="#79F0BE" />
          </linearGradient>
          <radialGradient id="island-pin-halo">
            <stop stopColor="#82FFCD" stopOpacity="0.28" />
            <stop offset="0.57" stopColor="#82FFCD" stopOpacity="0.09" />
            <stop offset="1" stopColor="#82FFCD" stopOpacity="0" />
          </radialGradient>
          <pattern id="island-cartography-dots" width="29" height="29" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.85" fill="#98CDB2" opacity="0.17" />
          </pattern>
          <clipPath id="island-land-clip">
            <path d={mainland} />
          </clipPath>
        </defs>

        {/* Crisp architectural cartography: no CSS transforms or SVG blur filters. */}
        <rect x="30" y="24" width="580" height="514" rx="39" fill="url(#island-cartography-dots)" opacity="0.62" />
        <circle cx="334" cy="274" r="230" stroke="#B3C7AE" strokeOpacity="0.15" />
        <circle cx="334" cy="274" r="183" stroke="#D7C399" strokeOpacity="0.17" strokeDasharray="3 11" />
        <circle cx="334" cy="274" r="135" stroke="#85CAA8" strokeOpacity="0.12" />
        <path d="M334 21V43M334 505V530M73 274H97M568 274H593" stroke="#F3DCA7" strokeOpacity="0.36" strokeWidth="1.5" strokeLinecap="round" />
        <text x="38" y="51" fill="#CAE8D4" fontSize="11" fontWeight="700" letterSpacing="2.1">SRI LANKA</text>
        <text x="603" y="51" textAnchor="end" fill="#F3DCA7" fontSize="10" fontWeight="700" letterSpacing="1.7">LOCAL DISCOVERY</text>

        {/* Geographically sourced island shape, including offshore islands. */}
        <path d={coastline} stroke="#71F5BB" strokeOpacity="0.10" strokeWidth="10" strokeLinejoin="round" />
        <path d={coastline} fill="url(#island-map-fill)" stroke="url(#island-neon-coast)" strokeWidth="2.25" strokeLinejoin="round" />
        <path d={mainland} stroke="#E9D5A1" strokeWidth="0.8" strokeOpacity="0.32" />

        {/* Sparse network wireframe clipped to the land: decorative, not district boundaries. */}
        <g clipPath="url(#island-land-clip)" stroke="#B0D9B6" strokeWidth="1" strokeOpacity="0.22" strokeLinecap="round">
          <path d="M221 180Q326 200 463 178M226 251Q327 277 474 256M214 325Q315 305 476 346M247 395Q328 390 450 404" strokeDasharray="3 8" />
          <path d="M289 79Q305 187 283 291T300 483M371 85Q336 197 380 309T369 493" strokeOpacity="0.55" />
        </g>

        {/* Nearby discovery connections: static, never a repeating animation. */}
        <g stroke="url(#island-network)" strokeLinecap="round" strokeLinejoin="round">
          <path d="M260.2 87.8Q274 104 299.2 116.1L340.9 129.4" strokeWidth="1.65" strokeDasharray="4 7" strokeOpacity="0.73" />
          <path d="M250.4 159.6Q284 166 299.8 228.9Q319 278 322.8 335.1" strokeWidth="1.65" strokeDasharray="4 7" strokeOpacity="0.67" />
          <path d="M299.8 228.9Q365 238 429.6 290.7" strokeWidth="1.3" strokeDasharray="4 9" strokeOpacity="0.48" />
          <path d="M244.2 372.8Q279 348 322.8 335.1Q383 339 429.6 290.7" strokeWidth="1.7" strokeDasharray="5 8" strokeOpacity="0.75" />
        </g>

        {/* Labels are tied to projected city coordinates, not arbitrary map positions. */}
        {locations.map(point => (
          <g key={point.name}>
            <path
              d={`M${point.x} ${point.y}L${point.edgeX} ${point.edgeY}`}
              stroke="#B6EDC9"
              strokeOpacity="0.45"
              strokeWidth="1.15"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
            <circle cx={point.x} cy={point.y} r="21" fill="url(#island-pin-halo)" />
            <circle cx={point.x} cy={point.y} r="11" stroke="#8EF3C4" strokeOpacity="0.50" strokeWidth="1" fill="#79EAB5" fillOpacity="0.09" />
            <circle
              className="hero-discovery-led"
              style={{animationDelay:point.delay}}
              cx={point.x} cy={point.y} r="5.7" fill="#95FFD0"
            />
            <circle cx={point.x} cy={point.y} r="2.4" fill="#FFFFFF" />
            <rect x={point.boxX} y={point.boxY} width={point.w} height="27" rx="9" fill="#19443A" stroke="#8AD6AC" strokeOpacity="0.40" />
            <text x={point.boxX+point.w/2} y={point.boxY+17.6} textAnchor="middle" fill="#E7F9EB" fontSize="11.2" fontWeight="600">{point.name}</text>
          </g>
        ))}

        {/* Two subdued callouts, retaining the existing discovery brand story. */}
        <g>
          <rect x="21" y="248" width="174" height="85" rx="17" fill="#153A32" stroke="#7EC3A0" strokeOpacity="0.62" />
          <rect x="34" y="261" width="27" height="27" rx="8" fill="#2B745B" />
          <path d="M43 279L52 270M44 270H52V278" stroke="#E1FFE9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <text x="69" y="270" fill="#9FEAC1" fontSize="10.1" letterSpacing="1.3" fontWeight="700">EXPLORE</text>
          <text x="34" y="305" fill="#FFFFFF" fontSize="14.7" fontWeight="700">Local businesses</text>
          <text x="34" y="320" fill="#B5D5C3" fontSize="10.4">Across Sri Lanka</text>
        </g>
        <g>
          <rect x="458" y="403" width="163" height="83" rx="17" fill="#153A32" stroke="#7EC3A0" strokeOpacity="0.60" />
          <circle cx="479" cy="426" r="11" fill="#2A7159" />
          <path d="M479 418C473 418 470 426 479 436C488 426 485 418 479 418Z" stroke="#E5FFF0" strokeWidth="1.5" />
          <circle cx="479" cy="425" r="2.4" fill="#E5FFF0" />
          <text x="497" y="430" fill="#A9EECA" fontSize="10" letterSpacing="1.1" fontWeight="700">NEARBY</text>
          <text x="473" y="457" fill="#FFFFFF" fontSize="14.5" fontWeight="700">Find services</text>
          <text x="473" y="474" fill="#B5D5C3" fontSize="10.3">Discover what is near</text>
        </g>
        <g>
          <rect x="210" y="507" width="243" height="40" rx="20" fill="#173E33" stroke="#B4D5AD" strokeOpacity="0.37" />
          <circle cx="238" cy="527" r="9" fill="#2F7159" />
          <path d="M234 527L237 530L242 524" stroke="#E5FFED" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <text x="258" y="531" fill="#E8F6E9" fontSize="12" fontWeight="600">Discover · Connect · Grow</text>
        </g>
      </svg>
    </div>
  );
}

export default memo(HeroDiscoveryGraphic);
