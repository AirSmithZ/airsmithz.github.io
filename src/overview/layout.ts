import type { DayPlan, TripEdge, TripNode } from '../types';
import { edgeModeWord } from '../trip';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 64;
const NODE_GAP = 112;
export const MIN_COLUMN_WIDTH = 240;
export const OVERVIEW_DRAG_PX = 8;
export const OVERVIEW_REGION_CROSS_PX = 24;
const HEADER_HEIGHT = 74;
const RAIL_WIDTH = 96;
export const CELL_PAD = 8;
const EMPTY_ROW = 160;
const NOTE_HEIGHT = 36;
const GROUP_PAD_X = 10;
const GROUP_PAD_TOP = 22;
const GROUP_TAIL = 14;
const FORK_LANE = 56;
const COLUMN_BUFFER = 1;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaidEdge {
  edge: TripEdge;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sourceSide: Side;
  targetSide: Side;
  alt: boolean;
}

export interface SceneFrame {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CellLayout {
  placements: Map<string, Box>;
  edges: LaidEdge[];
  groups: SceneFrame[];
  width: number;
  height: number;
  note: string | null;
}

export interface OverviewCell {
  dayIndex: number;
  region: string;
  nodes: TripNode[];
  layout: CellLayout;
}

export interface BridgeEdge extends LaidEdge {
  fromDay: number;
  toDay: number;
}

export interface OverviewLayout {
  regions: string[];
  regionTops: Map<string, number>;
  regionHeights: Map<string, number>;
  cells: Map<string, OverviewCell>;
  columnWidths: number[];
  columnOffsets: number[];
  matrixWidth: number;
  matrixHeight: number;
  railWidth: number;
  headerHeight: number;
  nodeWidth: number;
  bridges: BridgeEdge[];
}

type Side = 'left' | 'right' | 'top' | 'bottom';

interface Segment {
  node: TripNode;
  edgeToNext?: TripEdge;
}

interface Block {
  label: string;
  segments: Segment[];
}

export function cellKey(dayIndex: number, region: string): string {
  return `${dayIndex}:${region}`;
}

export function nodeRegion(node: TripNode, day: DayPlan): string {
  return node.region?.trim() || day.region?.trim() || '其他';
}

function formatMeters(meters: number | undefined): string {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return '';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)}km`;
  return `${Math.round(meters)}m`;
}

/** 收起时是「方式 · 分钟」。展开时有说明就用说明，避免长标签和窄缝叠在一起。 */
export function edgeCaption(edge: TripEdge, spread = false): string {
  const mode = edgeModeWord(edge);
  const mins = edge.duration_minutes;
  const hasDuration = mins != null && mins > 0;
  if (!spread) {
    const parts = [mode];
    if (mins) parts.push(`${mins} 分钟`);
    return parts.join(' · ');
  }
  const dist = formatMeters(edge.distance_meters);
  const label = edge.label?.trim() ?? '';
  if (dist && hasDuration) return `${mode} · ${dist} · ${mins} 分钟`;
  if (label) return label;
  if (hasDuration) return `${mode} · ${mins} 分钟`;
  return '通勤';
}

function chipWidth(text: string): number {
  let width = 16;
  for (const ch of text) width += ch.charCodeAt(0) > 127 ? 9.5 : 5.5;
  return Math.max(52, Math.ceil(width));
}

const SPREAD_LABEL_PAD = 40;
const SPREAD_WAVE_Y = [0, 34, 16, 52, 8, 40, 22, 46];
const FUEL_SPREAD_ROWS = 3;
const FUEL_GRID_GAP_X = 16;
const FUEL_GRID_GAP_Y = 12;

function spreadWaveY(index: number): number {
  return SPREAD_WAVE_Y[index % SPREAD_WAVE_Y.length];
}

function spreadHGap(edge: TripEdge | undefined): number {
  if (!edge) return SPREAD_LABEL_PAD + 16;
  return chipWidth(edgeCaption(edge, true)) + SPREAD_LABEL_PAD;
}

function fuelRowCounts(count: number, rows: number): number[] {
  const base = Math.floor(count / rows);
  const extra = count % rows;
  return Array.from({ length: rows }, (_, index) => base + (index < extra ? 1 : 0));
}

export function seedColumnRange(focusIndex: number, dayCount: number): { start: number; end: number } {
  if (dayCount <= 0) return { start: 0, end: 0 };
  const start = Math.max(0, Math.min(focusIndex, dayCount - 1) - COLUMN_BUFFER);
  const end = Math.min(dayCount, start + 3 + COLUMN_BUFFER);
  return { start, end: Math.max(end, start + 1) };
}

/** 视口里的列，左右各多留一列。end 不含。 */
export function visibleColumnRange(
  scrollLeft: number,
  viewWidth: number,
  offsets: number[],
  widths: number[],
  dayCount: number,
): { start: number; end: number } {
  if (dayCount === 0 || offsets.length === 0 || viewWidth <= 0) {
    return seedColumnRange(0, dayCount);
  }
  let startCol = 0;
  for (let i = offsets.length - 1; i >= 0; i -= 1) {
    if (scrollLeft >= offsets[i] - 1) {
      startCol = i;
      break;
    }
  }
  startCol = Math.max(0, startCol - COLUMN_BUFFER);
  const endScroll = scrollLeft + viewWidth;
  let endCol = dayCount;
  for (let i = startCol; i < dayCount; i += 1) {
    const colEnd = offsets[i] + (widths[i] ?? 0);
    if (offsets[i] > endScroll) {
      endCol = i;
      break;
    }
    if (colEnd >= endScroll) {
      endCol = Math.min(dayCount, i + 1 + COLUMN_BUFFER);
      break;
    }
  }
  endCol = Math.min(dayCount, Math.max(endCol, startCol + 1));
  return { start: startCol, end: endCol };
}

export function bridgeTouches(edge: BridgeEdge, start: number, end: number): boolean {
  const fromIn = edge.fromDay >= start && edge.fromDay < end;
  const toIn = edge.toDay >= start && edge.toDay < end;
  return fromIn || toIn;
}

function nameLines(text: string, innerWidth: number, fontSize: number): number {
  const latin = fontSize * 0.55;
  let width = 0;
  let lines = 1;
  for (const ch of text.trim() || ' ') {
    const w = ch.charCodeAt(0) > 127 ? fontSize : latin;
    if (width + w > innerWidth && width > 0) {
      lines += 1;
      width = w;
    } else {
      width += w;
    }
  }
  return lines;
}

function cardHeight(node: TripNode): number {
  const inner = NODE_WIDTH - 16;
  let height = 6 + 16 + 4 + nameLines(node.name, inner, 12) * 17;
  if (node.start_time) height += 15;
  if (node.cost_label) height += 2 + nameLines(node.cost_label, inner, 9) * 13;
  return Math.max(NODE_HEIGHT, Math.ceil(height) + 8);
}

function sortByPrimary(nodes: TripNode[], edges: TripEdge[]): TripNode[] {
  if (nodes.length <= 1) return nodes;
  const ids = new Set(nodes.map((node) => node.id));
  const primary = edges.filter((edge) => edge.type === 'primary' && ids.has(edge.from) && ids.has(edge.to));
  const indegree = new Map<string, number>();
  const next = new Map<string, string[]>();
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    indegree.set(node.id, 0);
    next.set(node.id, []);
  }
  for (const edge of primary) {
    next.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0);
  const sorted: TripNode[] = [];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || sorted.some((item) => item.id === node.id)) continue;
    sorted.push(node);
    for (const id of next.get(node.id) ?? []) {
      const degree = (indegree.get(id) ?? 1) - 1;
      indegree.set(id, degree);
      if (degree === 0 && byId.has(id)) queue.push(byId.get(id)!);
    }
  }
  for (const node of nodes) {
    if (!sorted.some((item) => item.id === node.id)) sorted.push(node);
  }
  return sorted;
}

function isReferencePin(node: TripNode): boolean {
  const group = node.scene_group ?? '';
  return group.startsWith('加油站') || group.startsWith('住宿参考');
}

function orderedRegionNodes(day: DayPlan, regionNodes: TripNode[]): TripNode[] {
  const ids = new Set(regionNodes.map((node) => node.id));
  const aside = regionNodes.filter(isReferencePin);
  const route = regionNodes.filter((node) => !isReferencePin(node));
  const ordered = sortByPrimary(route.length ? route : regionNodes, day.edges).filter((node) => ids.has(node.id));
  if (!aside.length || !route.length) return ordered;
  return [...ordered, ...aside];
}

function findEdge(day: DayPlan, from: string, to: string): TripEdge | undefined {
  return (
    day.edges.find((edge) => edge.from === from && edge.to === to && edge.type === 'primary') ??
    day.edges.find((edge) => edge.from === from && edge.to === to)
  );
}

function segmentsOf(day: DayPlan, nodes: TripNode[]): Segment[] {
  const ordered = orderedRegionNodes(day, nodes);
  return ordered.map((node, index) => {
    const next = ordered[index + 1];
    return { node, edgeToNext: next ? findEdge(day, node.id, next.id) : undefined };
  });
}

function groupSegments(segments: Segment[]): Block[] {
  const blocks: Block[] = [];
  let label = '';
  let bucket: Segment[] = [];
  const flush = () => {
    if (bucket.length === 0) return;
    blocks.push({
      label: label && bucket.length >= 2 ? label : '',
      segments: bucket,
    });
    bucket = [];
    label = '';
  };
  for (const segment of segments) {
    const nextLabel = segment.node.scene_group?.trim() ?? '';
    if (nextLabel) {
      if (label === nextLabel) bucket.push(segment);
      else {
        flush();
        label = nextLabel;
        bucket = [segment];
      }
    } else {
      flush();
      blocks.push({ label: '', segments: [segment] });
    }
  }
  flush();
  return blocks;
}

function forkSpurs(day: DayPlan, nodes: TripNode[]): Map<string, string> {
  const ids = new Set(nodes.map((node) => node.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const primary = day.edges.filter((edge) => edge.type === 'primary' && ids.has(edge.from) && ids.has(edge.to));
  const outs = new Map<string, TripEdge[]>();
  const outCount = new Map<string, number>();
  for (const edge of primary) {
    const list = outs.get(edge.from) ?? [];
    list.push(edge);
    outs.set(edge.from, list);
    outCount.set(edge.from, (outCount.get(edge.from) ?? 0) + 1);
  }
  const spurs = new Map<string, string>();
  for (const [from, edges] of outs) {
    if (edges.length < 2) continue;
    const side = edges.filter((edge) => {
      const node = byId.get(edge.to);
      return Boolean(node?.is_optional) && (outCount.get(edge.to) ?? 0) === 0;
    });
    if (side.length === 0 || side.length === edges.length) continue;
    for (const edge of side) spurs.set(edge.to, from);
  }
  return spurs;
}

function connect(from: Box, to: Box): Pick<LaidEdge, 'x1' | 'y1' | 'x2' | 'y2' | 'sourceSide' | 'targetSide'> {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { x1: from.x + from.width, y1: fromCy, x2: to.x, y2: toCy, sourceSide: 'right', targetSide: 'left' };
    }
    return { x1: from.x, y1: fromCy, x2: to.x + to.width, y2: toCy, sourceSide: 'left', targetSide: 'right' };
  }
  if (dy >= 0) {
    return { x1: fromCx, y1: from.y + from.height, x2: toCx, y2: to.y, sourceSide: 'bottom', targetSide: 'top' };
  }
  return { x1: fromCx, y1: from.y, x2: toCx, y2: to.y + to.height, sourceSide: 'top', targetSide: 'bottom' };
}

function longNote(nodes: TripNode[]): string | null {
  const text = nodes.flatMap((node) => node.tips ?? []).filter(Boolean).join(' ');
  return text.length > 40 ? text : null;
}

function layoutCell(day: DayPlan, nodes: TripNode[], spread = false): CellLayout {
  if (nodes.length === 0) {
    return {
      placements: new Map(),
      edges: [],
      groups: [],
      width: MIN_COLUMN_WIDTH,
      height: EMPTY_ROW,
      note: null,
    };
  }

  const spurs = forkSpurs(day, nodes);
  const spine = nodes.filter((node) => !spurs.has(node.id));
  const blocks = groupSegments(segmentsOf(day, spine));
  const placements = new Map<string, Box>();
  let cursorX = CELL_PAD;
  let routeIndex = 0;

  for (const block of blocks) {
    const padLeft = block.label ? GROUP_PAD_X : 0;
    const padTop = block.label ? GROUP_PAD_TOP : CELL_PAD;
    if (block.label.startsWith('加油站')) {
      const originX = cursorX + padLeft;
      if (spread && block.segments.length > 1) {
        const rowCount = Math.min(FUEL_SPREAD_ROWS, block.segments.length);
        const counts = fuelRowCounts(block.segments.length, rowCount);
        const rowHeights = counts.map(() => 0);
        let index = 0;
        for (let row = 0; row < counts.length; row += 1) {
          for (let col = 0; col < counts[row]; col += 1) {
            rowHeights[row] = Math.max(rowHeights[row], cardHeight(block.segments[index].node));
            index += 1;
          }
        }
        const rowTops: number[] = [];
        let yCursor = padTop;
        for (let row = 0; row < rowCount; row += 1) {
          rowTops.push(yCursor);
          yCursor += rowHeights[row] + FUEL_GRID_GAP_Y;
        }
        index = 0;
        let maxRight = originX;
        for (let row = 0; row < counts.length; row += 1) {
          for (let col = 0; col < counts[row]; col += 1) {
            const segment = block.segments[index];
            const off = nudge(segment.node);
            const x = originX + col * (NODE_WIDTH + FUEL_GRID_GAP_X) + off.x;
            placements.set(segment.node.id, {
              x,
              y: rowTops[row] + off.y,
              width: NODE_WIDTH,
              height: cardHeight(segment.node),
            });
            maxRight = Math.max(maxRight, x + NODE_WIDTH);
            index += 1;
          }
        }
        const widest = Math.max(...counts);
        const gridRight = originX + (widest - 1) * (NODE_WIDTH + FUEL_GRID_GAP_X) + NODE_WIDTH;
        cursorX = Math.max(gridRight, maxRight) + GROUP_TAIL + 4;
        continue;
      }
      let y = padTop;
      for (const segment of block.segments) {
        const height = cardHeight(segment.node);
        const off = nudge(segment.node);
        const box = {
          x: originX + off.x,
          y: y + off.y,
          width: NODE_WIDTH,
          height,
        };
        placements.set(segment.node.id, box);
        y = box.y + height + 8;
      }
      cursorX = originX + NODE_WIDTH + GROUP_TAIL + 4;
      continue;
    }
    let bx = cursorX + padLeft;
    for (let i = 0; i < block.segments.length; i += 1) {
      const segment = block.segments[i];
      const height = cardHeight(segment.node);
      const off = nudge(segment.node);
      const gap = spread ? spreadHGap(i > 0 ? block.segments[i - 1].edgeToNext : undefined) : NODE_GAP;
      const wave = spread ? spreadWaveY(routeIndex) : 0;
      routeIndex += 1;
      let x = bx + off.x;
      if (i > 0) {
        const prev = placements.get(block.segments[i - 1].node.id);
        if (prev) x = Math.max(x, prev.x + prev.width + gap);
      }
      placements.set(segment.node.id, {
        x,
        y: padTop + wave + off.y,
        width: NODE_WIDTH,
        height,
      });
      const hasNext = i < block.segments.length - 1;
      const nextGap = spread ? spreadHGap(segment.edgeToNext) : NODE_GAP;
      bx = x + NODE_WIDTH + (hasNext ? nextGap : 0);
    }
    const exitEdge = block.segments[block.segments.length - 1]?.edgeToNext;
    const between = spread && exitEdge ? spreadHGap(exitEdge) : 4;
    cursorX = bx + (block.label ? GROUP_TAIL : 0) + between;
  }

  const spursByParent = new Map<string, string[]>();
  for (const [spurId, parentId] of spurs) {
    const list = spursByParent.get(parentId) ?? [];
    list.push(spurId);
    spursByParent.set(parentId, list);
  }
  for (const [parentId, spurIds] of spursByParent) {
    const parent = placements.get(parentId);
    if (!parent) continue;
    let y = parent.y + parent.height + FORK_LANE;
    for (const spurId of spurIds) {
      const spur = nodes.find((node) => node.id === spurId);
      if (!spur) continue;
      const height = cardHeight(spur);
      const off = nudge(spur);
      const box = {
        x: parent.x + off.x,
        y: y + off.y,
        width: NODE_WIDTH,
        height,
      };
      placements.set(spurId, box);
      y = box.y + height + FORK_LANE;
    }
  }

  const ids = new Set(nodes.map((node) => node.id));
  const edges: LaidEdge[] = [];
  const primaryPairs = new Set<string>();
  for (const edge of day.edges) {
    if (edge.type !== 'primary' || !ids.has(edge.from) || !ids.has(edge.to)) continue;
    const from = placements.get(edge.from);
    const to = placements.get(edge.to);
    if (!from || !to) continue;
    primaryPairs.add(`${edge.from}->${edge.to}`);
    edges.push({ edge, ...connect(from, to), alt: false });
  }
  for (const edge of day.edges) {
    if (edge.type !== 'alternative' || !ids.has(edge.from) || !ids.has(edge.to)) continue;
    if (primaryPairs.has(`${edge.from}->${edge.to}`)) continue;
    const from = placements.get(edge.from);
    const to = placements.get(edge.to);
    if (!from || !to) continue;
    edges.push({ edge, ...connect(from, to), alt: true });
  }

  const groups: SceneFrame[] = [];
  for (const block of blocks) {
    if (!block.label) continue;
    const boxes = block.segments
      .map((segment) => placements.get(segment.node.id))
      .filter((box): box is Box => Boolean(box));
    if (boxes.length === 0) continue;
    const left = Math.min(...boxes.map((box) => box.x)) - GROUP_PAD_X;
    const top = Math.min(...boxes.map((box) => box.y)) - GROUP_PAD_TOP;
    const right = Math.max(...boxes.map((box) => box.x + box.width)) + 6;
    const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + 6;
    groups.push({ label: block.label, left, top, width: right - left, height: bottom - top });
  }

  let maxX = MIN_COLUMN_WIDTH - CELL_PAD;
  let maxY = EMPTY_ROW - CELL_PAD;
  placements.forEach((box) => {
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });
  const note = longNote(nodes);
  if (note) maxY += NOTE_HEIGHT;

  return {
    placements,
    edges,
    groups,
    width: Math.max(MIN_COLUMN_WIDTH, maxX + CELL_PAD),
    height: Math.max(EMPTY_ROW, maxY + CELL_PAD),
    note,
  };
}

/** 节点换区后、清掉微调时，会落在目标格的哪个位置。 */
export function predictNodePlacement(
  day: DayPlan,
  targetRegion: string,
  nodeId: string,
  spread = false,
): Box | null {
  const node = day.nodes.find((item) => item.id === nodeId);
  if (!node) return null;
  const hypothetical: TripNode = { ...node, region: targetRegion, overview_offset: undefined };
  const others = day.nodes.filter((item) => item.id !== nodeId && nodeRegion(item, day) === targetRegion);
  const ordered = orderedRegionNodes(day, [...others, hypothetical]);
  return layoutCell(day, ordered, spread).placements.get(nodeId) ?? null;
}

function nudge(node: TripNode): { x: number; y: number } {
  return { x: node.overview_offset?.x ?? 0, y: node.overview_offset?.y ?? 0 };
}

function regionsInOrder(days: DayPlan[], extraRegions: string[] = []): string[] {
  const seen = new Set<string>();
  const regions: string[] = [];
  const add = (raw: string | undefined) => {
    const name = raw?.trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    regions.push(name);
  };
  days.forEach((day) => add(day.region));
  days.forEach((day) => day.nodes.forEach((node) => add(nodeRegion(node, day))));
  extraRegions.forEach((name) => add(name));
  if (regions.length === 0) regions.push('其他');
  return regions;
}

export function layoutOverview(
  days: DayPlan[],
  crossEdges: TripEdge[] = [],
  options?: { columnMins?: number[]; extraRegions?: string[]; spread?: boolean },
): OverviewLayout {
  const regions = regionsInOrder(days, options?.extraRegions ?? []);
  const regionHeights = new Map<string, number>();
  const cells = new Map<string, OverviewCell>();
  const columnWidths = new Array<number>(days.length).fill(MIN_COLUMN_WIDTH);

  for (const region of regions) {
    let maxH = EMPTY_ROW;
    days.forEach((day, dayIndex) => {
      const nodes = orderedRegionNodes(
        day,
        day.nodes.filter((node) => nodeRegion(node, day) === region),
      );
      const layout = layoutCell(day, nodes, Boolean(options?.spread));
      cells.set(cellKey(dayIndex, region), { dayIndex, region, nodes, layout });
      maxH = Math.max(maxH, layout.height);
      columnWidths[dayIndex] = Math.max(columnWidths[dayIndex], layout.width);
    });
    regionHeights.set(region, maxH);
  }

  for (let i = 0; i < days.length; i += 1) {
    const userMin = options?.columnMins?.[i] ?? 0;
    if (userMin > 0) columnWidths[i] = Math.max(columnWidths[i], userMin);
  }

  const columnOffsets: number[] = [];
  let offset = 0;
  for (let i = 0; i < days.length; i += 1) {
    columnOffsets.push(offset);
    offset += columnWidths[i];
  }

  const regionTops = new Map<string, number>();
  let regionTop = 0;
  for (const region of regions) {
    regionTops.set(region, regionTop);
    regionTop += regionHeights.get(region) ?? EMPTY_ROW;
  }

  const matrixBoxes = new Map<string, Box & { dayIndex: number }>();
  for (const cell of cells.values()) {
    const left = columnOffsets[cell.dayIndex] ?? 0;
    const top = regionTops.get(cell.region) ?? 0;
    cell.layout.placements.forEach((box, id) => {
      matrixBoxes.set(id, { ...box, x: left + box.x, y: top + box.y, dayIndex: cell.dayIndex });
    });
  }

  const bridges: BridgeEdge[] = [];
  const seenBridges = new Set<string>();
  const pushBridge = (edge: TripEdge) => {
    if (seenBridges.has(edge.id)) return;
    const from = matrixBoxes.get(edge.from);
    const to = matrixBoxes.get(edge.to);
    if (!from || !to) return;
    if (from.dayIndex === to.dayIndex) {
      const day = days[from.dayIndex];
      const fromNode = day?.nodes.find((node) => node.id === edge.from);
      const toNode = day?.nodes.find((node) => node.id === edge.to);
      if (!day || !fromNode || !toNode) return;
      if (nodeRegion(fromNode, day) === nodeRegion(toNode, day)) return;
    }
    seenBridges.add(edge.id);
    bridges.push({
      edge,
      ...connect(from, to),
      alt: edge.type === 'alternative',
      fromDay: from.dayIndex,
      toDay: to.dayIndex,
    });
  };

  days.forEach((day) => day.edges.forEach(pushBridge));
  crossEdges.forEach(pushBridge);

  return {
    regions,
    regionTops,
    regionHeights,
    cells,
    columnWidths,
    columnOffsets,
    matrixWidth: offset,
    matrixHeight: regionTop,
    railWidth: RAIL_WIDTH,
    headerHeight: HEADER_HEIGHT,
    nodeWidth: NODE_WIDTH,
    bridges,
  };
}

export function bezierOf(edge: Pick<LaidEdge, 'x1' | 'y1' | 'x2' | 'y2' | 'sourceSide' | 'targetSide'>): {
  d: string;
  lx: number;
  ly: number;
} {
  const pull = Math.max(24, Math.hypot(edge.x2 - edge.x1, edge.y2 - edge.y1) * 0.35);
  const control = (x: number, y: number, side: Side) => {
    if (side === 'right') return [x + pull, y];
    if (side === 'left') return [x - pull, y];
    if (side === 'bottom') return [x, y + pull];
    return [x, y - pull];
  };
  const [c1x, c1y] = control(edge.x1, edge.y1, edge.sourceSide);
  const [c2x, c2y] = control(edge.x2, edge.y2, edge.targetSide);
  return {
    d: `M ${edge.x1} ${edge.y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${edge.x2} ${edge.y2}`,
    lx: 0.125 * edge.x1 + 0.375 * c1x + 0.375 * c2x + 0.125 * edge.x2,
    ly: 0.125 * edge.y1 + 0.375 * c1y + 0.375 * c2y + 0.125 * edge.y2,
  };
}
