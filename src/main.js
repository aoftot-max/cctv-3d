import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PROVINCE_GEOJSON_URL, PROVINCE_CODE, REFRESH_MS } from './config.js';
import { loadCameras } from './api.js';
import { project, computeBounds, featureCentroid } from './scene/geo.js';
import { attachTouchGestures } from './scene/touchGestures.js';

const app = document.getElementById('app');
const loading = document.getElementById('loading');
const popup = document.getElementById('popup');
const needle = document.getElementById('needle');

let tool = 'select'; // select | pan
let origin = { lon: 99.2, lat: 14.5 };
let cameras = [];
let markerMeshes = [];
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();

// --- renderer / scene ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x030712, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x030712, 0.000045);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 10, 500000);
camera.position.set(0, 80000, 90000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 8000;
controls.maxDistance = 220000;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = 1.35;
controls.target.set(0, 0, 0);
controls.screenSpacePanning = true;
// ลากซ้าย-ขวาหมุน / ขึ้น-ลงเงย-ก้ม — สอดคล้องทิศที่ต้องการ
controls.rotateSpeed = 0.65;
controls.panSpeed = 0.8;
controls.zoomSpeed = 1.0;

const ambient = new THREE.AmbientLight(0xb0c4de, 0.55);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2e0, 1.1);
sun.position.set(80000, 120000, 40000);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const markersGroup = new THREE.Group();
scene.add(markersGroup);

function setTool(next) {
  tool = next;
  document.getElementById('btn-select').classList.toggle('active', tool === 'select');
  document.getElementById('btn-pan').classList.toggle('active', tool === 'pan');
  // select = orbit, pan = pan (ปุ่มซ้าย)
  controls.enableRotate = tool === 'select';
  controls.enablePan = tool === 'pan';
  renderer.domElement.style.cursor = tool === 'pan' ? 'grab' : 'default';
}

document.getElementById('btn-select').onclick = () => setTool('select');
document.getElementById('btn-pan').onclick = () => setTool('pan');
document.getElementById('btn-zoomin').onclick = () => {
  const d = controls.getDistance() * 0.8;
  const offset = camera.position.clone().sub(controls.target).setLength(Math.max(controls.minDistance, d));
  camera.position.copy(controls.target).add(offset);
};
document.getElementById('btn-zoomout').onclick = () => {
  const d = controls.getDistance() * 1.25;
  const offset = camera.position.clone().sub(controls.target).setLength(Math.min(controls.maxDistance, d));
  camera.position.copy(controls.target).add(offset);
};
document.getElementById('btn-north').onclick = () => {
  const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  sph.theta = 0;
  const pos = new THREE.Vector3().setFromSpherical(sph).add(controls.target);
  camera.position.copy(pos);
  controls.update();
};
document.getElementById('btn-fs').onclick = () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
};

attachTouchGestures(renderer.domElement, controls, () => tool);
setTool('select');

// --- province mesh ---
async function loadProvince() {
  const res = await fetch(PROVINCE_GEOJSON_URL);
  const fc = await res.json();
  const feat = (fc.features || []).find((f) => {
    const p = f.properties || {};
    return String(p.pro_code) === PROVINCE_CODE || p.pro_th === 'กาญจนบุรี' || p.pro_en === 'Kanchanaburi';
  });
  if (!feat) throw new Error('ไม่พบขอบเขตจังหวัดกาญจนบุรี');

  const bounds = computeBounds(feat);
  const c = featureCentroid(bounds);
  origin = { lon: c.lon, lat: c.lat };

  const shape = new THREE.Shape();
  const geomType = feat.geometry.type;
  const polys =
    geomType === 'Polygon'
      ? [feat.geometry.coordinates]
      : feat.geometry.coordinates;

  // ใช้ ring แรกของแต่ละ polygon
  let first = true;
  polys.forEach((poly) => {
    const ring = poly[0];
    ring.forEach(([lon, lat], i) => {
      const { x, z } = project(lon, lat, origin.lon, origin.lat);
      if (first && i === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    });
    first = false;
  });

  // พื้นจังหวัด
  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: 1200,
    bevelEnabled: true,
    bevelThickness: 200,
    bevelSize: 200,
    bevelSegments: 2
  });
  extrude.rotateX(-Math.PI / 2);

  // สีเขียว-น้ำตาลแบบภูมิประเทศง่าย
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3d6b4f,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: false
  });
  const mesh = new THREE.Mesh(extrude, mat);
  world.add(mesh);

  // ขอบเรืองแสงจาง
  const edgeGeom = new THREE.EdgesGeometry(extrude, 20);
  const edgeMat = new THREE.LineBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.4
  });
  world.add(new THREE.LineSegments(edgeGeom, edgeMat));

  // กรอบเส้นนุ่ม (tube-like via fat line approximation = second edges)
  const outlinePts = [];
  polys[0][0].forEach(([lon, lat]) => {
    const { x, z } = project(lon, lat, origin.lon, origin.lat);
    outlinePts.push(new THREE.Vector3(x, 1300, z));
  });
  const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePts);
  const outlineMat = new THREE.LineBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0.35
  });
  world.add(new THREE.Line(outlineGeom, outlineMat));

  // จัดมุมกล้องเริ่มต้น
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const dist = Math.max(size.x, size.z) * 1.15;
  camera.position.set(center.x + dist * 0.35, dist * 0.7, center.z + dist * 0.85);
  controls.update();
}

