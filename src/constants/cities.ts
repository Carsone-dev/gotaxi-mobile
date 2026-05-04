export const VILLES: Record<string, { lat: number; lng: number }> = {
  Cotonou: { lat: 6.3703, lng: 2.3912 },
  "Porto-Novo": { lat: 6.4969, lng: 2.6289 },
  "Abomey-Calavi": { lat: 6.4487, lng: 2.3557 },
  Bohicon: { lat: 7.1891, lng: 2.0665 },
  Parakou: { lat: 9.3372, lng: 2.6281 },
  Natitingou: { lat: 10.3061, lng: 1.3799 },
  Kandi: { lat: 11.1334, lng: 2.9382 },
  Djougou: { lat: 9.7062, lng: 1.6658 },
  Savè: { lat: 8.0389, lng: 2.4855 },
  "Dassa-Zoumé": { lat: 7.755, lng: 2.1723 },
  Abomey: { lat: 7.185, lng: 1.9878 },
  Lokossa: { lat: 6.638, lng: 1.7166 },
};

export const VILLES_LIST = Object.keys(VILLES);

export function nearestCity(lat: number, lng: number): string {
  let nearest = VILLES_LIST[0];
  let minDist = Infinity;
  for (const city of VILLES_LIST) {
    const c = VILLES[city];
    const dist = (lat - c.lat) ** 2 + (lng - c.lng) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return nearest;
}
