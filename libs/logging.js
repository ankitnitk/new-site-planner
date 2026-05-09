/**
 * Debug logging system for planning tools
 * Enable by adding ?debug to URL or setting localStorage.debug='true'
 */

const DEBUG_ENABLED = () => {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('debug') || localStorage.getItem('debug') === 'true';
};

const TIMESTAMP = () => new Date().toISOString().split('T')[1].substring(0, 12);

/**
 * Log a debug message
 * @param {string} message - Log message
 * @param {*} data - Optional data to log
 */
export function log(message, data = null) {
  if (!DEBUG_ENABLED()) return;
  const prefix = `[${TIMESTAMP()}] [DEBUG]`;
  if (data !== null && data !== undefined) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Log a warning
 * @param {string} message - Warning message
 * @param {*} data - Optional data
 */
export function warn(message, data = null) {
  const prefix = `[${TIMESTAMP()}] [WARN]`;
  if (data !== null && data !== undefined) {
    console.warn(`${prefix} ${message}`, data);
  } else {
    console.warn(`${prefix} ${message}`);
  }
}

/**
 * Log an error
 * @param {string} message - Error message
 * @param {*} err - Error object or data
 */
export function error(message, err = null) {
  const prefix = `[${TIMESTAMP()}] [ERROR]`;
  if (err !== null && err !== undefined) {
    console.error(`${prefix} ${message}`, err);
  } else {
    console.error(`${prefix} ${message}`);
  }
}

/**
 * Measure execution time of a function
 * @param {string} label - Label for the measurement
 * @param {Function} fn - Function to measure
 * @returns {*} Return value of function
 */
export function measure(label, fn) {
  if (!DEBUG_ENABLED()) return fn();
  const start = performance.now();
  const result = fn();
  const duration = (performance.now() - start).toFixed(2);
  log(`${label} took ${duration}ms`);
  return result;
}

/**
 * Enable/disable debug mode
 * @param {boolean} enabled - Enable debug mode
 */
export function setDebugMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('debug', 'true');
  } else {
    localStorage.removeItem('debug');
  }
}
