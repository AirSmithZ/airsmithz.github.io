import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { capturePointer } from '../compat';
import type { DayPlan } from '../types';
import {
  CELL_PAD,
  OVERVIEW_DRAG_PX,
  OVERVIEW_REGION_CROSS_PX,
  predictNodePlacement,
  type Box,
  type OverviewLayout,
} from './layout';

export interface DragPreview {
  nodeId: string;
  dayIndex: number;
  sourceRegion: string;
  targetRegion: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlacePatch {
  region?: string;
  overview_offset?: { x: number; y: number } | null;
}

interface Session {
  nodeId: string;
  dayIndex: number;
  region: string;
  stickyRegion: string;
  pointerId: number;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  originOffsetX: number;
  originOffsetY: number;
  width: number;
  height: number;
  activated: boolean;
  captureEl: Element | null;
  layout: OverviewLayout;
}

function regionTop(layout: OverviewLayout, region: string): number {
  return layout.regionTops.get(region) ?? 0;
}

function columnBox(layout: OverviewLayout, dayIndex: number): { left: number; width: number } {
  return {
    left: layout.columnOffsets[dayIndex] ?? 0,
    width: layout.columnWidths[dayIndex] ?? 0,
  };
}

function clampLeft(layout: OverviewLayout, dayIndex: number, left: number, width: number): number {
  const column = columnBox(layout, dayIndex);
  const min = column.left + CELL_PAD;
  const max = Math.max(min, column.left + column.width - CELL_PAD - width);
  return Math.max(min, Math.min(max, left));
}

function pointerInColumn(layout: OverviewLayout, dayIndex: number, matrixX: number): boolean {
  const column = columnBox(layout, dayIndex);
  return matrixX >= column.left && matrixX <= column.left + column.width;
}

/** 中心越过当前行边界 24px 才换行，避免在边界上来回跳。 */
function stickyRegion(layout: OverviewLayout, current: string, centerY: number): string {
  const regions = layout.regions;
  const index = regions.indexOf(current);
  if (index < 0) return current;
  const top = regionTop(layout, current);
  const height = layout.regionHeights.get(current) ?? 0;
  if (index < regions.length - 1 && centerY > top + height - OVERVIEW_REGION_CROSS_PX) {
    return regions[index + 1] ?? current;
  }
  if (index > 0 && centerY < top + OVERVIEW_REGION_CROSS_PX) {
    return regions[index - 1] ?? current;
  }
  return current;
}

export function useMatrixDrag(
  matrixRef: RefObject<HTMLDivElement | null>,
  days: DayPlan[],
  enabled: boolean,
  spread: boolean,
  onCommit: (dayIndex: number, nodeId: string, patch: PlacePatch) => void,
  onTap: (nodeId: string) => void,
) {
  const sessionRef = useRef<Session | null>(null);
  const blockClick = useRef(false);
  const onCommitRef = useRef(onCommit);
  const onTapRef = useRef(onTap);
  const daysRef = useRef(days);
  const spreadRef = useRef(spread);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onTapRef.current = onTap;
    daysRef.current = days;
    spreadRef.current = spread;
  }, [onCommit, days, onTap, spread]);

  const end = useCallback(() => {
    sessionRef.current = null;
    setPreview(null);
  }, []);

  const restPreview = useCallback((session: Session): DragPreview => {
    const column = columnBox(session.layout, session.dayIndex);
    return {
      nodeId: session.nodeId,
      dayIndex: session.dayIndex,
      sourceRegion: session.region,
      targetRegion: session.region,
      left: column.left + session.baseX + session.originOffsetX,
      top: regionTop(session.layout, session.region) + session.baseY + session.originOffsetY,
      width: session.width,
      height: session.height,
    };
  }, []);

  const frameOf = useCallback((session: Session, clientX: number, clientY: number): {
    preview: DragPreview;
    patch: PlacePatch | null;
    outside: boolean;
  } | null => {
    const matrix = matrixRef.current;
    if (!matrix) return null;
    const rect = matrix.getBoundingClientRect();
    const matrixX = clientX - rect.left;
    const layout = session.layout;
    const column = columnBox(layout, session.dayIndex);
    if (!pointerInColumn(layout, session.dayIndex, matrixX)) {
      return { preview: restPreview(session), patch: null, outside: true };
    }

    const deltaX = clientX - session.startX;
    const unclampedLeft = column.left + session.baseX + session.originOffsetX + deltaX;
    const left = clampLeft(layout, session.dayIndex, unclampedLeft, session.width);
    const nextOffsetX = left - column.left - session.baseX;

    const followTop =
      regionTop(layout, session.region) + session.baseY + session.originOffsetY + (clientY - session.startY);
    const centerY = followTop + session.height / 2;
    const target = stickyRegion(layout, session.stickyRegion, centerY);
    session.stickyRegion = target;

    const rawY = followTop - regionTop(layout, session.region) - session.baseY;
    const rowH = layout.regionHeights.get(session.region) ?? 0;
    const maxY = Math.max(0, rowH - CELL_PAD * 2 - session.height);
    const nextOffsetY = Math.max(0, Math.min(maxY, rawY));
    const regionChanged = target !== session.region;
    const day = daysRef.current[session.dayIndex];
    const predicted =
      regionChanged && day ? predictNodePlacement(day, target, session.nodeId, spreadRef.current) : null;

    const ghostLeft = column.left + session.baseX + nextOffsetX;
    const ghostTop = regionChanged
      ? regionTop(layout, target) + (predicted?.y ?? CELL_PAD)
      : regionTop(layout, session.region) + session.baseY + nextOffsetY;

    let patch: PlacePatch | null = null;
    const xChanged = nextOffsetX !== session.originOffsetX;
    const yChanged = nextOffsetY !== session.originOffsetY;
    if (regionChanged) {
      if (xChanged && predicted) {
        patch = {
          region: target,
          overview_offset: { x: left - column.left - predicted.x, y: 0 },
        };
      } else {
        patch = { region: target, overview_offset: null };
      }
    } else if (xChanged || yChanged) {
      patch = { overview_offset: { x: nextOffsetX, y: nextOffsetY } };
    }

    return {
      outside: false,
      patch,
      preview: {
        nodeId: session.nodeId,
        dayIndex: session.dayIndex,
        sourceRegion: session.region,
        targetRegion: target,
        left: ghostLeft,
        top: ghostTop,
        width: session.width,
        height: session.height,
      },
    };
  }, [matrixRef, restPreview]);

  const finish = useCallback((clientX: number, clientY: number, pointerId: number) => {
    const session = sessionRef.current;
    if (!session || session.pointerId !== pointerId) return;
    if (!session.activated) {
      const nodeId = session.nodeId;
      end();
      onTapRef.current(nodeId);
      return;
    }
    blockClick.current = true;
    const frame = frameOf(session, clientX, clientY);
    if (frame && !frame.outside && frame.patch) {
      onCommitRef.current(session.dayIndex, session.nodeId, frame.patch);
    }
    end();
  }, [end, frameOf]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) return;
      if (!session.activated) {
        if (Math.hypot(event.clientX - session.startX, event.clientY - session.startY) < OVERVIEW_DRAG_PX) return;
        session.activated = true;
        capturePointer(session.captureEl, session.pointerId);
      }
      const frame = frameOf(session, event.clientX, event.clientY);
      if (frame) setPreview(frame.preview);
    };
    const onUp = (event: PointerEvent) => {
      if (sessionRef.current?.pointerId === event.pointerId) finish(event.clientX, event.clientY, event.pointerId);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [finish, frameOf]);

  const onPointerDown = useCallback((
    event: ReactPointerEvent,
    nodeId: string,
    dayIndex: number,
    region: string,
    place: Box,
    _columnLeft: number,
    _regionTop: number,
    originOffset: { x: number; y: number },
    layout: OverviewLayout,
  ) => {
    if (!enabled || event.button !== 0) return;
    sessionRef.current = {
      nodeId,
      dayIndex,
      region,
      stickyRegion: region,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: place.x - originOffset.x,
      baseY: place.y - originOffset.y,
      originOffsetX: originOffset.x,
      originOffsetY: originOffset.y,
      width: place.width,
      height: place.height,
      activated: false,
      captureEl: event.currentTarget instanceof Element ? event.currentTarget : null,
      layout,
    };
  }, [enabled]);

  const shouldSelect = useCallback(() => {
    if (!blockClick.current) return true;
    blockClick.current = false;
    return false;
  }, []);

  return { preview, onPointerDown, shouldSelect };
}
