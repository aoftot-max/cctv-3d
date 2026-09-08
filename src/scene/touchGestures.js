/**
 * สัมผัสมือถือแนว SIAHRA
 * - 1 นิ้ว + select: orbit
 * - 1 นิ้ว + pan: เลื่อน target
 * - 2 นิ้ว: pinch zoom
 */
export function attachTouchGestures(dom, controls, getTool) {
  let mode = null;
  let lastX = 0;
  let lastY = 0;
  let lastDist = 0;

  function dist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }

  function onStart(e) {
    if (!e.touches || !e.touches.length) return;
    if (e.touches.length === 1) {
      mode = 'one';
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else {
      mode = 'two';
      lastDist = dist(e.touches);
      lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }

  function onMove(e) {
    if (!mode) return;
    e.preventDefault();
    const tool = getTool();

    if (mode === 'one' && e.touches.length === 1) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;

      if (tool === 'pan') {
        const factor = controls.getDistance() * 0.0012;
        controls.target.x -= dx * factor;
        controls.target.z -= dy * factor;
      } else {
        // ลากซ้าย→หมุนซ้าย | ขวา→หมุนขวา | ขึ้น→เงย | ลง→ก้ม
        controls.setAzimuthalAngle(controls.getAzimuthalAngle() - dx * 0.005);
        const polar = controls.getPolarAngle() + dy * 0.004;
        controls.setPolarAngle(Math.max(0.18, Math.min(1.35, polar)));
      }
      controls.update();
    } else if (mode === 'two' && e.touches.length >= 2) {
      const d = dist(e.touches);
      const scale = lastDist / Math.max(1, d);
      lastDist = d;
      const next = Math.max(
        controls.minDistance,
        Math.min(controls.maxDistance, controls.getDistance() * scale)
      );
      const offset = controls.object.position.clone().sub(controls.target).setLength(next);
      controls.object.position.copy(controls.target).add(offset);
      controls.update();
    }
  }

  function onEnd() {
    mode = null;
  }

  dom.addEventListener('touchstart', onStart, { passive: true });
  dom.addEventListener('touchmove', onMove, { passive: false });
  dom.addEventListener('touchend', onEnd);
  dom.addEventListener('touchcancel', onEnd);

  return function dispose() {
    dom.removeEventListener('touchstart', onStart);
    dom.removeEventListener('touchmove', onMove);
    dom.removeEventListener('touchend', onEnd);
    dom.removeEventListener('touchcancel', onEnd);
  };
}
