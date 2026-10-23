import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { actions, useTrip } from './store';
import { formatTripSpan } from './trip';
import { DayStrip } from './components/DayStrip';
import { WeatherNotice } from './components/WeatherNotice';
import { DigestBoard } from './components/DigestBoard';
import { ExpenseBoard } from './components/ExpenseBoard';
import { FlowBoard } from './components/FlowBoard';
import { NodePanel } from './components/NodePanel';
import { PrepBoard } from './components/PrepBoard';
import { GuideBoard } from './components/GuideBoard';
import { isGuideId, GUIDES, type GuideId } from './guides';
import { isPrepKind, PREP_META, type PrepKind } from './prep';
import { readViewportBox } from './compat';
import { usePanelSwipe, usePortraitEdgeGuard } from './portraitGestures';
import type { PanelId, Scope, TripEdge } from './types';

const TripMap = lazy(() => import('./components/TripMap').then((mod) => ({ default: mod.TripMap })));

const NO_EDGES: TripEdge[] = [];

const PANELS: { id: PanelId; label: string }[] = [
  { id: 'overview', label: '概览' },
  { id: 'graph', label: '流程' },
  { id: 'map', label: '地图' },
  { id: 'cost', label: '开销' },
];

function PanelTabs({
  panel,
  onChoose,
  className,
}: {
  panel: PanelId;
  onChoose: (panel: PanelId) => void;
  className?: string;
}) {
  return (
    <div className={className ? `seg ${className}` : 'seg'} role="tablist" aria-label="视图">
      {PANELS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={panel === item.id}
          className={panel === item.id ? 'is-on' : ''}
          data-testid={`panel-${item.id}`}
          onClick={() => onChoose(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ScopeMark({ kind }: { kind: 'day' | 'all' }) {
  if (kind === 'day') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="4.5" width="13" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5.5 9.2h13" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.2" width="14" height="3.4" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="10.3" width="14" height="3.4" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="5" y="16.4" width="14" height="3.4" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ScopeTabs({
  scope,
  onChoose,
  rail = false,
}: {
  scope: Scope;
  onChoose: (scope: Scope) => void;
  rail?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState(false);

  useEffect(() => {
    if (!rail) return;
    const node = railRef.current;
    const root = node?.closest('.stage-view');
    if (!node || !root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer = 0;
    let dimmed = false;
    let tracking = false;
    let lastY = 0;
    const tops = new WeakMap<EventTarget, number>();

    const arm = () => {
      if (!dimmed) {
        dimmed = true;
        setDim(true);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        dimmed = false;
        setDim(false);
      }, 220);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !root.contains(target) || node.contains(target)) return;
      const top = target.scrollTop;
      const prev = tops.get(target);
      tops.set(target, top);
      if (prev === undefined || prev === top) return;
      arm();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.contains(event.target) || node.contains(event.target)) return;
      tracking = true;
      lastY = event.clientY;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!tracking) return;
      if (Math.abs(event.clientY - lastY) < 10) return;
      lastY = event.clientY;
      arm();
    };
    const onPointerUp = () => {
      tracking = false;
    };

    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
    };
  }, [rail]);

  return (
    <div
      ref={rail ? railRef : undefined}
      className={rail ? `scope scope--rail${dim ? ' is-dim' : ''}` : 'scope'}
      role="tablist"
      aria-label="范围"
    >
      <button
        type="button"
        role="tab"
        aria-selected={scope === 'day'}
        aria-label={rail ? '当天' : undefined}
        className={scope === 'day' ? 'is-on' : ''}
        data-testid="scope-day"
        onClick={() => onChoose('day')}
      >
        {rail ? <ScopeMark kind="day" /> : '当天'}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={scope === 'all'}
        aria-label={rail ? '总行程' : undefined}
        className={scope === 'all' ? 'is-on' : ''}
        data-testid="scope-all"
        onClick={() => onChoose('all')}
      >
        {rail ? <ScopeMark kind="all" /> : '总行程'}
      </button>
    </div>
  );
}

interface DeviceBox {
  w: number;
  h: number;
  offsetTop: number;
  landscape: boolean;
}

function readBox(): DeviceBox {
  const viewport = window.visualViewport;
  const box = readViewportBox();
  return {
    w: Math.round(viewport?.width ?? window.innerWidth),
    h: box.height,
    offsetTop: box.offsetTop,
    landscape: window.matchMedia('(orientation: landscape)').matches,
  };
}

function useDeviceBox(): DeviceBox {
  const [box, setBox] = useState(readBox);
  useEffect(() => {
    const media = window.matchMedia('(orientation: landscape)');
    const apply = () => setBox(readBox());
    apply();
    media.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', apply);
    viewport?.addEventListener('scroll', apply);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      viewport?.removeEventListener('resize', apply);
      viewport?.removeEventListener('scroll', apply);
    };
  }, []);
  return box;
}

function PhoneDialog({
  open,
  label,
  onClose,
  sheet = false,
  swipeClose = false,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  /** 竖屏长内容：铺满遮罩并在卡片内滚动，不压住页头。 */
  sheet?: boolean;
  /** 向右滑关闭。竖滑仍走面板里原来的滚动。 */
  swipeClose?: boolean;
  children: ReactNode;
}) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [sheetTop, setSheetTop] = useState(12);
  usePanelSwipe(layerRef, open && swipeClose, onClose);
  useEffect(() => {
    if (!open || !sheet) return;
    const measure = () => {
      const header = document.querySelector('.shell > .header');
      const shell = header?.closest('.shell');
      if (!header || !shell) return;
      const gap = header.getBoundingClientRect().bottom - shell.getBoundingClientRect().top + 8;
      setSheetTop(Math.max(12, Math.round(gap)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, sheet]);
  if (!open) return null;
  return (
    <div
      ref={layerRef}
      className={`phone-layer${sheet ? ' phone-layer--sheet' : ''}`}
      style={sheet ? { paddingTop: sheetTop } : undefined}
      role="presentation"
      onClick={onClose}
    >
      <div
        className="phone-layer__panel"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function PhoneApp() {
  const { doc, ui, storageOk } = useTrip();
  const box = useDeviceBox();
  const [menu, setMenu] = useState(false);
  const [askReset, setAskReset] = useState(false);
  const [desk, setDesk] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [side, setSide] = useState<null | PrepKind | GuideId>(null);
  const headerRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const row = stripRef.current;
    if (!stage || !row || ui.scope !== 'day' || ui.panel === 'overview') return;
    const chip = row.querySelector<HTMLElement>('.day-chip');
    if (!chip) return;
    const apply = () => {
      const styles = getComputedStyle(row);
      const pad = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const next = Math.ceil(chip.getBoundingClientRect().height + pad);
      if (next > 0) stage.style.setProperty('--strip-h', `${next}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(chip);
    return () => observer.disconnect();
  }, [ui.scope, ui.panel, ui.dayIndex]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const apply = () => {
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--header-h');
    };
  }, []);

  const wantLand = ui.layoutLock === 'landscape' || (ui.layoutLock === 'auto' && box.landscape);
  const landBlocked = wantLand && box.w < 680;
  const land = wantLand && !landBlocked;
  usePortraitEdgeGuard(!land);
  const short = box.h < 460;
  const day = doc.itinerary.days[ui.dayIndex];
  const crossEdges = doc.itinerary.cross_day_edges ?? NO_EDGES;
  const showRail = land && (side !== null || (ui.panel !== 'cost' && ui.panel !== 'overview') || Boolean(ui.editor));
  const modalOpen = !land && side === null && (desk || Boolean(ui.selectedId) || Boolean(ui.editor));

  const mapDays = useMemo(() => {
    if (ui.scope === 'all') return doc.itinerary.days;
    const one = doc.itinerary.days[ui.dayIndex];
    return one ? [one] : [];
  }, [doc, ui.scope, ui.dayIndex]);

  useEffect(() => {
    if (land && ui.editor) setRailOpen(true);
  }, [land, ui.editor]);

  function choosePanel(panel: PanelId) {
    setMenu(false);
    actions.setPanel(panel);
  }

  function chooseScope(scope: Scope) {
    setMenu(false);
    actions.setScope(scope);
  }

  function hideModal() {
    setDesk(false);
    actions.closeDetail();
  }

  const showScope = ui.panel !== 'overview';

  const nodePanel = (
    <NodePanel
      doc={doc}
      editor={ui.editor}
      selectedId={ui.selectedId}
      dayIndex={ui.dayIndex}
      variant={land ? 'side' : 'modal'}
      onClose={hideModal}
    />
  );

  return (
    <div
      className={`shell${land ? ' is-land' : ' is-port'}${short ? ' is-short' : ''}`}
    >
      <header className="header" ref={headerRef}>
        <div className="header-scroll">
          <div className="brand">
            <p className="eyebrow">ANZ</p>
            <h1>澳新行程</h1>
            <small>{formatTripSpan(doc.itinerary.days)}</small>
          </div>
          {land ? <PanelTabs panel={ui.panel} onChoose={choosePanel} /> : null}
          {land && showScope ? <ScopeTabs scope={ui.scope} onChoose={chooseScope} /> : null}
        </div>
        <div className="header-tools">
          <WeatherNotice variant="phone" />
          <div className="header-end">
            <div className="menu-wrap">
              <button
                type="button"
                className={`icon-btn${menu ? ' is-on' : ''}`}
                aria-label="更多"
                aria-expanded={menu}
                onClick={() => setMenu((open) => !open)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="18.5" r="1.5" fill="currentColor" />
                </svg>
              </button>
              {menu && (
                <div className="menu" role="menu">
                  <button
                type="button"
                data-testid="open-todo"
                onClick={() => {
                  setMenu(false);
                  actions.closeDetail();
                  setDesk(false);
                  setSide('todo');
                  if (land) setRailOpen(true);
                }}
              >
                <b>待办事项</b>
                <small>护照、签证、订票、取车，可勾选</small>
              </button>
              {GUIDES.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  data-testid={`open-guide-${guide.id}`}
                  onClick={() => {
                    setMenu(false);
                    actions.closeDetail();
                    setDesk(false);
                    setSide(guide.id);
                    if (land) setRailOpen(true);
                  }}
                >
                  <b>{guide.title}</b>
                  <small>{guide.menuNote}</small>
                </button>
              ))}
              <button
                type="button"
                data-testid="open-notes"
                onClick={() => {
                  setMenu(false);
                  actions.closeDetail();
                  setDesk(false);
                  setSide('note');
                  if (land) setRailOpen(true);
                }}
              >
                <b>参考信息</b>
                <small>断点、路上、电话和天气</small>
              </button>
              <button
                type="button"
                data-testid="open-pack"
                onClick={() => {
                  setMenu(false);
                  actions.closeDetail();
                  setDesk(false);
                  setSide('pack');
                  if (land) setRailOpen(true);
                }}
              >
                <b>携带物品</b>
                <small>要带的，以及不要塞进行李的</small>
              </button>
              <button
                type="button"
                data-testid="open-apps"
                onClick={() => {
                  setMenu(false);
                  actions.closeDetail();
                  setDesk(false);
                  setSide('app');
                  if (land) setRailOpen(true);
                }}
              >
                <b>要装的 App</b>
                <small>地图、翻译、公交、叫车和餐厅</small>
              </button>
              <button
                type="button"
                className="danger-item"
                onClick={() => {
                  setMenu(false);
                  setAskReset(true);
                }}
              >
                恢复初始行程
              </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {land ? null : <PanelTabs className="view-bar" panel={ui.panel} onChoose={choosePanel} />}
      </header>

      {landBlocked ? <p className="hint-line">屏幕太窄，横版左栏放不下，先用竖版弹框。</p> : null}
      {!storageOk ? <p className="hint-line">这台浏览器没能写入本地存储，刷新后修改会丢。</p> : null}

      <div className="workspace">
        {showRail ? (
          <aside className={`rail${railOpen ? '' : ' is-shut'}`} aria-label="站点详情">
            <button
              type="button"
              className="rail-toggle"
              aria-expanded={railOpen}
              data-testid="rail-toggle"
              onClick={() => setRailOpen((open) => !open)}
            >
              {railOpen ? '收起' : '详情'}
            </button>
            <div className="rail-scroll" hidden={!railOpen}>
              {isGuideId(side) ? (
                <GuideBoard id={side} mode="land" onClose={() => setSide(null)} />
              ) : isPrepKind(side) ? (
                <PrepBoard kind={side} mode="land" onClose={() => setSide(null)} />
              ) : (
                nodePanel
              )}
            </div>
          </aside>
        ) : null}

        <main className="stage" ref={stageRef}>
          {ui.panel === 'overview' ? null : (
            <div className="strip-row" ref={stripRef}>
              {ui.scope === 'day' ? (
                <DayStrip
                  days={doc.itinerary.days}
                  dayIndex={ui.dayIndex}
                  locked={Boolean(ui.editor)}
                  onPick={(index) => actions.setDay(index)}
                />
              ) : (
                <p className="strip-note">
                  {ui.panel === 'cost'
                    ? `总行程 ${doc.itinerary.days.length} 天。`
                    : `总行程 ${doc.itinerary.days.length} 天。点列头只是换到那天看，日期本身不能改。${day ? ` 当前 D${day.day_index} ${day.region ?? ''}。` : ''}`}
                </p>
              )}
            </div>
          )}

          <div className="stage-view">
            {land || !showScope ? null : <ScopeTabs rail scope={ui.scope} onChoose={chooseScope} />}
            <div className={`view view--front${ui.panel === 'overview' ? '' : ' is-off'}`} data-testid="view-overview">
              <DigestBoard />
            </div>
            <div className={`view view--front${ui.panel === 'graph' ? '' : ' is-off'}`} data-testid="view-graph">
              <FlowBoard
                days={doc.itinerary.days}
                scope={ui.scope}
                dayIndex={ui.dayIndex}
                crossEdges={crossEdges}
                selectedId={ui.selectedId}
                swipeDays
                swipeLocked={Boolean(ui.editor)}
                onSwipeDay={(index) => actions.setDay(index)}
                onSelect={(id) => {
                  setSide(null);
                  actions.selectNode(id);
                  if (!land) setDesk(true);
                }}
                onPickDay={(index) => actions.pickOverviewDay(index)}
              />
            </div>
            <div className={`view view--map${ui.panel === 'map' ? '' : ' is-off'}`} aria-hidden={ui.panel !== 'map'}>
              <Suspense fallback={<p className="empty-note">地图加载中…</p>}>
                <TripMap
                  active={ui.panel === 'map'}
                  days={mapDays}
                  atlas={doc.itinerary.days}
                  crossEdges={crossEdges}
                  includeCross={ui.scope === 'all'}
                  selectedId={ui.selectedId}
                  onSelect={(id) => {
                    setSide(null);
                    actions.selectNode(id);
                    if (!land) setDesk(true);
                  }}
                />
              </Suspense>
            </div>
            <div className={`view view--front${ui.panel === 'cost' ? '' : ' is-off'}`}>
              <ExpenseBoard
                doc={doc}
                scope={ui.scope}
                dayIndex={ui.dayIndex}
                swipeDays
                swipeLocked={Boolean(ui.editor)}
                onSwipeDay={(index) => actions.setDay(index)}
              />
            </div>
          </div>
        </main>
      </div>

      {menu ? <button type="button" className="menu-dismiss" aria-label="关闭菜单" onClick={() => setMenu(false)} /> : null}

      <PhoneDialog
        sheet
        swipeClose
        open={!land && isPrepKind(side)}
        label={isPrepKind(side) ? PREP_META[side].title : '准备'}
        onClose={() => setSide(null)}
      >
        {isPrepKind(side) ? <PrepBoard kind={side} mode="port" onClose={() => setSide(null)} /> : null}
      </PhoneDialog>

      <PhoneDialog sheet swipeClose open={!land && isGuideId(side)} label={isGuideId(side) ? GUIDES.find((item) => item.id === side)?.title ?? '流程' : '流程'} onClose={() => setSide(null)}>
        {isGuideId(side) ? <GuideBoard id={side} mode="port" onClose={() => setSide(null)} /> : null}
      </PhoneDialog>

      <PhoneDialog swipeClose open={modalOpen} label="节点详情" onClose={hideModal}>
        <div className="detail-modal">
          {nodePanel}
        </div>
      </PhoneDialog>

      <PhoneDialog open={askReset} label="恢复初始行程" onClose={() => setAskReset(false)}>
        <div className="modal">
          <h2>恢复初始行程</h2>
          <p>这台手机上改过的站点会丢掉，换回 anzTrip.json 里的那一版。天数仍是原来的那些天。</p>
          <div className="btn-row">
            <button
              type="button"
              className="btn btn-danger"
              data-testid="reset-seed"
              onClick={() => {
                actions.resetSeed();
                setAskReset(false);
                setDesk(false);
              }}
            >
              恢复
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAskReset(false)}>
              留下
            </button>
          </div>
        </div>
      </PhoneDialog>
    </div>
  );
}
