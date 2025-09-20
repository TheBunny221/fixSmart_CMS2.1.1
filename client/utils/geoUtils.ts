// Geographic utilities for area detection and boundary management

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Boundary {
  coordinates: [number, number][]; // Array of [lat, lng] points
  center?: Coordinates;
  boundingBox?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface Ward {
  id: string;
  name: string;
  description?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  boundingBox?: string;
  subZones?: SubZone[];
}

export interface SubZone {
  id: string;
  name: string;
  wardId: string;
  description?: string;
  boundaries?: string;
  centerLat?: number;
  centerLng?: number;
  boundingBox?: string;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  const { lat, lng } = point;
  let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const coordI = polygon[i];
      const coordJ = polygon[j];
      if (!coordI || !coordJ) continue;
      const [lat_i, lng_i] = coordI;
      const [lat_j, lng_j] = coordJ;

    if (
      lng_i > lng !== lng_j > lng &&
      lat < ((lat_j - lat_i) * (lng - lng_i)) / (lng_j - lng_i) + lat_i
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Check if a point is inside a bounding box
 */
export function isPointInBoundingBox(
  point: Coordinates,
  boundingBox: { north: number; south: number; east: number; west: number }
): boolean {
  return (
    point.lat >= boundingBox.south &&
    point.lat <= boundingBox.north &&
    point.lng >= boundingBox.west &&
    point.lng <= boundingBox.east
  );
}

/**
 * Find which ward and sub-zone a point belongs to
 */
export function detectLocationArea(
  coordinates: Coordinates,
  wards: Ward[]
): { ward: Ward | null; subZone: SubZone | null } {
  let matchedWard: Ward | null = null;
  let matchedSubZone: SubZone | null = null;

  // First, find the ward
  for (const ward of wards) {
    if (!ward.boundaries) continue;

    try {
      const boundaries = JSON.parse(ward.boundaries) as [number, number][];
      
      // Quick bounding box check first (if available)
      if (ward.boundingBox) {
        const boundingBox = JSON.parse(ward.boundingBox);
        if (!isPointInBoundingBox(coordinates, boundingBox)) {
          continue;
        }
      }

      // Detailed polygon check
      if (isPointInPolygon(coordinates, boundaries)) {
        matchedWard = ward;
        break;
      }
    } catch (error) {
      console.error(`Error parsing boundaries for ward ${ward.name}:`, error);
    }
  }

  // If we found a ward, check its sub-zones
  if (matchedWard && matchedWard.subZones) {
    for (const subZone of matchedWard.subZones) {
      if (!subZone.boundaries) continue;

      try {
        const boundaries = JSON.parse(subZone.boundaries) as [number, number][];
        
        // Quick bounding box check first (if available)
        if (subZone.boundingBox) {
          const boundingBox = JSON.parse(subZone.boundingBox);
          if (!isPointInBoundingBox(coordinates, boundingBox)) {
            continue;
          }
        }

        // Detailed polygon check
        if (isPointInPolygon(coordinates, boundaries)) {
          matchedSubZone = subZone;
          break;
        }
      } catch (error) {
        console.error(`Error parsing boundaries for sub-zone ${subZone.name}:`, error);
      }
    }
  }

  return { ward: matchedWard, subZone: matchedSubZone };
}

/**
 * Get the nearest ward/sub-zone if no exact match is found
 */
export function findNearestArea(
  coordinates: Coordinates,
  wards: Ward[]
): { ward: Ward | null; subZone: SubZone | null; distance: number } {
  let nearestWard: Ward | null = null;
  let nearestSubZone: SubZone | null = null;
  let minDistance = Infinity;

  for (const ward of wards) {
    if (ward.centerLat && ward.centerLng) {
      const distance = calculateDistance(
        coordinates,
        { lat: ward.centerLat, lng: ward.centerLng }
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestWard = ward;
        nearestSubZone = null; // Reset sub-zone when ward changes

        // Check sub-zones for the nearest ward
        if (ward.subZones) {
          let minSubZoneDistance = Infinity;
          for (const subZone of ward.subZones) {
            if (subZone.centerLat && subZone.centerLng) {
              const subZoneDistance = calculateDistance(
                coordinates,
                { lat: subZone.centerLat, lng: subZone.centerLng }
              );

              if (subZoneDistance < minSubZoneDistance) {
                minSubZoneDistance = subZoneDistance;
                nearestSubZone = subZone;
              }
            }
          }
        }
      }
    }
  }

  return { ward: nearestWard, subZone: nearestSubZone, distance: minDistance };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the center point of a polygon
 */
export function calculatePolygonCenter(coordinates: [number, number][]): Coordinates {
  const latSum = coordinates.reduce((sum, coord) => sum + coord[0], 0);
  const lngSum = coordinates.reduce((sum, coord) => sum + coord[1], 0);
  return {
    lat: latSum / coordinates.length,
    lng: lngSum / coordinates.length,
  };
}

/**
 * Calculate bounding box for a polygon
 */
export function calculateBoundingBox(coordinates: [number, number][]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  const lats = coordinates.map(coord => coord[0]);
  const lngs = coordinates.map(coord => coord[1]);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Validate polygon coordinates
 */
export function validatePolygon(coordinates: [number, number][]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!coordinates || coordinates.length < 3) {
    errors.push("Polygon must have at least 3 points");
  }

  if (coordinates.length > 0) {
      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        if (!coord) {
          errors.push(`Invalid coordinate at index ${i}: missing value`);
          continue;
        }
        const [lat, lng] = coord;
      
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        errors.push(`Invalid coordinate at index ${i}: must be numbers`);
        continue;
      }

      if (lat < -90 || lat > 90) {
        errors.push(`Invalid latitude at index ${i}: must be between -90 and 90`);
      }

      if (lng < -180 || lng > 180) {
        errors.push(`Invalid longitude at index ${i}: must be between -180 and 180`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Simplify polygon using Douglas-Peucker algorithm (basic implementation)
 */
export function simplifyPolygon(
  coordinates: [number, number][],
  tolerance: number = 0.0001
): [number, number][] {
  if (coordinates.length <= 2) return coordinates;

  // Find the point with the maximum distance from line between start and end
  let maxDistance = 0;
  let maxIndex = 0;
    const start = coordinates[0]!;
    const end = coordinates[coordinates.length - 1]!;

  for (let i = 1; i < coordinates.length - 1; i++) {
      const point = coordinates[i];
      if (!point) continue;
      const distance = pointToLineDistance(point, start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyPolygon(coordinates.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(coordinates.slice(maxIndex), tolerance);

    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

/**
 * Calculate perpendicular distance from a point to a line
 */
function pointToLineDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  const [x0, y0] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const numerator = Math.abs(
    (y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1
  );
  const denominator = Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

  return numerator / denominator;
}
