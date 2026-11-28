import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore.js';
import { MAP_DEPTH, MAP_WIDTH, TARGET_Y } from './terrainField.js';

const CAMERA_RADIUS = 90;
const DEFAULT_AZIMUTH = Math.PI / 4;
const DEFAULT_ELEVATION = Math.atan2(1.15, Math.SQRT2);
const MIN_ELEVATION = 0.38;
const MAX_ELEVATION = 1.25;
const TURN_MS = 600;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export interface CameraFocus {
  x: number;
  y: number;
  z: number;
  zoom: 'home' | 'zone';
  span: number;
}

interface CameraRigProps {
  focusTarget: CameraFocus;
  focusNonce: number;
}

/**
 * Orthographic strategy camera. Left-drag pans, right-drag (or Shift+drag)
 * tilts and rotates, wheel zooms, and target stays clamped inside map bounds.
 */
export function CameraRig({ focusTarget, focusNonce }: CameraRigProps) {
  const { camera, gl, size } = useThree();
  const goal = useRef(new THREE.Vector3(0, TARGET_Y, 0));
  const current = useRef(goal.current.clone());
  const zoomGoal = useRef(2);
  const minZoom = useRef(1);
  const maxZoom = useRef(4);
  const homeZoom = useRef(2);
  const azimuthGoal = useRef(DEFAULT_AZIMUTH);
  const azimuthCurrent = useRef(DEFAULT_AZIMUTH);
  const turn = useRef<{ from: number; to: number; start: number } | null>(null);
  const elevationGoal = useRef(DEFAULT_ELEVATION);
  const elevationCurrent = useRef(DEFAULT_ELEVATION);
  const offsetVec = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const focusRef = useRef(focusTarget);
  const sizeRef = useRef(size);
  const viewTurns = useAppStore((state) => state.viewTurns);
  const setViewAzimuth = useAppStore((state) => state.setViewAzimuth);
  const appliedTurns = useRef(viewTurns);
  const publishedAzimuth = useRef(Number.NaN);
  focusRef.current = focusTarget;
  sizeRef.current = size;

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    if (!cam.isOrthographicCamera) return;

    const aspect = size.width / Math.max(1, size.height);
    const viewHeight = MAP_DEPTH * 1.35;
    const viewWidth = viewHeight * aspect;

    cam.left = -viewWidth / 2;
    cam.right = viewWidth / 2;
    cam.top = viewHeight / 2;
    cam.bottom = -viewHeight / 2;
    cam.near = 0.1;
    cam.far = 300;
    cam.updateProjectionMatrix();

    const fitZoom =
      Math.min(
        viewWidth / MAP_WIDTH,
        viewHeight / (MAP_DEPTH * Math.cos(DEFAULT_ELEVATION)),
      ) * 1.02;
    minZoom.current = Math.max(0.6, fitZoom);
    maxZoom.current = Math.max(minZoom.current + 1, minZoom.current * 3.8);
    homeZoom.current = minZoom.current;

    if (!initialized.current) {
      zoomGoal.current = minZoom.current;
      initialized.current = true;
    } else {
      zoomGoal.current = clamp(zoomGoal.current, minZoom.current, maxZoom.current);
    }
  }, [camera, size.width, size.height]);

  const limits = (): { x: number; z: number } => ({
    x: MAP_WIDTH / 2,
    z: MAP_DEPTH / 2,
  });

  const clampGoal = () => {
    const limit = limits();
    goal.current.x = clamp(goal.current.x, -limit.x, limit.x);
    goal.current.z = clamp(goal.current.z, -limit.z, limit.z);
  };

  useEffect(() => {
    const target = focusRef.current;
    const cam = camera as THREE.OrthographicCamera;
    turn.current = null;
    const viewWidth = cam.right - cam.left;
    const zoneZoom =
      Number.isFinite(viewWidth) && viewWidth > 0
        ? viewWidth / (Math.max(4, target.span) * 1.15)
        : 2.4;
    goal.current.set(target.x, target.y, target.z);
    zoomGoal.current =
      target.zoom === 'zone'
        ? clamp(zoneZoom, minZoom.current, maxZoom.current)
        : homeZoom.current;
    if (target.zoom === 'home') {
      azimuthGoal.current = DEFAULT_AZIMUTH;
      elevationGoal.current = DEFAULT_ELEVATION;
    }
    clampGoal();
  }, [focusNonce, size.width, size.height]);

  useEffect(() => {
    const delta = viewTurns - appliedTurns.current;
    appliedTurns.current = viewTurns;
    if (delta !== 0) {
      const to = azimuthGoal.current + delta * (Math.PI / 2);
      turn.current = {
        from: azimuthCurrent.current,
        to,
        start: performance.now(),
      };
      azimuthGoal.current = to;
    }
  }, [viewTurns]);

  useEffect(() => {
    const dom = gl.domElement;
    let mode: 'none' | 'pan' | 'orbit' = 'none';
    let lastX = 0;
    let lastY = 0;
    let pointerId = -1;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button === 2 || (event.button === 0 && event.shiftKey)) {
        mode = 'orbit';
      } else if (event.button === 0) {
        mode = 'pan';
      } else {
        return;
      }
      if (mode === 'orbit') {
        turn.current = null;
        azimuthGoal.current = azimuthCurrent.current;
      }
      lastX = event.clientX;
      lastY = event.clientY;
      pointerId = event.pointerId;
      dom.setPointerCapture(event.pointerId);
      dom.style.cursor = mode === 'orbit' ? 'move' : 'grabbing';
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (mode === 'none') return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;

      if (mode === 'orbit') {
        azimuthGoal.current -= dx * 0.006;
        elevationGoal.current = clamp(
          elevationGoal.current + dy * 0.005,
          MIN_ELEVATION,
          MAX_ELEVATION,
        );
        event.preventDefault();
        return;
      }

      const cam = camera as THREE.OrthographicCamera;
      const viewportHeight = Math.max(1, sizeRef.current.height);
      const worldPerPixel = (cam.top - cam.bottom) / viewportHeight / cam.zoom;
      const right = new THREE.Vector3(1, 0, 0)
        .applyQuaternion(cam.quaternion)
        .setY(0)
        .normalize();
      const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(cam.quaternion)
        .setY(0)
        .normalize();

      const cosEl = Math.max(0.25, Math.cos(elevationCurrent.current));
      goal.current.addScaledVector(right, -dx * worldPerPixel);
      goal.current.addScaledVector(up, (dy * worldPerPixel) / cosEl);
      clampGoal();
      event.preventDefault();
    };

    const endDrag = (event: PointerEvent) => {
      if (mode === 'none') return;
      mode = 'none';
      if (pointerId >= 0 && dom.hasPointerCapture(pointerId)) {
        dom.releasePointerCapture(pointerId);
      }
      pointerId = -1;
      dom.style.cursor = 'grab';
      event.preventDefault();
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const next = zoomGoal.current * Math.exp(-event.deltaY * 0.0014);
      zoomGoal.current = clamp(next, minZoom.current, maxZoom.current);
      clampGoal();
    };

    dom.style.cursor = 'grab';
    dom.style.touchAction = 'none';
    dom.addEventListener('contextmenu', onContextMenu);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);
    dom.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      dom.removeEventListener('contextmenu', onContextMenu);
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endDrag);
      dom.removeEventListener('pointercancel', endDrag);
      dom.removeEventListener('wheel', onWheel);
      dom.style.cursor = '';
      dom.style.touchAction = '';
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const cam = camera as THREE.OrthographicCamera;
    if (!cam.isOrthographicCamera) return;

    if (!Number.isFinite(current.current.x) || !Number.isFinite(current.current.z)) {
      current.current.set(0, TARGET_Y, 0);
    }
    if (!Number.isFinite(goal.current.x) || !Number.isFinite(goal.current.z)) {
      goal.current.set(0, TARGET_Y, 0);
    }

    const damping = 1 - Math.exp(-12 * Math.min(delta, 0.1));
    clampGoal();
    current.current.lerp(goal.current, damping);
    if (turn.current) {
      const t = Math.min(1, (performance.now() - turn.current.start) / TURN_MS);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
      azimuthCurrent.current =
        turn.current.from + (turn.current.to - turn.current.from) * eased;
      if (t >= 1) {
        turn.current = null;
        publishedAzimuth.current = Number.NaN;
      }
    } else {
      azimuthCurrent.current = THREE.MathUtils.lerp(
        azimuthCurrent.current,
        azimuthGoal.current,
        damping,
      );
    }
    const azimuthDeg = THREE.MathUtils.radToDeg(azimuthCurrent.current);
    if (
      !Number.isFinite(publishedAzimuth.current) ||
      Math.abs(azimuthDeg - publishedAzimuth.current) >= 2
    ) {
      publishedAzimuth.current = azimuthDeg;
      setViewAzimuth(azimuthDeg);
    }
    elevationCurrent.current = THREE.MathUtils.lerp(
      elevationCurrent.current,
      elevationGoal.current,
      damping,
    );

    const nextZoom = THREE.MathUtils.lerp(cam.zoom, zoomGoal.current, damping);
    if (Math.abs(nextZoom - cam.zoom) > 0.0001) {
      cam.zoom = nextZoom;
      cam.updateProjectionMatrix();
    }

    const horiz = CAMERA_RADIUS * Math.cos(elevationCurrent.current);
    offsetVec.current.set(
      horiz * Math.sin(azimuthCurrent.current),
      CAMERA_RADIUS * Math.sin(elevationCurrent.current),
      horiz * Math.cos(azimuthCurrent.current),
    );

    cam.position.copy(current.current).add(offsetVec.current);
    cam.lookAt(current.current);
    cam.updateMatrixWorld();
  });

  return null;
}
