/**
 * Offline gazetteer for the alumni map.
 *
 * Profiles store `city` and `country` as free text, so something has to turn
 * "Bengaluru, India" into a point. A hosted geocoder is the obvious answer and
 * the wrong one here: it would add a paid API key, a per-render network round
 * trip and a rate limit to a page that only ever plots a few hundred people
 * across a few dozen cities.
 *
 * So the mapping is a lookup table of cities a school's diaspora realistically
 * lands in, then falls back to a country centroid, then gives up honestly —
 * `MapPage` counts the people it could not place rather than dropping them
 * silently.
 *
 * Coordinates are approximate city centres, which is the correct precision for
 * this feature: a pin is "this person is in Toronto", not a home address.
 */

export type LatLon = readonly [lat: number, lon: number];

/**
 * Country-name spellings differ between what members type and what the map
 * data uses. `USA`, `U.S.A.` and `United States of America` are one country.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "united states",
  us: "united states",
  "u s a": "united states",
  america: "united states",
  "united states of america": "united states",
  uae: "united arab emirates",
  "u a e": "united arab emirates",
  uk: "united kingdom",
  "u k": "united kingdom",
  "great britain": "united kingdom",
  britain: "united kingdom",
  england: "united kingdom",
  scotland: "united kingdom",
  wales: "united kingdom",
  "northern ireland": "united kingdom",
  "republic of ireland": "ireland",
  "south korea": "korea, south",
  "republic of korea": "korea, south",
  holland: "netherlands",
  "the netherlands": "netherlands",
  "czech republic": "czechia",
  burma: "myanmar",
  "ivory coast": "cote d'ivoire",
  swaziland: "eswatini",
  "cape verde": "cabo verde",
  "hong kong sar": "hong kong",
  "macau sar": "macau",
  "new zealand aotearoa": "new zealand",
};

/**
 * Strips case, accents, punctuation and stray whitespace so "Bengaluru ",
 * "bengaluru" and "Bengalūru" all agree.
 */
