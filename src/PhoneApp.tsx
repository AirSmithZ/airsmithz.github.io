import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { actions, useTrip } from './store';
import { DayStrip } from './components/DayStrip';
import { DigestBoard } from './components/DigestBoard';
import { ExpenseBoard } from './components/ExpenseBoard';
import { FlowBoard } from './components/FlowBoard';
import { NodePanel } from './components/NodePanel';
import { PrepBoard } from './components/PrepBoard';
import { GuideBoard } from './components/GuideBoard';
import { isGuideId, GUIDES, type GuideId } from './guides';
import { isPrepKind, PREP_META, type PrepKind } from './prep';
import { readViewportBox } from './compat';
import type { PanelId, Scope, TripEdge } from './types';

const TripMap = lazy(() => import('./components/TripMap').then((mod) => ({ default: mod.TripMap })));

const NO_EDGES: TripEdge[] = [];

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
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  /** 竖屏长内容：铺满遮罩并在卡片内滚动，不压住页头。 */
  sheet?: boolean;
  children: ReactNode;
}) {
  const [sheetTop, setSheetTop] = useState(12);
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
  const [side, setSide] = useState<null | 'digest' | PrepKind | GuideId>(null);
  const headerRef = useRef<HTMLElement>(null);

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
  const short = box.h < 460;
  const day = doc.itinerary.days[ui.dayIndex];
  const first = doc.itinerary.days[0];
  const last = doc.itinerary.days[doc.itinerary.days.length - 1];
  const crossEdges = doc.itinerary.cross_day_edges ?? NO_EDGES;
  const showRail = land && (side !== null || ui.panel !== 'cost' || Boolean(ui.editor));
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
          <small>
            {first ? `${first.date.slice(5)} – ${last.date.slice(5)}` : '没有日期'}
            {doc.origin === 'local' ? ' · 本机已改' : ' · 初始数据'}
          </small>
        </div>
        <div className="seg" role="tablist" aria-label="视图">
          {(
            [
              ['graph', '流程'],
              ['map', '地图'],
              ['cost', '开销'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={ui.panel === id}
              className={ui.panel === id ? 'is-on' : ''}
              data-testid={`panel-${id}`}
              onClick={() => choosePanel(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="scope" role="tablist" aria-label="范围">
          <button
            type="button"
            role="tab"
            aria-selected={ui.scope === 'day'}
            className={ui.scope === 'day' ? 'is-on' : ''}
            data-testid="scope-day"
            onClick={() => chooseScope('day')}
          >
            当天
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={ui.scope === 'all'}
            className={ui.scope === 'all' ? 'is-on' : ''}
            data-testid="scope-all"
            onClick={() => chooseScope('all')}
          >
            总行程
          </button>
        </div>
        </div>
        <div className="menu-wrap">
          <button
            type="button"
            className="icon-btn"
            aria-expanded={menu}
            onClick={() => setMenu((open) => !open)}
          >
            更多
          </button>
          {menu && (
            <div className="menu" role="menu">
              <p className="menu-note">
                {doc.origin === 'seed'
                  ? '还没改过。这台手机没有存档时，用初始信息。'
                  : `存在这台手机里。上次写入 ${doc.savedAt ? doc.savedAt.slice(0, 16).replace('T', ' ') : '刚刚'}。`}
              </p>
              <button
                type="button"
                data-testid="open-digest"
                onClick={() => {
                  setMenu(false);
                  actions.closeDetail();
                  setDesk(false);
                  setSide('digest');
                  if (land) setRailOpen(true);
                }}
              >
                <b>汇总信息</b>
                <small>21 天，每段住哪、亮点写了什么</small>
              </button>
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
              {side === 'digest' ? (
                <DigestBoard mode="land" onClose={() => setSide(null)} />
              ) : isGuideId(side) ? (
                <GuideBoard id={side} mode="land" onClose={() => setSide(null)} />
              ) : isPrepKind(side) ? (
                <PrepBoard kind={side} mode="land" onClose={() => setSide(null)} />
              ) : (
                nodePanel
              )}
            </div>
          </aside>
        ) : null}

        <main className="stage">
          {ui.scope === 'day' ? (
            <div className="strip-row">
              <DayStrip
                days={doc.itinerary.days}
                dayIndex={ui.dayIndex}
                locked={Boolean(ui.editor)}
                onPick={(index) => actions.setDay(index)}
              />
            </div>
          ) : ui.panel !== 'cost' ? (
            <div className="strip-row">
              <p className="strip-note">
                总行程 {doc.itinerary.days.length} 天。点列头只是换到那天看，日期本身不能改。
                {day ? ` 当前 D${day.day_index} ${day.region ?? ''}。` : ''}
              </p>
            </div>
          ) : null}

          <div className="stage-view">
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
              <ExpenseBoard doc={doc} scope={ui.scope} dayIndex={ui.dayIndex} />
            </div>
          </div>
        </main>
      </div>

      {menu ? <button type="button" className="menu-dismiss" aria-label="关闭菜单" onClick={() => setMenu(false)} /> : null}

      <PhoneDialog sheet open={!land && side === 'digest'} label="行程汇总" onClose={() => setSide(null)}>
        <DigestBoard mode="port" onClose={() => setSide(null)} />
      </PhoneDialog>

      <PhoneDialog
        sheet
        open={!land && isPrepKind(side)}
        label={isPrepKind(side) ? PREP_META[side].title : '准备'}
        onClose={() => setSide(null)}
      >
        {isPrepKind(side) ? <PrepBoard kind={side} mode="port" onClose={() => setSide(null)} /> : null}
      </PhoneDialog>

      <PhoneDialog sheet open={!land && isGuideId(side)} label={isGuideId(side) ? GUIDES.find((item) => item.id === side)?.title ?? '流程' : '流程'} onClose={() => setSide(null)}>
        {isGuideId(side) ? <GuideBoard id={side} mode="port" onClose={() => setSide(null)} /> : null}
      </PhoneDialog>

      <PhoneDialog open={modalOpen} label="节点详情" onClose={hideModal}>
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
