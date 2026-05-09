/**
 * Data validation and configuration sanity checks
 */

import { ERROR_MESSAGES, PLANNING_4G } from './constants.js';

/**
 * Validates 4G configuration parameters
 * @param {Object} cfg - Configuration object
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validate4GConfig(cfg) {
  const errors = [];

  if (cfg.minReuseKm === undefined || cfg.minReuseKm === null) {
    errors.push('minReuseKm is required');
  } else if (!isFinite(cfg.minReuseKm) || cfg.minReuseKm <= 0) {
    errors.push(ERROR_MESSAGES.CONFIG_MIN_REUSE_POSITIVE);
  }

  if (cfg.minRsiGap === undefined || cfg.minRsiGap === null) {
    errors.push('minRsiGap is required');
  } else if (!isFinite(cfg.minRsiGap) || cfg.minRsiGap <= 0) {
    errors.push(ERROR_MESSAGES.CONFIG_MIN_RSI_GAP_POSITIVE);
  }

  if (cfg.pciMin === undefined || cfg.pciMin === null) {
    errors.push('pciMin is required');
  }
  if (cfg.pciMax === undefined || cfg.pciMax === null) {
    errors.push('pciMax is required');
  }
  if (errors.length === 0) {
    const pciMin = Number(cfg.pciMin);
    const pciMax = Number(cfg.pciMax);
    if (!isFinite(pciMin) || !isFinite(pciMax) || pciMin >= pciMax || pciMin < 0 || pciMax > 503) {
      errors.push(ERROR_MESSAGES.CONFIG_PCI_RANGE);
    }
  }

  if (cfg.rsiMin === undefined || cfg.rsiMin === null) {
    errors.push('rsiMin is required');
  }
  if (cfg.rsiMax === undefined || cfg.rsiMax === null) {
    errors.push('rsiMax is required');
  }
  if (errors.length === 0) {
    const rsiMin = Number(cfg.rsiMin);
    const rsiMax = Number(cfg.rsiMax);
    if (!isFinite(rsiMin) || !isFinite(rsiMax) || rsiMin >= rsiMax || rsiMin < 0 || rsiMax > 837) {
      errors.push(ERROR_MESSAGES.CONFIG_RSI_RANGE);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates coordinate data
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if valid
 */
export function isValidCoordinate(lat, lon) {
  const latNum = Number(lat);
  const lonNum = Number(lon);
  return (
    !isNaN(latNum) &&
    !isNaN(lonNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lonNum >= -180 &&
    lonNum <= 180
  );
}

/**
 * Validates a single data row for new sites
 * @param {Object} row - Data row
 * @param {Object} mapping - Column mapping
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateNewSiteRow(row, mapping) {
  const errors = [];
  
  const siteName = (row[mapping.siteName] || '').trim();
  if (!siteName) errors.push('Site name is required');
  
  const lat = parseFloat(row[mapping.lat]);
  const lon = parseFloat(row[mapping.lon]);
  if (!isValidCoordinate(lat, lon)) {
    errors.push(ERROR_MESSAGES.INVALID_COORDINATES);
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates file size
 * @param {File} file - File object
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export function validateFileSize(file, maxSizeMB = 50) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error: `${ERROR_MESSAGES.FILE_TOO_LARGE} (${file.size} > ${maxBytes} bytes)`,
    };
  }
  return { isValid: true, error: null };
}

/**
 * Sanitizes user input string
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[<>"'`]/g, '')
    .substring(0, 1000); // Limit length
}

/**
 * Escapes CSV special characters
 * @param {string} str - Input string
 * @returns {string} Escaped string safe for CSV
 */
export function escapeCSV(str) {
  if (typeof str !== 'string') return '';
  if (/[,"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
