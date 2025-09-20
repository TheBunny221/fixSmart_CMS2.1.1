// Utility to prefetch OpenStreetMap tiles and prewarm Leaflet module
// This speeds up opening map dialogs by warming cache as soon as the form mounts

const TILE_SUBDOMAINS = ["a", "b", "c"] as const;

function lngLatToTileXY(lng: number, lat: number, zoom: number) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

export function prefetchOsmTiles(lat: number, lng: number, zoom = 13, radius = 1) {
  try {
    const { x, y } = lngLatToTileXY(lng, lat, zoom);
    const images: HTMLImageElement[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const sub = TILE_SUBDOMAINS[(Math.abs(dx + dy) % TILE_SUBDOMAINS.length) as 0 | 1 | 2];
        const url = `https://${sub}.tile.openstreetmap.org/${zoom}/${x + dx}/${y + dy}.png`;
        const img = new Image();
        // Use anonymous crossOrigin to leverage HTTP cache without tainting canvas
        img.crossOrigin = "anonymous";
        img.referrerPolicy = "no-referrer";
        img.src = url;
        images.push(img);
      }
    }
    return images;
  } catch (e) {
    // Silent fail – prefetch is a best-effort optimization
    return [] as HTMLImageElement[];
  }
}

export async function prewarmLeaflet() {
  try {
    await import("leaflet");
  } catch {
    // ignore
  }
}

export async function prewarmMapAssets(lat: number, lng: number, zoom = 13) {
  prefetchOsmTiles(lat, lng, zoom, 1);
  await prewarmLeaflet();
}
