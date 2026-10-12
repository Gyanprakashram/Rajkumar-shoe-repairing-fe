const DEFAULT_API_BASE = import.meta.env.DEV
  ? 'http://localhost:8080/api'
  : 'https://rajkumarshoerepairing.onrender.com/api';

export const API_BASE = (import.meta.env.VITE_API?.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
