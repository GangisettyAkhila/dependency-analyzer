// Centralized API configuration for connecting frontend to FastAPI backend

const VITE_API_URL = import.meta.env.VITE_API_URL;
const PRODUCTION_BACKEND_URL = 'https://dependency-analyzer-x1ud.onrender.com';

// Base URL configuration:
// 1. Uses VITE_API_URL if defined in environment.
// 2. In production builds, defaults to PRODUCTION_BACKEND_URL.
// 3. In local development (Vite dev server), defaults to "" (empty string) to leverage local Vite proxy to http://127.0.0.1:8000.
export const API_BASE_URL = VITE_API_URL || (import.meta.env.DEV ? '' : PRODUCTION_BACKEND_URL);

/**
 * Returns full API URL for a given relative endpoint path.
 * @param {string} endpoint - e.g. "/api/scan" or "/api/scans"
 * @returns {string}
 */
export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export default getApiUrl;
