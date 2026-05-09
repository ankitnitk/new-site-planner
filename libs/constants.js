/**
 * Central constants for all planning tools
 * Reduces magic numbers and improves maintainability
 */

// Geographic constants
export const GEO = {
  EARTH_RADIUS_KM: 6371,
  MIN_CO_LOCATION_KM: 0.05,  // Cells within 5m considered co-located
  PI: Math.PI,
};

// 2G Planning Constants
export const PLANNING_2G = {
  // Overlap thresholds
  OVERLAP_THRESHOLD: 0.05,      // 5% beam overlap threshold
  BRIDGE_REV_THRESHOLD: 0.40,   // 40% reverse overlap for bridge exception
  DEMOTE_MAX: 0.45,              // Max overlap to demote T1→T2
  UPGRADE_MIN: 0.60,             // Min overlap to upgrade T2→T1
  SHADOW_OVL: 0.40,              // Shadow overlap threshold
  OVL_LRB: 0.05,                 // LAC/RAC/BSC overlap threshold
  
  // Radii and distances
  DEFAULT_SEARCH_RADIUS_KM: 10,
  DEFAULT_FIRST_TIER_RADIUS_KM: 5,
  DEFAULT_BSIC_RADIUS_KM: 50,
  DEFAULT_BEAM_WIDTH_DEG: 65,
  
  // Cascade constraints
  TCH_MIN_SEP: 2,                // Adjacent frequency constraint
  BSIC_RADIUS_SHRINK_FACTOR: 0.8, // 80% per iteration
  BSIC_MIN_RADIUS_KM: 1,
  
  // Pool combinatorics
  TCH_COMBO_LIMIT: 60000,        // Max combinations before fallback
};

// 4G Planning Constants
export const PLANNING_4G = {
  // Reuse radius cascade
  REUSE_START_MULTIPLIER: 3,     // Start at 3× minReuse
  REUSE_STEP_FACTOR: 0.1,        // Step down by 10% per iteration
  REUSE_MIN_RADIUS_KM: 0.1,      // Minimum reuse radius
  
  // MOD3 constraints
  SECTORS_PER_MOD3_GROUP: 3,
  
  // Default ranges
  DEFAULT_PCI_MIN: 0,
  DEFAULT_PCI_MAX: 503,
  DEFAULT_RSI_MIN: 0,
  DEFAULT_RSI_MAX: 837,
  DEFAULT_MIN_REUSE_KM: 20,
  DEFAULT_MIN_RSI_GAP: 20,
};

// File parsing constants
export const FILE_PARSING = {
  MAX_FILE_SIZE_MB: 50,
  ENCODING: 'utf-8',
  CSV_SEPARATORS: [',', ';', '\t'],
  QUOTE_CHAR: '"',
};

// UI Constants
export const UI = {
  DEFAULT_MAX_NEIGHBOURS: 10,
  DEFAULT_PLANNING_PASSES: 3,
  PROGRESS_UPDATE_INTERVAL: 3, // Update progress every N sectors
};

// Error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds 50MB limit',
  FILE_READ_FAILED: 'Failed to read file',
  NO_VALID_ROWS: 'No valid rows found after mapping',
  INVALID_COORDINATES: 'Invalid latitude/longitude',
  MISSING_REQUIRED_COLUMNS: 'Missing required columns',
  INVALID_CONFIG: 'Configuration validation failed',
  CONFIG_MIN_REUSE_POSITIVE: 'Minimum reuse distance must be positive',
  CONFIG_MIN_RSI_GAP_POSITIVE: 'Minimum RSI gap must be positive',
  CONFIG_PCI_RANGE: 'PCI min must be less than PCI max, both in [0, 503]',
  CONFIG_RSI_RANGE: 'RSI min must be less than RSI max, both in [0, 837]',
  NETWORK_TOO_DENSE: 'Network is too dense - all frequency pools exhausted',
};
