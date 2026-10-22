/**
 * 种子数据（anzTrip.json、待办、参考、行李、要装的 App）改动后，把 DATA_VERSION 加 1。
 * 启动时若和 localStorage 的 anz-data-version 不一致，就清掉没被人手改过的内容缓存。
 * 界面偏好（侧栏宽度、总览列宽、当前天）不在这里。
 */
export const DATA_VERSION = 7;

const VERSION_KEY = 'anz-data-version';
const MANUAL_KEY = 'anz-prep-manual';

export const DOC_KEY = 'anz-mobile-doc-v1';

const PREP_KINDS = ['todo', 'note', 'pack', 'app'] as const;
export type PrepStorageKind = (typeof PREP_KINDS)[number];

export const PREP_KEYS: Record<PrepStorageKind, string> = {
  todo: 'anz-prep-todo-v2',
  note: 'anz-prep-note-v4',
  pack: 'anz-prep-pack-v3',
  app: 'anz-prep-app-v2',
};

/** 当前键还不存在时，准备列表会从这些旧键带过勾选状态。版本不一致时删掉，避免换键后又合并回来。 */
export const LEGACY_PREP_KEY: Record<PrepStorageKind, string> = {
  todo: 'anz-prep-todo-v1',
  note: 'anz-prep-note-v3',
  pack: 'anz-prep-pack-v2',
  app: 'anz-prep-app-v1',
};

type ManualFlags = Record<PrepStorageKind, boolean>;

function blankManual(): ManualFlags {
  return { todo: false, note: false, pack: false, app: false };
}

function readManual(): ManualFlags {
  const flags = blankManual();
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return flags;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return flags;
    const record = parsed as Record<string, unknown>;
    for (const kind of PREP_KINDS) flags[kind] = record[kind] === true;
    return flags;
  } catch {
    return flags;
  }
}

function writeManual(flags: ManualFlags): void {
  localStorage.setItem(MANUAL_KEY, JSON.stringify(flags));
}

function docIsManual(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return false;
    return (parsed as { origin?: unknown }).origin === 'local';
  } catch {
    return false;
  }
}

let applied = false;

/** 在任何内容缓存读、写之前调用。同一轮页面加载只处理一次。 */
export function ensureFreshSeed(): void {
  if (applied) return;
  try {
    if (localStorage.getItem(VERSION_KEY) === String(DATA_VERSION)) {
      applied = true;
      return;
    }
    const manual = readManual();
    const docRaw = localStorage.getItem(DOC_KEY);
    if (docRaw == null || !docIsManual(docRaw)) localStorage.removeItem(DOC_KEY);
    for (const kind of PREP_KINDS) {
      if (!manual[kind]) localStorage.removeItem(PREP_KEYS[kind]);
    }
    for (const kind of PREP_KINDS) localStorage.removeItem(LEGACY_PREP_KEY[kind]);
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
    applied = true;
  } catch {
    applied = false;
  }
}

export function markPrepManual(kind: PrepStorageKind): void {
  try {
    const flags = readManual();
    flags[kind] = true;
    writeManual(flags);
  } catch {
    // 标记写失败时，列表本身仍会保存。
  }
}

export function clearPrepManual(kind: PrepStorageKind): void {
  try {
    const flags = readManual();
    flags[kind] = false;
    writeManual(flags);
  } catch {
    // 重置后的列表已经写回种子；标记清不掉时，下次版本变化会把它留下。
  }
}
