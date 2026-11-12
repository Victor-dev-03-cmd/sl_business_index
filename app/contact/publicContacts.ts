/**
 * Source-linked public service contact directory for Sri Lanka.
 * Reviewed: 12 Nov 2026, official provider/government pages.
 * Important: national/regional numbers are NOT represented as direct district branch lines.
 * Keep entries sourced, review periodically, and do not imply SLBI affiliation.
 */
export const DISTRICTS = ["Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota","Jaffna","Kalutara","Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya","Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya"] as const;
export const CATEGORIES = ["All services","Emergency","Electricity","Water","Banking","Government"] as const;
export type PublicContactCategory = Exclude<typeof CATEGORIES[number],"All services">;
export type PublicContact = {
  id: string; name: string; phone: string; category: PublicContactCategory;
  scope: "National" | "Regional" | "District"; area: string; coverage: string[];
  description: string; sourceUrl: string; sourceName: string;
};
export const CONTACTS: PublicContact[] = [
  {
    "id": "ambulance",
    "name": "1990 Suwa Seriya ambulance",
    "phone": "1990",
    "category": "Emergency",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Free pre-hospital emergency ambulance service throughout Sri Lanka.",
    "sourceUrl": "https://www.1990.lk/faq/",
    "sourceName": "1990 Suwa Seriya"
  },
  {
    "id": "police119",
    "name": "Sri Lanka Police emergency",
    "phone": "119",
    "category": "Emergency",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Emergency police assistance; use only for genuine emergencies.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police118",
    "name": "Police emergency information",
    "phone": "118",
    "category": "Emergency",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "National police emergency information service.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "fire110",
    "name": "Fire and rescue emergency",
    "phone": "110",
    "category": "Emergency",
    "scope": "National",
    "area": "National emergency service",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Fire and rescue hotline published by a Sri Lankan provincial government.",
    "sourceUrl": "https://tourism.sg.gov.lk/travelers-guide-4/",
    "sourceName": "Sabaragamuwa Tourism Ministry"
  },
  {
    "id": "child1929",
    "name": "National Child Protection Authority",
    "phone": "1929",
    "category": "Emergency",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Confidential 24-hour ChildLine in Sinhala, Tamil and English.",
    "sourceUrl": "https://childprotection.gov.lk/en/what-we-do/1929-call-centre-helpline",
    "sourceName": "National Child Protection Authority"
  },
  {
    "id": "edl1987",
    "name": "Electricity Distribution Lanka (EDL) breakdown hotline",
    "phone": "1987",
    "category": "Electricity",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "24/7 electricity interruptions, complaints and supply enquiries. Formerly CEB.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "edlhq",
    "name": "Electricity Distribution Lanka head office",
    "phone": "+94 11 232 3232",
    "category": "Electricity",
    "scope": "National",
    "area": "Colombo 02",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "General EDL headquarters enquiries, not a substitute for emergency breakdown hotline.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "edld1",
    "name": "EDL Division 1 office",
    "phone": "011 234 4575",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Division 1: Northern, North Central, North Western, Colombo City",
    "coverage": [
      "Anuradhapura",
      "Colombo",
      "Jaffna",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Mullaitivu",
      "Polonnaruwa",
      "Puttalam",
      "Vavuniya"
    ],
    "description": "Administrative division covering northern Sri Lanka among other areas; for power failures call 1987.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "edlnorth",
    "name": "EDL Northern Province director's office, Jaffna",
    "phone": "021 222 0496",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Old Park Road, Jaffna",
    "coverage": [
      "Jaffna",
      "Kilinochchi",
      "Mannar",
      "Mullaitivu",
      "Vavuniya"
    ],
    "description": "Regional director office contact published in EDL 2026 procurement notice; not a confirmed local breakdown line.",
    "sourceUrl": "https://edl.lk/tender-notices/download/42/en",
    "sourceName": "EDL 2026 procurement notice"
  },
  {
    "id": "edld2",
    "name": "EDL Division 2 office",
    "phone": "011 243 1598",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Division 2: Eastern, Central, Western North",
    "coverage": [
      "Ampara",
      "Batticaloa",
      "Gampaha",
      "Kandy",
      "Kegalle",
      "Matale",
      "Nuwara Eliya",
      "Trincomalee"
    ],
    "description": "Administrative division enquiries; for outages use 1987.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "edleast",
    "name": "EDL Eastern Province office",
    "phone": "026 222 2666",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Eastern Province",
    "coverage": [
      "Ampara",
      "Batticaloa",
      "Trincomalee"
    ],
    "description": "Eastern provincial office number. Batticaloa area enquiries can be routed here; this is not a Batticaloa direct line.",
    "sourceUrl": "https://edl.lk/EDL-division-2",
    "sourceName": "EDL Division 2"
  },
  {
    "id": "edlcentral",
    "name": "EDL Central Province I office",
    "phone": "081 222 3192",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Central Province",
    "coverage": [
      "Kandy",
      "Matale"
    ],
    "description": "Central provincial office; customer breakdowns to 1987.",
    "sourceUrl": "https://edl.lk/EDL-division-2",
    "sourceName": "EDL Division 2"
  },
  {
    "id": "edlcentral2",
    "name": "EDL Central Province II office",
    "phone": "081 208 5600",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Central Province",
    "coverage": [
      "Kandy",
      "Kegalle",
      "Nuwara Eliya"
    ],
    "description": "Provincial contact for covered distribution areas.",
    "sourceUrl": "https://edl.lk/EDL-division-2",
    "sourceName": "EDL Division 2"
  },
  {
    "id": "edld3",
    "name": "EDL Division 3 office",
    "phone": "011 288 0627",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Uva, Sabaragamuwa & Western South II",
    "coverage": [
      "Badulla",
      "Colombo",
      "Kalutara",
      "Monaragala",
      "Ratnapura"
    ],
    "description": "Administrative division line, not an individual district office.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "edld4",
    "name": "EDL Division 4 office",
    "phone": "011 420 4014",
    "category": "Electricity",
    "scope": "Regional",
    "area": "Southern & Western South I",
    "coverage": [
      "Colombo",
      "Galle",
      "Hambantota",
      "Kalutara",
      "Matara"
    ],
    "description": "Administrative division line; service faults should start with 1987.",
    "sourceUrl": "https://edl.lk/contact",
    "sourceName": "Electricity Distribution Lanka"
  },
  {
    "id": "water1939",
    "name": "National Water Supply & Drainage Board",
    "phone": "1939",
    "category": "Water",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "24/7 customer-care centre for water supply complaints and billing issues.",
    "sourceUrl": "https://www.waterboard.lk/key-sections/consumer-asset-management/",
    "sourceName": "National Water Supply Board"
  },
  {
    "id": "gic1919",
    "name": "Government Information Centre",
    "phone": "1919",
    "category": "Government",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Government service and office information, available around the clock.",
    "sourceUrl": "https://gic.gov.lk/",
    "sourceName": "Government Information Centre"
  },
  {
    "id": "immigration1962",
    "name": "Immigration & Emigration main hotline",
    "phone": "1962",
    "category": "Government",
    "scope": "National",
    "area": "Battaramulla",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Passport, visa and immigration general enquiries.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "immjaffna",
    "name": "Immigration regional office, Jaffna",
    "phone": "+94 21 205 1195",
    "category": "Government",
    "scope": "District",
    "area": "Jaffna",
    "coverage": [
      "Jaffna"
    ],
    "description": "Regional passport/immigration enquiries — Premises of Jaffna District Secretariat.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "immvavuniya",
    "name": "Immigration regional office, Vavuniya",
    "phone": "+94 24 205 0048",
    "category": "Government",
    "scope": "District",
    "area": "Vavuniya",
    "coverage": [
      "Vavuniya"
    ],
    "description": "Regional passport/immigration enquiries — Mannar Road, opposite Gamini Vidyalaya.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "immkandy",
    "name": "Immigration regional office, Kandy",
    "phone": "+94 81 208 1854",
    "category": "Government",
    "scope": "District",
    "area": "Kandy",
    "coverage": [
      "Kandy"
    ],
    "description": "Regional passport/immigration enquiries — 457 Peradeniya Road.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "immmatara",
    "name": "Immigration regional office, Matara",
    "phone": "+94 41 205 0073",
    "category": "Government",
    "scope": "District",
    "area": "Matara",
    "coverage": [
      "Matara"
    ],
    "description": "Regional passport/immigration enquiries — Rahula Road.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "immkurunegala",
    "name": "Immigration regional office, Kurunegala",
    "phone": "+94 37 222 5001",
    "category": "Government",
    "scope": "District",
    "area": "Kurunegala",
    "coverage": [
      "Kurunegala"
    ],
    "description": "Regional passport/immigration enquiries — 95 Negombo Road.",
    "sourceUrl": "https://www.immigration.gov.lk/con_head_e.php",
    "sourceName": "Department of Immigration"
  },
  {
    "id": "boc1975",
    "name": "Bank of Ceylon call centre",
    "phone": "1975",
    "category": "Banking",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "BOC customer care and electronic banking support.",
    "sourceUrl": "https://reportsar.boc.lk/2024Report/boc/supplementary-information/corporate-information.php",
    "sourceName": "Bank of Ceylon"
  },
  {
    "id": "peoples1961",
    "name": "People's Bank call centre",
    "phone": "1961",
    "category": "Banking",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "People's Bank customer enquiry hotline.",
    "sourceUrl": "https://www.peoplesbank.lk/contact-us/",
    "sourceName": "People's Bank"
  },
  {
    "id": "combank1316",
    "name": "Commercial Bank contact centre",
    "phone": "1316",
    "category": "Banking",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Commercial Bank 24/7 customer support.",
    "sourceUrl": "https://www.combank.lk/contact",
    "sourceName": "Commercial Bank"
  },
  {
    "id": "dfcc",
    "name": "DFCC Bank customer support",
    "phone": "+94 11 235 0000",
    "category": "Banking",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "DFCC official 24-hour contact centre.",
    "sourceUrl": "https://www.dfcc.lk/contact-us",
    "sourceName": "DFCC Bank"
  },
  {
    "id": "cbsl1935",
    "name": "Central Bank financial consumer enquiries",
    "phone": "1935",
    "category": "Banking",
    "scope": "National",
    "area": "Island-wide",
    "coverage": [
      "Ampara",
      "Anuradhapura",
      "Badulla",
      "Batticaloa",
      "Colombo",
      "Galle",
      "Gampaha",
      "Hambantota",
      "Jaffna",
      "Kalutara",
      "Kandy",
      "Kegalle",
      "Kilinochchi",
      "Kurunegala",
      "Mannar",
      "Matale",
      "Matara",
      "Monaragala",
      "Mullaitivu",
      "Nuwara Eliya",
      "Polonnaruwa",
      "Puttalam",
      "Ratnapura",
      "Trincomalee",
      "Vavuniya"
    ],
    "description": "Financial consumer relations and complaints about regulated financial institutions.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "cmbatticaloa",
    "name": "Commercial Bank Batticaloa branch",
    "phone": "065 222 6403",
    "category": "Banking",
    "scope": "District",
    "area": "Batticaloa",
    "coverage": [
      "Batticaloa"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 42 Bar Road, Batticaloa.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmtrinc",
    "name": "Commercial Bank Trincomalee branch",
    "phone": "026 222 4421",
    "category": "Banking",
    "scope": "District",
    "area": "Trincomalee",
    "coverage": [
      "Trincomalee"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 420 Court Road, Trincomalee.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmthirunelveli",
    "name": "Commercial Bank Thirunelveli branch",
    "phone": "021 222 0002",
    "category": "Banking",
    "scope": "District",
    "area": "Jaffna",
    "coverage": [
      "Jaffna"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 104 Palaly Road, Thirunelveli.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmgampaha",
    "name": "Commercial Bank Gampaha branch",
    "phone": "033 222 4136",
    "category": "Banking",
    "scope": "District",
    "area": "Gampaha",
    "coverage": [
      "Gampaha"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 51 Queen Mary's Road.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmgalle",
    "name": "Commercial Bank Galle Main Street branch",
    "phone": "091 222 3760",
    "category": "Banking",
    "scope": "District",
    "area": "Galle",
    "coverage": [
      "Galle"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 130 Main Street.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmkegalle",
    "name": "Commercial Bank Kegalle branch",
    "phone": "035 222 2034",
    "category": "Banking",
    "scope": "District",
    "area": "Kegalle",
    "coverage": [
      "Kegalle"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 186 Main Street.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmkalmunai",
    "name": "Commercial Bank Kalmunai branch",
    "phone": "067 222 5341",
    "category": "Banking",
    "scope": "District",
    "area": "Ampara",
    "coverage": [
      "Ampara"
    ],
    "description": "Listed on the official Commercial Bank branch directory — 132 Batticaloa Road, Kalmunai.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cmkurunegala",
    "name": "Commercial Bank Kurunegala region – use branch finder",
    "phone": "1316",
    "category": "Banking",
    "scope": "Regional",
    "area": "Kurunegala",
    "coverage": [
      "Kurunegala"
    ],
    "description": "Listed on the official Commercial Bank branch directory — Confirm specific local branch in official locator.",
    "sourceUrl": "https://www.combank.lk/branches",
    "sourceName": "Commercial Bank branch directory"
  },
  {
    "id": "cbslkilinochchi",
    "name": "Central Bank regional office, Kilinochchi",
    "phone": "+94 21 228 5913",
    "category": "Banking",
    "scope": "District",
    "area": "Kilinochchi",
    "coverage": [
      "Kilinochchi"
    ],
    "description": "Central Bank regional office at Ariviyal Nagar; not a retail banking branch.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "cbslanu",
    "name": "Central Bank regional office, Anuradhapura",
    "phone": "+94 25 222 2047",
    "category": "Banking",
    "scope": "District",
    "area": "Anuradhapura",
    "coverage": [
      "Anuradhapura"
    ],
    "description": "Central Bank regional office, not a retail banking branch.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "cbslmatara",
    "name": "Central Bank regional office, Matara",
    "phone": "+94 41 222 2269",
    "category": "Banking",
    "scope": "District",
    "area": "Matara",
    "coverage": [
      "Matara"
    ],
    "description": "Central Bank regional office, not a retail banking branch.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "cbslmatale",
    "name": "Central Bank regional office, Matale",
    "phone": "+94 66 222 2167",
    "category": "Banking",
    "scope": "District",
    "area": "Matale",
    "coverage": [
      "Matale"
    ],
    "description": "Central Bank regional office, not a retail banking branch.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "cbsltrinc",
    "name": "Central Bank regional office, Trincomalee",
    "phone": "+94 26 222 6965",
    "category": "Banking",
    "scope": "District",
    "area": "Trincomalee",
    "coverage": [
      "Trincomalee"
    ],
    "description": "Central Bank regional office, not a retail banking branch.",
    "sourceUrl": "https://www.cbsl.gov.lk/en/contact-us",
    "sourceName": "Central Bank of Sri Lanka"
  },
  {
    "id": "police-ampara",
    "name": "Sri Lanka Police Ampara Emergency / Ops",
    "phone": "063 222 2321",
    "category": "Emergency",
    "scope": "District",
    "area": "Ampara",
    "coverage": [
      "Ampara"
    ],
    "description": "Emergency / Ops listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-anuradhapura",
    "name": "Sri Lanka Police Anuradhapura Range operations room",
    "phone": "025 222 2788",
    "category": "Emergency",
    "scope": "District",
    "area": "Anuradhapura",
    "coverage": [
      "Anuradhapura"
    ],
    "description": "Range operations room listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-badulla",
    "name": "Sri Lanka Police Badulla Emergency / Ops",
    "phone": "055 222 2219",
    "category": "Emergency",
    "scope": "District",
    "area": "Badulla",
    "coverage": [
      "Badulla"
    ],
    "description": "Emergency / Ops listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-batticaloa",
    "name": "Sri Lanka Police Batticaloa Emergency / Ops",
    "phone": "065 222 4404",
    "category": "Emergency",
    "scope": "District",
    "area": "Batticaloa",
    "coverage": [
      "Batticaloa"
    ],
    "description": "Emergency / Ops listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-colombo",
    "name": "Sri Lanka Police Colombo Colombo emergency desk",
    "phone": "011 243 3333",
    "category": "Emergency",
    "scope": "District",
    "area": "Colombo",
    "coverage": [
      "Colombo"
    ],
    "description": "Colombo emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-galle",
    "name": "Sri Lanka Police Galle Emergency desk",
    "phone": "091 223 3333",
    "category": "Emergency",
    "scope": "District",
    "area": "Galle",
    "coverage": [
      "Galle"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-gampaha",
    "name": "Sri Lanka Police Gampaha Emergency desk",
    "phone": "033 222 2222",
    "category": "Emergency",
    "scope": "District",
    "area": "Gampaha",
    "coverage": [
      "Gampaha"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-kalutara",
    "name": "Sri Lanka Police Kalutara Emergency desk",
    "phone": "034 222 2227",
    "category": "Emergency",
    "scope": "District",
    "area": "Kalutara",
    "coverage": [
      "Kalutara"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-kandy",
    "name": "Sri Lanka Police Kandy Emergency desk",
    "phone": "081 223 3333",
    "category": "Emergency",
    "scope": "District",
    "area": "Kandy",
    "coverage": [
      "Kandy"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-kegalle",
    "name": "Sri Lanka Police Kegalle Emergency desk",
    "phone": "035 222 2333",
    "category": "Emergency",
    "scope": "District",
    "area": "Kegalle",
    "coverage": [
      "Kegalle"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-kurunegala",
    "name": "Sri Lanka Police Kurunegala Emergency desk",
    "phone": "037 222 3222",
    "category": "Emergency",
    "scope": "District",
    "area": "Kurunegala",
    "coverage": [
      "Kurunegala"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-matale",
    "name": "Sri Lanka Police Matale Emergency desk",
    "phone": "066 222 2221",
    "category": "Emergency",
    "scope": "District",
    "area": "Matale",
    "coverage": [
      "Matale"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-matara",
    "name": "Sri Lanka Police Matara Emergency desk",
    "phone": "041 222 2996",
    "category": "Emergency",
    "scope": "District",
    "area": "Matara",
    "coverage": [
      "Matara"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-monaragala",
    "name": "Sri Lanka Police Monaragala Operations room",
    "phone": "055 227 7316",
    "category": "Emergency",
    "scope": "District",
    "area": "Monaragala",
    "coverage": [
      "Monaragala"
    ],
    "description": "Operations room listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-nuwara-eliya",
    "name": "Sri Lanka Police Nuwara Eliya Emergency desk",
    "phone": "052 222 2225",
    "category": "Emergency",
    "scope": "District",
    "area": "Nuwara Eliya",
    "coverage": [
      "Nuwara Eliya"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-polonnaruwa",
    "name": "Sri Lanka Police Polonnaruwa Operations room",
    "phone": "027 222 2159",
    "category": "Emergency",
    "scope": "District",
    "area": "Polonnaruwa",
    "coverage": [
      "Polonnaruwa"
    ],
    "description": "Operations room listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-ratnapura",
    "name": "Sri Lanka Police Ratnapura Operations room",
    "phone": "045 223 2222",
    "category": "Emergency",
    "scope": "District",
    "area": "Ratnapura",
    "coverage": [
      "Ratnapura"
    ],
    "description": "Operations room listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-trincomalee",
    "name": "Sri Lanka Police Trincomalee Emergency desk",
    "phone": "026 222 2222",
    "category": "Emergency",
    "scope": "District",
    "area": "Trincomalee",
    "coverage": [
      "Trincomalee"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  },
  {
    "id": "police-vavuniya",
    "name": "Sri Lanka Police Vavuniya Emergency desk",
    "phone": "024 222 2224",
    "category": "Emergency",
    "scope": "District",
    "area": "Vavuniya",
    "coverage": [
      "Vavuniya"
    ],
    "description": "Emergency desk listed in the Sri Lanka Police regional emergency directory. For immediate police assistance dial 119.",
    "sourceUrl": "https://www.police.lk/?page_id=1334",
    "sourceName": "Sri Lanka Police"
  }
];
export const LAST_REVIEWED = "12 November 2026";
export const SLBI_WHATSAPP = "94769200572";
export const SLBI_EMAIL = "slbusinessindex@gmail.com";