export function normalizePlace(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,'’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Resolves a country to its canonical key, applying the alias table. */
export function canonicalCountry(country: string | undefined | null): string {
  const normalized = normalizePlace(country);
  return COUNTRY_ALIASES[normalized] ?? normalized;
}

/**
 * City coordinates keyed by `city|country`, both canonicalised.
 *
 * Ordered roughly by where a Kerala school's alumni actually go: Kerala and the
 * rest of India, then the Gulf, then the anglophone diaspora, then everywhere
 * else. Add to it freely — an unknown city degrades to its country, not an error.
 */
const CITY_TABLE: Record<string, LatLon> = {
  /* Kerala */
  "kochi|india": [9.9312, 76.2673],
  "ernakulam|india": [9.9816, 76.2999],
  "thiruvananthapuram|india": [8.5241, 76.9366],
  "trivandrum|india": [8.5241, 76.9366],
  "kottayam|india": [9.5916, 76.5222],
  "thrissur|india": [10.5276, 76.2144],
  "kozhikode|india": [11.2588, 75.7804],
  "calicut|india": [11.2588, 75.7804],
  "kollam|india": [8.8932, 76.6141],
  "alappuzha|india": [9.4981, 76.3388],
  "alleppey|india": [9.4981, 76.3388],
  "kayamkulam|india": [9.1718, 76.5013],
  "kayankulam|india": [9.1718, 76.5013],
  "mavelikkara|india": [9.267, 76.556],
  "haripad|india": [9.28, 76.458],
  "chengannur|india": [9.3156, 76.613],
  "peringala|india": [9.185, 76.511],
  "palakkad|india": [10.7867, 76.6548],
  "kannur|india": [11.8745, 75.3704],
  "malappuram|india": [11.041, 76.0788],
  "pathanamthitta|india": [9.2648, 76.787],
  "idukki|india": [9.9189, 77.1025],
  "kasaragod|india": [12.4996, 74.9869],
  "wayanad|india": [11.6854, 76.132],

  /* Rest of India */
  "bengaluru|india": [12.9716, 77.5946],
  "bangalore|india": [12.9716, 77.5946],
  "chennai|india": [13.0827, 80.2707],
  "madras|india": [13.0827, 80.2707],
  "mumbai|india": [19.076, 72.8777],
  "bombay|india": [19.076, 72.8777],
  "delhi|india": [28.6139, 77.209],
  "new delhi|india": [28.6139, 77.209],
  "gurugram|india": [28.4595, 77.0266],
  "gurgaon|india": [28.4595, 77.0266],
  "noida|india": [28.5355, 77.391],
  "hyderabad|india": [17.385, 78.4867],
  "pune|india": [18.5204, 73.8567],
  "ahmedabad|india": [23.0225, 72.5714],
  "surat|india": [21.1702, 72.8311],
  "vadodara|india": [22.3072, 73.1812],
  "kolkata|india": [22.5726, 88.3639],
  "coimbatore|india": [11.0168, 76.9558],
  "madurai|india": [9.9252, 78.1198],
  "tiruchirappalli|india": [10.7905, 78.7047],
  "mysuru|india": [12.2958, 76.6394],
  "mangaluru|india": [12.9141, 74.856],
  "jaipur|india": [26.9124, 75.7873],
  "lucknow|india": [26.8467, 80.9462],
  "nagpur|india": [21.1458, 79.0882],
  "indore|india": [22.7196, 75.8577],
  "bhopal|india": [23.2599, 77.4126],
  "chandigarh|india": [30.7333, 76.7794],
  "visakhapatnam|india": [17.6868, 83.2185],
  "goa|india": [15.2993, 74.124],
  "panaji|india": [15.4909, 73.8278],

  /* Gulf and Middle East */
  "dubai|united arab emirates": [25.2048, 55.2708],
  "abu dhabi|united arab emirates": [24.4539, 54.3773],
  "sharjah|united arab emirates": [25.3463, 55.4209],
  "ajman|united arab emirates": [25.4052, 55.5136],
  "ras al khaimah|united arab emirates": [25.8007, 55.9762],
  "doha|qatar": [25.2854, 51.531],
  "kuwait city|kuwait": [29.3759, 47.9774],
  "manama|bahrain": [26.2285, 50.586],
  "muscat|oman": [23.588, 58.3829],
  "salalah|oman": [17.0151, 54.0924],
  "riyadh|saudi arabia": [24.7136, 46.6753],
  "jeddah|saudi arabia": [21.4858, 39.1925],
  "dammam|saudi arabia": [26.3927, 49.9777],
  "tel aviv|israel": [32.0853, 34.7818],
  "istanbul|turkey": [41.0082, 28.9784],

  /* United States */
  "new york|united states": [40.7128, -74.006],
  "brooklyn|united states": [40.6782, -73.9442],
  "jersey city|united states": [40.7178, -74.0431],
  "edison|united states": [40.5187, -74.4121],
  "boston|united states": [42.3601, -71.0589],
  "philadelphia|united states": [39.9526, -75.1652],
  "washington|united states": [38.9072, -77.0369],
  "atlanta|united states": [33.749, -84.388],
  "miami|united states": [25.7617, -80.1918],
  "charlotte|united states": [35.2271, -80.8431],
  "chicago|united states": [41.8781, -87.6298],
  "detroit|united states": [42.3314, -83.0458],
  "minneapolis|united states": [44.9778, -93.265],
  "dallas|united states": [32.7767, -96.797],
  "houston|united states": [29.7604, -95.3698],
  "austin|united states": [30.2672, -97.7431],
  "denver|united states": [39.7392, -104.9903],
  "phoenix|united states": [33.4484, -112.074],
  "san jose|united states": [37.3382, -121.8863],
  "san francisco|united states": [37.7749, -122.4194],
  "sunnyvale|united states": [37.3688, -122.0363],
  "san diego|united states": [32.7157, -117.1611],
  "los angeles|united states": [34.0522, -118.2437],
  "seattle|united states": [47.6062, -122.3321],
  "portland|united states": [45.5152, -122.6784],

  /* Canada */
  "toronto|canada": [43.6532, -79.3832],
  "mississauga|canada": [43.589, -79.6441],
  "brampton|canada": [43.7315, -79.7624],
  "ottawa|canada": [45.4215, -75.6972],
  "montreal|canada": [45.5019, -73.5674],
  "vancouver|canada": [49.2827, -123.1207],
  "calgary|canada": [51.0447, -114.0719],
  "edmonton|canada": [53.5461, -113.4938],
  "winnipeg|canada": [49.8951, -97.1384],
  "halifax|canada": [44.6488, -63.5752],

  /* United Kingdom and Ireland */
  "london|united kingdom": [51.5072, -0.1276],
  "manchester|united kingdom": [53.4808, -2.2426],
  "birmingham|united kingdom": [52.4862, -1.8904],
  "leeds|united kingdom": [53.8008, -1.5491],
  "liverpool|united kingdom": [53.4084, -2.9916],
  "bristol|united kingdom": [51.4545, -2.5879],
  "nottingham|united kingdom": [52.9548, -1.1581],
  "sheffield|united kingdom": [53.3811, -1.4701],
  "cambridge|united kingdom": [52.2053, 0.1218],
  "oxford|united kingdom": [51.752, -1.2577],
  "reading|united kingdom": [51.4543, -0.9781],
  "glasgow|united kingdom": [55.8642, -4.2518],
  "edinburgh|united kingdom": [55.9533, -3.1883],
  "belfast|united kingdom": [54.5973, -5.9301],
  "cardiff|united kingdom": [51.4816, -3.1791],
  "dublin|ireland": [53.3498, -6.2603],
  "cork|ireland": [51.8985, -8.4756],

  /* Continental Europe */
  "berlin|germany": [52.52, 13.405],
  "munich|germany": [48.1351, 11.582],
  "frankfurt|germany": [50.1109, 8.6821],
  "hamburg|germany": [53.5511, 9.9937],
  "cologne|germany": [50.9375, 6.9603],
  "stuttgart|germany": [48.7758, 9.1829],
  "paris|france": [48.8566, 2.3522],
  "lyon|france": [45.764, 4.8357],
  "amsterdam|netherlands": [52.3676, 4.9041],
  "rotterdam|netherlands": [51.9244, 4.4777],
  "eindhoven|netherlands": [51.4416, 5.4697],
  "brussels|belgium": [50.8476, 4.3572],
  "zurich|switzerland": [47.3769, 8.5417],
  "geneva|switzerland": [46.2044, 6.1432],
  "basel|switzerland": [47.5596, 7.5886],
  "vienna|austria": [48.2082, 16.3738],
  "madrid|spain": [40.4168, -3.7038],
  "barcelona|spain": [41.3851, 2.1734],
  "lisbon|portugal": [38.7223, -9.1393],
  "rome|italy": [41.9028, 12.4964],
  "milan|italy": [45.4642, 9.19],
  "stockholm|sweden": [59.3293, 18.0686],
  "gothenburg|sweden": [57.7089, 11.9746],
  "oslo|norway": [59.9139, 10.7522],
  "copenhagen|denmark": [55.6761, 12.5683],
  "helsinki|finland": [60.1699, 24.9384],
  "warsaw|poland": [52.2297, 21.0122],
  "krakow|poland": [50.0647, 19.945],
  "prague|czechia": [50.0755, 14.4378],
  "budapest|hungary": [47.4979, 19.0402],
  "bucharest|romania": [44.4268, 26.1025],
  "athens|greece": [37.9838, 23.7275],

  /* Asia-Pacific */
  "singapore|singapore": [1.3521, 103.8198],
  "kuala lumpur|malaysia": [3.139, 101.6869],
  "jakarta|indonesia": [-6.2088, 106.8456],
  "bangkok|thailand": [13.7563, 100.5018],
  "manila|philippines": [14.5995, 120.9842],
  "hanoi|vietnam": [21.0278, 105.8342],
  "ho chi minh city|vietnam": [10.8231, 106.6297],
  "hong kong|hong kong": [22.3193, 114.1694],
  "shanghai|china": [31.2304, 121.4737],
  "beijing|china": [39.9042, 116.4074],
  "shenzhen|china": [22.5431, 114.0579],
  "taipei|taiwan": [25.033, 121.5654],
  "tokyo|japan": [35.6762, 139.6503],
  "osaka|japan": [34.6937, 135.5023],
  "seoul|korea, south": [37.5665, 126.978],
  "colombo|sri lanka": [6.9271, 79.8612],
  "male|maldives": [4.1755, 73.5093],
  "kathmandu|nepal": [27.7172, 85.324],
  "dhaka|bangladesh": [23.8103, 90.4125],
  "karachi|pakistan": [24.8607, 67.0011],
  "lahore|pakistan": [31.5204, 74.3587],
  "islamabad|pakistan": [33.6844, 73.0479],

  /* Oceania */
  "sydney|australia": [-33.8688, 151.2093],
  "melbourne|australia": [-37.8136, 144.9631],
  "brisbane|australia": [-27.4698, 153.0251],
  "perth|australia": [-31.9523, 115.8613],
  "adelaide|australia": [-34.9285, 138.6007],
  "canberra|australia": [-35.2809, 149.13],
  "auckland|new zealand": [-36.8485, 174.7633],
  "wellington|new zealand": [-41.2866, 174.7756],
  "christchurch|new zealand": [-43.5321, 172.6362],

  /* Africa and Latin America */
  "nairobi|kenya": [-1.2921, 36.8219],
  "lagos|nigeria": [6.5244, 3.3792],
  "accra|ghana": [5.6037, -0.187],
  "cairo|egypt": [30.0444, 31.2357],
  "johannesburg|south africa": [-26.2041, 28.0473],
  "cape town|south africa": [-33.9249, 18.4241],
  "addis ababa|ethiopia": [8.9806, 38.7578],
  "dar es salaam|tanzania": [-6.7924, 39.2083],
  "kampala|uganda": [0.3476, 32.5825],
  "lusaka|zambia": [-15.3875, 28.3228],
  "mexico city|mexico": [19.4326, -99.1332],
  "sao paulo|brazil": [-23.5505, -46.6333],
  "rio de janeiro|brazil": [-22.9068, -43.1729],
  "buenos aires|argentina": [-34.6037, -58.3816],
  "santiago|chile": [-33.4489, -70.6693],
  "lima|peru": [-12.0464, -77.0428],
  "bogota|colombia": [4.711, -74.0721],
};

/**
 * Country centroids, used when a city is unknown or the member has chosen to
 * hide their city but not their country. Deliberately hand-written rather than
 * derived from the map's own geometry: the 110m atlas omits city-states such as
 * Singapore, Bahrain and Hong Kong entirely, so computing centroids from it
 * would silently lose exactly the places most likely to appear here.
 */
const COUNTRY_TABLE: Record<string, LatLon> = {
  india: [22.351, 78.6677],
  "united states": [39.3833, -98.5795],
  canada: [56.1304, -106.3468],
  "united kingdom": [54.0, -2.5],
  ireland: [53.4129, -8.2439],
  "united arab emirates": [23.9, 54.3],
  qatar: [25.3548, 51.1839],
  kuwait: [29.3117, 47.4818],
  bahrain: [26.0667, 50.5577],
  oman: [21.4735, 55.9754],
  "saudi arabia": [23.8859, 45.0792],
  israel: [31.0461, 34.8516],
  turkey: [38.9637, 35.2433],
  germany: [51.1657, 10.4515],
  france: [46.6034, 1.8883],
  netherlands: [52.1326, 5.2913],
  belgium: [50.5039, 4.4699],
  switzerland: [46.8182, 8.2275],
  austria: [47.5162, 14.5501],
  spain: [40.4637, -3.7492],
  portugal: [39.3999, -8.2245],
  italy: [41.8719, 12.5674],
  sweden: [60.1282, 18.6435],
  norway: [60.472, 8.4689],
  denmark: [56.2639, 9.5018],
  finland: [61.9241, 25.7482],
  poland: [51.9194, 19.1451],
  czechia: [49.8175, 15.473],
  hungary: [47.1625, 19.5033],
  romania: [45.9432, 24.9668],
  greece: [39.0742, 21.8243],
  singapore: [1.3521, 103.8198],
  malaysia: [4.2105, 101.9758],
  indonesia: [-0.7893, 113.9213],
  thailand: [15.87, 100.9925],
  philippines: [12.8797, 121.774],
  vietnam: [14.0583, 108.2772],
  "hong kong": [22.3193, 114.1694],
  china: [35.8617, 104.1954],
  taiwan: [23.6978, 120.9605],
  japan: [36.2048, 138.2529],
  "korea, south": [35.9078, 127.7669],
  "sri lanka": [7.8731, 80.7718],
  maldives: [3.2028, 73.2207],
  nepal: [28.3949, 84.124],
  bangladesh: [23.685, 90.3563],
  pakistan: [30.3753, 69.3451],
  australia: [-25.2744, 133.7751],
  "new zealand": [-40.9006, 174.886],
  kenya: [-0.0236, 37.9062],
  nigeria: [9.082, 8.6753],
  ghana: [7.9465, -1.0232],
  egypt: [26.8206, 30.8025],
  "south africa": [-30.5595, 22.9375],
  ethiopia: [9.145, 40.4897],
  tanzania: [-6.369, 34.8888],
  uganda: [1.3733, 32.2903],
  zambia: [-13.1339, 27.8493],
  mexico: [23.6345, -102.5528],
  brazil: [-14.235, -51.9253],
  argentina: [-38.4161, -63.6167],
  chile: [-35.6751, -71.543],
  peru: [-9.19, -75.0152],
  colombia: [4.5709, -74.2973],
};

/**
 * Indian states and UTs people type into the country field. The gazetteer keys
 * cities by country, so "Kayamkulam" + "Kerala" must resolve as India.
 */
const INDIAN_STATES = new Set([
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "orissa",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "delhi",
  "nct of delhi",
  "puducherry",
  "pondicherry",
  "chandigarh",
  "ladakh",
  "jammu and kashmir",
  "andaman and nicobar islands",
  "lakshadweep",
]);

function isGazetteerCity(normalized: string): boolean {
  const prefix = `${normalized}|`;
  return Object.keys(CITY_TABLE).some((key) => key.startsWith(prefix));
}

function isKnownCountry(normalized: string): boolean {
  if (!normalized) return false;
  const aliased = COUNTRY_ALIASES[normalized] ?? normalized;
  return Boolean(COUNTRY_TABLE[aliased]);
}

/**
 * Pulls a city and a country out of the free-text pair people actually type:
 * "Kayamkulam" + "Kerala", or both in the city box as "Kayamkulam, India".
 */
export function interpretPlace(
  city: string | undefined | null,
  country: string | undefined | null,
): { city: string; country: string } {
  const tokens: string[] = [];
  for (const raw of [city, country]) {
    if (!raw) continue;
    for (const part of raw.split(/[,/|]/)) {
      const token = part.trim();
      if (token) tokens.push(token);
    }
  }

  let cityName = "";
  let countryName = "";
  for (const token of tokens) {
    const normalized = normalizePlace(token);
    if (INDIAN_STATES.has(normalized)) {
      if (!countryName) countryName = "India";
      continue;
    }
    if (isKnownCountry(normalized)) {
      countryName = token;
      if (!cityName && isGazetteerCity(normalized)) cityName = token;
      continue;
    }
    if (!cityName) cityName = token;
  }
  return { city: cityName, country: countryName };
}

export function placeLookupKey(
  city: string | undefined | null,
  country: string | undefined | null,
): string {
  const place = interpretPlace(city, country);
  return `${normalizePlace(place.city)}|${canonicalCountry(place.country)}`;
}

export type LocationPrecision = "city" | "country";

export interface ResolvedLocation {
  coords: LatLon;
  precision: LocationPrecision;
}

/**
 * Cities indexed by name alone, for the case where a member shares their city
 * but hides their country. Ambiguous names (a "London" in three countries) are
 * intentionally left unresolved rather than guessed at.
 */
const CITY_BY_NAME = new Map<string, LatLon[]>();
for (const [key, coords] of Object.entries(CITY_TABLE)) {
  const city = key.split("|")[0];
  const existing = CITY_BY_NAME.get(city);
  if (existing) existing.push(coords);
  else CITY_BY_NAME.set(city, [coords]);
}

/**
 * Places a free-text city/country pair on the globe, most precise match first.
 * Returns `null` when neither is recognised, which the caller must report
 * rather than swallow.
 */
export function resolveLocation(
  city: string | undefined | null,
  country: string | undefined | null,
): ResolvedLocation | null {
  const place = interpretPlace(city, country);
  const cityKey = normalizePlace(place.city);
  const countryKey = canonicalCountry(place.country);

  if (cityKey && countryKey) {
    const exact = CITY_TABLE[`${cityKey}|${countryKey}`];
    if (exact) return { coords: exact, precision: "city" };
  }

  // City with no usable country: only trust it if the name is unambiguous.
  if (cityKey && !countryKey) {
    const candidates = CITY_BY_NAME.get(cityKey);
    if (candidates?.length === 1)
      return { coords: candidates[0], precision: "city" };
  }

  if (countryKey) {
    const centroid = COUNTRY_TABLE[countryKey];
    if (centroid) return { coords: centroid, precision: "country" };
  }

  return null;
}

/** Exposed for tests and for the gazetteer-coverage check. */
export const gazetteer = { CITY_TABLE, COUNTRY_TABLE };