function clearMarkers() {
  markerMeshes.forEach((m) => {
    markersGroup.remove(m);
    m.geometry?.dispose?.();
    m.material?.dispose?.();
  });
  markerMeshes = [];
}

function makeMarker(cam) {
  const isDown = (cam.status || 'up') === 'down';
  const color = isDown ? 0xf87171 : 0x22d3ee;
  const geom = new THREE.SphereGeometry(420, 20, 16);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.45,
    roughness: 0.35
  });
  const mesh = new THREE.Mesh(geom, mat);
  const { x, z } = project(cam.lng, cam.lat, origin.lon, origin.lat);
  mesh.position.set(x, 1600, z);
  mesh.userData = { cam };
  // วง glow
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(500, 900, 32),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 20;
  mesh.add(ring);
  return mesh;
}

function setMarkers(list) {
  clearMarkers();
  cameras = list || [];
  cameras.forEach((c) => {
    if (c.lat == null || c.lng == null) return;
    const m = makeMarker(c);
    markersGroup.add(m);
    markerMeshes.push(m);
  });
  const up = cameras.filter((c) => c.status !== 'down').length;
  const down = cameras.length - up;
  document.getElementById('stat-up').textContent = String(up);
  document.getElementById('stat-down').textContent = String(down);
  document.getElementById('stat-total').textContent = String(cameras.length);
}

function showPopup(cam, sx, sy) {
  popup.style.display = 'block';
  popup.style.left = Math.min(window.innerWidth - 220, Math.max(8, sx + 12)) + 'px';
  popup.style.top = Math.min(window.innerHeight - 120, Math.max(8, sy + 12)) + 'px';
  const st = (cam.status || 'up') === 'down' ? 'DOWN' : 'UP';
  const cls = st === 'DOWN' ? 'st-down' : 'st-up';
  popup.innerHTML =
    '<h3>' + (cam.name || cam.device || 'กล้อง') + '</h3>' +
    '<p>Device: ' + (cam.device || '–') +
    '<br/>อำเภอ: ' + (cam.amphoe || '–') +
    '<br/>ตำบล: ' + (cam.tambon || '–') +
    '<br/>สถานะ: <span class="' + cls + '">' + st + '</span></p>';
}

function hidePopup() {
  popup.style.display = 'none';
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (tool !== 'select') return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markerMeshes, false);
  if (hits.length) {
    showPopup(hits[0].object.userData.cam, e.clientX, e.clientY);
  } else {
    hidePopup();
  }
});

// --- bootstrap ---
async function boot() {
  try {
    await loadProvince();
    const data = await loadCameras();
    setMarkers(data.cameras || []);
    if (data.demo) {
      document.getElementById('hint').textContent =
        'โหมด demo — ตั้ง VITE_CCTV_API_BASE เป็น URL Web App แล้ว build ใหม่';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('hint').textContent = 'โหลดแผนที่ล้มเหลว: ' + err.message;
  } finally {
    loading.classList.add('hide');
  }

  setInterval(async () => {
    try {
      const data = await loadCameras();
      if (data.cameras) setMarkers(data.cameras);
    } catch (_) {}
  }, REFRESH_MS);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // เข็มทิศ
  const sph = new THREE.Spherical().setFromVector3(
    camera.position.clone().sub(controls.target)
  );
  const deg = (sph.theta * 180) / Math.PI;
  needle.style.transform = 'translateX(-50%) rotate(' + -deg + 'deg)';
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

boot();
animate();
