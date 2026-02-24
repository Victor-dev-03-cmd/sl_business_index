export interface Town {
  name: string;
  lat: number;
  lng: number;
  district: string;
}

export const SL_TOWNS: Town[] = [
  // Vavuniya District
  { name: "Vavuniya Town", lat: 8.7514, lng: 80.4971, district: "Vavuniya" },
  { name: "Kanagarayankulam", lat: 9.0064, lng: 80.5050, district: "Vavuniya" },
  { name: "Omanthai", lat: 8.8786, lng: 80.4950, district: "Vavuniya" },
  { name: "Nedunkeni", lat: 9.0064, lng: 80.7050, district: "Vavuniya" },
  { name: "Cheddikulam", lat: 8.6650, lng: 80.2950, district: "Vavuniya" },
  { name: "Puliyankulam", lat: 8.9850, lng: 80.4950, district: "Vavuniya" },

  // Jaffna District
  { name: "Jaffna City", lat: 9.6615, lng: 80.0070, district: "Jaffna" },
  { name: "Chunnakam", lat: 9.7500, lng: 80.0333, district: "Jaffna" },
  { name: "Chavakachcheri", lat: 9.6500, lng: 80.1500, district: "Jaffna" },
  { name: "Point Pedro", lat: 9.8167, lng: 80.2333, district: "Jaffna" },
  { name: "Nallur", lat: 9.6744, lng: 80.0294, district: "Jaffna" },

  // Colombo District
  { name: "Colombo 01 (Fort)", lat: 6.9344, lng: 79.8428, district: "Colombo" },
  { name: "Colombo 03 (Colpetty)", lat: 6.9147, lng: 79.8510, district: "Colombo" },
  { name: "Colombo 07 (Cinnamon Gardens)", lat: 6.9117, lng: 79.8646, district: "Colombo" },
  { name: "Dehiwala", lat: 6.8511, lng: 79.8733, district: "Colombo" },
  { name: "Mount Lavinia", lat: 6.8344, lng: 79.8661, district: "Colombo" },
  { name: "Nugegoda", lat: 6.8694, lng: 79.8883, district: "Colombo" },
  { name: "Battaramulla", lat: 6.8989, lng: 79.9222, district: "Colombo" },

  // Gampaha District
  { name: "Gampaha Town", lat: 7.0873, lng: 79.9925, district: "Gampaha" },
  { name: "Negombo", lat: 7.2089, lng: 79.8353, district: "Gampaha" },
  { name: "Wattala", lat: 6.9833, lng: 79.8833, district: "Gampaha" },

  // Kandy District
  { name: "Kandy City", lat: 7.2906, lng: 80.6337, district: "Kandy" },
  { name: "Peradeniya", lat: 7.2683, lng: 80.5961, district: "Kandy" },
  { name: "Katugastota", lat: 7.3200, lng: 80.6200, district: "Kandy" },

  // Mullaitivu District
  { name: "Mullaitivu Town", lat: 9.2671, lng: 80.8144, district: "Mullaitivu" },
  { name: "Puthukkudiyiruppu", lat: 9.3167, lng: 80.7167, district: "Mullaitivu" },
  { name: "Oddusuddan", lat: 9.1500, lng: 80.6500, district: "Mullaitivu" },

  // Kilinochchi District
  { name: "Kilinochchi Town", lat: 9.3872, lng: 80.3948, district: "Kilinochchi" },
  { name: "Paranthan", lat: 9.4333, lng: 80.4000, district: "Kilinochchi" },
  { name: "Elephant Pass", lat: 9.4833, lng: 80.4167, district: "Kilinochchi" },

  // Trincomalee District
  { name: "Trincomalee Town", lat: 8.5874, lng: 81.2152, district: "Trincomalee" },
  { name: "Kinniya", lat: 8.4833, lng: 81.1833, district: "Trincomalee" },
  
  // Ampara District
  { name: "Ampara Town", lat: 7.2912, lng: 81.6724, district: "Ampara" },
  
  // Anuradhapura District
  { name: "Anuradhapura Town", lat: 8.3122, lng: 80.4131, district: "Anuradhapura" },
  
  // Badulla District
  { name: "Badulla Town", lat: 6.9899, lng: 81.0569, district: "Badulla" },
  
  // Batticaloa District
  { name: "Batticaloa Town", lat: 7.7102, lng: 81.6924, district: "Batticaloa" },
  
  // Galle District
  { name: "Galle City", lat: 6.0535, lng: 80.2210, district: "Galle" },
  
  // Hambantota District
  { name: "Hambantota Town", lat: 6.1429, lng: 81.1212, district: "Hambantota" },
  
  // Kalutara District
  { name: "Kalutara Town", lat: 6.5854, lng: 79.9607, district: "Kalutara" },
  
  // Kegalle District
  { name: "Kegalle Town", lat: 7.2513, lng: 80.3464, district: "Kegalle" },
  
  // Kurunegala District
  { name: "Kurunegala Town", lat: 7.4863, lng: 80.3647, district: "Kurunegala" },
  
  // Mannar District
  { name: "Mannar Town", lat: 8.9810, lng: 79.9044, district: "Mannar" },
  
  // Matale District
  { name: "Matale Town", lat: 7.4675, lng: 80.6234, district: "Matale" },
  
  // Matara District
  { name: "Matara Town", lat: 5.9496, lng: 80.5469, district: "Matara" },
  
  // Monaragala District
  { name: "Monaragala Town", lat: 6.8718, lng: 81.3496, district: "Monaragala" },
  
  // Nuwara Eliya District
  { name: "Nuwara Eliya Town", lat: 6.9697, lng: 80.7672, district: "Nuwara Eliya" },
  
  // Polonnaruwa District
  { name: "Polonnaruwa Town", lat: 7.9403, lng: 81.0188, district: "Polonnaruwa" },
  
  // Puttalam District
  { name: "Puttalam Town", lat: 8.0330, lng: 79.8259, district: "Puttalam" },
  
  // Ratnapura District
  { name: "Ratnapura Town", lat: 6.6828, lng: 80.3992, district: "Ratnapura" },
];
