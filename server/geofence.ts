export function computeDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export type GeofenceStatus = 'ok' | 'soft_warning' | 'hard_block';

export interface GeofenceResult {
  status: GeofenceStatus;
  distanceMeters: number;
  thresholdMeters: number;
  overrideAllowed: boolean;
  message: string;
}

export function evaluateGeofenceStatus(
  workerLocation: { lat: number; lng: number },
  propertyCenter: { lat: number; lng: number } | null,
  radiusMeters: number,
  manualOverrideAllowed: boolean
): GeofenceResult {
  if (!propertyCenter) {
    return {
      status: 'ok',
      distanceMeters: 0,
      thresholdMeters: radiusMeters,
      overrideAllowed: true,
      message: 'No geofence configured for this property',
    };
  }

  const distance = computeDistanceMeters(
    workerLocation.lat,
    workerLocation.lng,
    propertyCenter.lat,
    propertyCenter.lng
  );

  const softThreshold = radiusMeters + 50;

  if (distance <= radiusMeters) {
    return {
      status: 'ok',
      distanceMeters: distance,
      thresholdMeters: radiusMeters,
      overrideAllowed: manualOverrideAllowed,
      message: `Within ${radiusMeters}m boundary`,
    };
  }

  if (distance <= softThreshold) {
    return {
      status: 'soft_warning',
      distanceMeters: distance,
      thresholdMeters: radiusMeters,
      overrideAllowed: manualOverrideAllowed,
      message: `You are ${Math.round(distance)}m from property (${Math.round(radiusMeters)}m boundary). Continue anyway?`,
    };
  }

  return {
    status: 'hard_block',
    distanceMeters: distance,
    thresholdMeters: radiusMeters,
    overrideAllowed: manualOverrideAllowed,
    message: `Too far from property: ${Math.round(distance)}m away (max ${Math.round(softThreshold)}m)`,
  };
}
