/**
 * Geo Helpers Module
 * Reusable geographical and distance calculation utilities
 */

/**
 * Convert degrees to radians
 * @param {number} d - Degrees
 * @returns {number} Radians
 */
const toRad = d => d * Math.PI / 180;

/**
 * Convert radians to degrees
 * @param {number} r - Radians
 * @returns {number} Degrees
 */
const toDeg = r => r * 180 / Math.PI;

/**
 * Calculate haversine distance between two coordinates
 * @param {number} lat1 - Latitude 1 (degrees)
 * @param {number} lon1 - Longitude 1 (degrees)
 * @param {number} lat2 - Latitude 2 (degrees)
 * @param {number} lon2 - Longitude 2 (degrees)
 * @returns {number} Distance in kilometers
 */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Calculate compass bearing from point A to point B
 * @param {number} lat1 - Source latitude (degrees)
 * @param {number} lon1 - Source longitude (degrees)
 * @param {number} lat2 - Destination latitude (degrees)
 * @param {number} lon2 - Destination longitude (degrees)
 * @returns {number} Bearing in degrees (0-360)
 */
const compassBearing = (lat1, lon1, lat2, lon2) => {
  const dL = toRad(lon2 - lon1);
  const y = Math.sin(dL) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dL);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/**
 * Calculate angular difference between two bearings
 * Always returns the smaller angle (0-180 degrees)
 * @param {number} a - Bearing A (degrees)
 * @param {number} b - Bearing B (degrees)
 * @returns {number} Angle difference (0-180 degrees)
 */
const angleDiff = (a, b) => Math.min(Math.abs(((a - b + 180 + 360) % 360) - 180), 180);

/**
 * Convert bearing angle to compass direction label
 * @param {number} az - Azimuth/bearing in degrees
 * @returns {string} Direction label (e.g., "N", "NE", "E")
 */
const dirLabel = (az) => {
  const DIR = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return DIR[Math.round(az / 22.5) % 16];
};

/**
 * Calculate beam overlap between two cells
 * Returns forward (source→target) and reverse (target→source) overlap scores
 * @param {number} lat1 - Source latitude
 * @param {number} lon1 - Source longitude
 * @param {number} az1 - Source azimuth
 * @param {number} lat2 - Target latitude
 * @param {number} lon2 - Target longitude
 * @param {number} az2 - Target azimuth
 * @param {number} beamWidth - Half-power beam width in degrees
 * @returns {Object} {fwdS: number, revS: number} - Overlap scores (0-1)
 */
const cellOverlap = (lat1, lon1, az1, lat2, lon2, az2, beamWidth) => {
  const dist = haversineKm(lat1, lon1, lat2, lon2);
  if (dist < 0.05) return { fwdS: 0, revS: 0 }; // Same location
  const bear = compassBearing(lat1, lon1, lat2, lon2);
  return {
    fwdS: Math.max(0, 1 - angleDiff(bear, az1) / beamWidth),
    revS: Math.max(0, 1 - angleDiff((bear + 180) % 360, az2) / beamWidth),
  };
};

/**
 * Validate latitude coordinate
 * @param {number} lat - Latitude value
 * @returns {boolean} True if valid (-90 to 90)
 */
const isValidLatitude = (lat) => {
  const n = parseFloat(lat);
  return !isNaN(n) && n >= -90 && n <= 90;
};

/**
 * Validate longitude coordinate
 * @param {number} lon - Longitude value
 * @returns {boolean} True if valid (-180 to 180)
 */
const isValidLongitude = (lon) => {
  const n = parseFloat(lon);
  return !isNaN(n) && n >= -180 && n <= 180;
};
