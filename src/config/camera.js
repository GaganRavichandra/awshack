// 4clique Geospatial Camera Configuration
// Default Center: Bengaluru Center (Vidhana Soudha / MG Road axis)

export const BENGALURU_CENTER = [77.5946, 12.9716]; // [Longitude, Latitude]
export const KARNATAKA_CENTER = [75.7139, 15.3173];

const FALLBACK_B64 = 'cGsuZXlKMUlqb2laMk5vYVc1dFlYazBNU0lzSW1FaU9pSmpiWFY2TXpkamNHMHdiMmQ0TW5semFuRXhkSEZ0ZDJFekluMC5IUWw3ZllvbnpyVTgzZ1JMNmJvZkNB';

export const MAPBOX_VERIFIED_TOKEN =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MAPBOX_TOKEN && import.meta.env.VITE_MAPBOX_TOKEN.length > 30)
    ? import.meta.env.VITE_MAPBOX_TOKEN
    : (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('4clique_mapbox_token') && window.localStorage.getItem('4clique_mapbox_token').length > 30)
      ? window.localStorage.getItem('4clique_mapbox_token')
      : (typeof atob === 'function' ? atob(FALLBACK_B64) : '');

export const TARGET_CAMERA = {
  center: BENGALURU_CENTER,
  latitude: 12.9716,
  longitude: 77.5946,
  zoom: 14.5,
  pitch: 55,
  bearing: -15,
  maxPitch: 85,
  minZoom: 5.5,
  maxZoom: 18
};

export const KARNATAKA_CAMERA = {
  center: KARNATAKA_CENTER,
  latitude: 15.3173,
  longitude: 75.7139,
  zoom: 6.8,
  pitch: 35,
  bearing: 0
};

export const TERRAIN_CONFIG = {
  source: 'mapbox-dem',
  url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  tileSize: 512,
  maxzoom: 14,
  exaggeration: 1.4
};
