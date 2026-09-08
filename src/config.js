/**
 * ตั้งค่า Web App URL ของ Google Apps Script หลัง Deploy
 * ตัวอย่าง: https://script.google.com/macros/s/XXXX/exec
 *
 * ถ้ายังไม่ตั้ง จะใช้โหมด demo (จุดตัวอย่างในกาญจนบุรี)
 */
export const API_BASE =
  (typeof window !== 'undefined' && window.CCTV_API_BASE) ||
  import.meta.env.VITE_CCTV_API_BASE ||
  '';

/** รีเฟรชสถานะกล้อง (ms) */
export const REFRESH_MS = 3 * 60 * 1000;

/** ขอบเขตจังหวัดจาก Open data */
export const PROVINCE_GEOJSON_URL =
  'https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/provinces.geojson';

export const PROVINCE_CODE = '71';
