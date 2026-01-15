import { trackApiUsage } from './db';
import * as fs from 'fs';
import * as path from 'path';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const COSTS = {
  textSearch: 0.032,
  placeDetails: 0.017,
};

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  types?: string[];
  user_ratings_total?: number;
  rating?: number;
  geometry?: { location: { lat: number; lng: number } };
  business_status?: string;
}

interface TextSearchResponse {
  results: PlaceResult[];
  next_page_token?: string;
  status: string;
}

interface PlaceDetailsResponse {
  result: PlaceResult;
  status: string;
}

let chainBlocklist: string[] | null = null;

function loadBlocklist(): string[] {
  if (chainBlocklist) return chainBlocklist;
  const configPath = path.join(process.cwd(), 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const blocklistPath = path.join(process.cwd(), config.blocklist_path);
  
  if (!fs.existsSync(blocklistPath)) {
    chainBlocklist = [];
    return chainBlocklist;
  }
  
  const content = fs.readFileSync(blocklistPath, 'utf-8');
  chainBlocklist = content.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
  return chainBlocklist;
}

function isChain(businessName: string): boolean {
  const blocklist = loadBlocklist();
  const nameLower = businessName.toLowerCase();
  for (let i = 0; i < blocklist.length; i++) {
    const chain = blocklist[i];
    if (nameLower.includes(chain) || chain.includes(nameLower)) return true;
  }
  return false;
}

export async function searchPlaces(
  query: string,
  location: { lat: number; lng: number },
  radiusMeters: number,
  pageToken?: string
): Promise<{ places: PlaceResult[]; nextPageToken?: string }> {
  if (!API_KEY) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('key', API_KEY);
  
  if (pageToken) {
    url.searchParams.set('pagetoken', pageToken);
  } else {
    url.searchParams.set('query', query);
    url.searchParams.set('location', `${location.lat},${location.lng}`);
    url.searchParams.set('radius', radiusMeters.toString());
  }

  const response = await fetch(url.toString());
  const data: TextSearchResponse = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  await trackApiUsage('text_search', 1, COSTS.textSearch);

  const filteredPlaces = data.results.filter(place => {
    if (place.business_status === 'CLOSED_PERMANENTLY') return false;
    if (isChain(place.name)) return false;
    return true;
  });

  return { places: filteredPlaces, nextPageToken: data.next_page_token };
}

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!API_KEY) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'place_id,name,formatted_address,formatted_phone_number,website,types,user_ratings_total,rating,geometry,business_status');

  const response = await fetch(url.toString());
  const data: PlaceDetailsResponse = await response.json();

  if (data.status !== 'OK') {
    if (data.status === 'NOT_FOUND') return null;
    throw new Error(`Google Places API error: ${data.status}`);
  }

  await trackApiUsage('place_details', 1, COSTS.placeDetails);
  return data.result;
}

export function placeToBusinessData(place: PlaceResult) {
  return {
    place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    phone: place.formatted_phone_number,
    website_url: place.website,
    category: place.types?.[0] || null,
    review_count: place.user_ratings_total || 0,
    rating: place.rating,
    latitude: place.geometry?.location.lat,
    longitude: place.geometry?.location.lng,
    business_status: place.business_status,
  };
}

export const HOUSTON_ZIP_CODES = [
  '77001', '77002', '77003', '77004', '77005', '77006', '77007', '77008', '77009', '77010',
  '77011', '77012', '77013', '77014', '77015', '77016', '77017', '77018', '77019', '77020',
  '77021', '77022', '77023', '77024', '77025', '77026', '77027', '77028', '77029', '77030',
  '77031', '77032', '77033', '77034', '77035', '77036', '77037', '77038', '77039', '77040',
  '77041', '77042', '77043', '77044', '77045', '77046', '77047', '77048', '77049', '77050',
  '77051', '77053', '77054', '77055', '77056', '77057', '77058', '77059', '77060', '77061',
  '77062', '77063', '77064', '77065', '77066', '77067', '77068', '77069', '77070', '77071',
  '77072', '77073', '77074', '77075', '77076', '77077', '77078', '77079', '77080', '77081',
  '77082', '77083', '77084', '77085', '77086', '77087', '77088', '77089', '77090', '77091',
  '77092', '77093', '77094', '77095', '77096', '77098', '77099', '77339', '77345', '77346',
];

export function milesToMeters(miles: number): number {
  return miles * 1609.34;
}
