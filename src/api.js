import { API_BASE } from './config.js';

function demoCameras() {
  const base = [
    [99.532, 14.022, 'ศูนย์เมือง', 'เมืองกาญจนบุรี'],
    [99.48, 14.10, 'แก่งเสี้ยน', 'เมืองกาญจนบุรี'],
    [99.35, 14.20, 'ท่าม่วง', 'ท่าม่วง'],
    [99.25, 14.35, 'ท่ามะกา', 'ท่ามะกา'],
    [99.10, 14.55, 'ทองผาภูมิ', 'ทองผาภูมิ'],
    [98.95, 14.75, 'สังขละบุรี', 'สังขละบุรี'],
    [99.40, 13.95, 'ไทรโยค', 'ไทรโยค'],
    [99.60, 14.15, 'พนมทวน', 'พนมทวน'],
    [99.55, 13.90, 'เลาขวัญ', 'เลาขวัญ'],
    [99.20, 14.05, 'ศรีสวัสดิ์', 'ศรีสวัสดิ์']
  ];
  return base.map((b, i) => ({
    id: String(i + 1),
    name: b[2],
    amphoe: b[3],
    tambon: '',
    device: 'DEMO' + (i + 1),
    lat: b[1],
    lng: b[0],
    status: i === 2 ? 'down' : 'up'
  }));
}

/** JSONP ข้ามโดเมนจาก Apps Script */
function fetchJsonp(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const cb = '__cctv_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timeout'));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (_) { window[cb] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    const script = document.createElement('script');
    const join = url.indexOf('?') >= 0 ? '&' : '?';
    script.src = url + join + 'callback=' + encodeURIComponent(cb);
    script.onerror = () => {
      cleanup();
      reject(new Error('script error'));
    };
    document.head.appendChild(script);
  });
}

export async function loadCameras() {
  if (!API_BASE) {
    console.warn('[CCTV 3D] ยังไม่ตั้ง VITE_CCTV_API_BASE — ใช้ข้อมูล demo');
    return { ok: true, cameras: demoCameras(), demo: true };
  }

  const base = API_BASE.replace(/\/$/, '');
  const url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'action=cameras';

  // ยิงตรงด้วย JSONP ทันที ไม่ผ่าน fetch() เพื่อหลีกเลี่ยง CORS Error ใน Console
  try {
    const data = await fetchJsonp(url);
    if (data && data.cameras) return data;
    throw new Error('invalid payload');
  } catch (err) {
    console.error('[CCTV 3D] API failed', err);
    return { ok: false, cameras: demoCameras(), demo: true, error: String(err) };
  }
}