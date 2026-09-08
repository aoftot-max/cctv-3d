/** แปลง lon/lat → พิกัดฉาก (เมตรประมาณ จากจุดศูนย์กลาง) */
export function project(lon, lat, originLon, originLat) {
  const x = (lon - originLon) * 111320 * Math.cos((originLat * Math.PI) / 180);
  const z = (lat - originLat) * -110540;
  return { x, z };
}

export function lonLatFromXZ(x, z, originLon, originLat) {
  const lon = originLon + x / (111320 * Math.cos((originLat * Math.PI) / 180));
  const lat = originLat + z / -110540;
  return { lon, lat };
}

export function ringToShape(ring, originLon, originLat) {
  const pts = ring.map(([lon, lat]) => {
    const p = project(lon, lat, originLon, originLat);
    return [p.x, p.z];
  });
  return pts;
}

export function computeBounds(feature) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  function walk(c) {
    if (typeof c[0] === 'number') {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else c.forEach(walk);
  }
  walk(feature.geometry.coordinates);
  return { minLon: minX, minLat: minY, maxLon: maxX, maxLat: maxY };
}

export function featureCentroid(bounds) {
  return {
    lon: (bounds.minLon + bounds.maxLon) / 2,
    lat: (bounds.minLat + bounds.maxLat) / 2
  };
}
