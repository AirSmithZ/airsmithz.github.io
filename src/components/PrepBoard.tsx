import { useState, type FormEvent, type ReactNode } from 'react';
import { Check } from './Check';
import {
  APP_GROUPS,
  NOTE_CHAPTERS,
  PACK_GROUPS,
  PREP_META,
  TODO_GROUPS,
  orderedGroups,
  prepActions,
  usePrep,
  type AppItem,
  type NoteItem,
  type PackItem,
  type PrepKind,
  type TodoItem,
} from '../prep';

export type PrepMode = 'desk' | 'land' | 'port';

interface PrepBoardProps {
  kind: PrepKind;
  /** desk：电脑左栏。land：手机横屏侧栏。port：手机竖屏弹层。 */
  mode: PrepMode;
  onClose: () => void;
}

export function PrepBoard({ kind, mode, onClose }: PrepBoardProps) {
  const data = usePrep();
  const meta = PREP_META[kind];
  const [query, setQuery] = useState('');
  const [chapter, setChapter] = useState('全部');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [askReset, setAskReset] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const needle = query.trim().toLowerCase();
  const hit = (parts: string[]) => !needle || parts.join('\n').toLowerCase().includes(needle);

  return (
    <section className={`prep prep--${mode} prep--${kind}`} aria-label={meta.title} data-testid={`prep-${kind}`}>
      <header className="prep__head">
        <div>
          <p className="eyebrow">{meta.eyebrow}</p>
          <h2>{meta.title}</h2>
          <p className="fine">{meta.blurb}</p>
        </div>
        <button type="button" className="text-btn prep__close" onClick={onClose}>
          关闭
        </button>
      </header>

      {!data.storageOk ? <p className="prep__warn">这台浏览器没能写入本地存储，刷新后这一栏的修改会丢。</p> : null}

      <div className="prep__tools">
        <label className="prep__search">
          <span className="sr-only">查找</span>
          <input
            type="search"
            value={query}
            placeholder="查找"
            data-testid="prep-search"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary prep__add" data-testid="prep-add" onClick={() => setAdding((open) => !open)}>
          {adding ? '收起' : '新增'}
        </button>
      </div>

      {kind === 'todo' ? (
        <p className="prep__count">
          <b>
            {data.todos.filter((item) => item.done).length}/{data.todos.length}
          </b>
          已勾
        </p>
      ) : null}
      {kind === 'pack' ? (
        <p className="prep__count">
          <b>
            {data.packs.filter((item) => item.group !== '不带' && item.packed).length}/
            {data.packs.filter((item) => item.group !== '不带').length}
          </b>
          已放入
        </p>
      ) : null}
      {kind === 'app' ? (
        <p className="prep__count">
          <b>
            {data.apps.filter((item) => item.group !== '不装' && item.installed).length}/
            {data.apps.filter((item) => item.group !== '不装').length}
          </b>
          已装好
        </p>
      ) : null}

      {adding ? (
        <PrepForm
          kind={kind}
          onCancel={() => setAdding(false)}
          onSave={(draft) => {
            if (draft.kind === 'todo') prepActions.addTodo(draft.group, draft.text, draft.note);
            else if (draft.kind === 'note') prepActions.addNote(draft.chapter, draft.title, draft.body, draft.strict);
            else if (draft.kind === 'pack') prepActions.addPack(draft.group, draft.text);
            else prepActions.addApp(draft.group, draft.name, draft.detail);
            setAdding(false);
          }}
        />
      ) : null}

      {kind === 'todo' ? <TodoList items={data.todos} needleHit={hit} editing={editing} onEdit={setEditing} /> : null}
      {kind === 'note' ? (
        <NoteList
          items={data.notes}
          mode={mode}
          chapter={chapter}
          onChapter={setChapter}
          needleHit={hit}
          editing={editing}
          onEdit={setEditing}
          openIds={openIds}
          onToggleOpen={(id) =>
            setOpenIds((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      ) : null}
      {kind === 'pack' ? <PackList items={data.packs} needleHit={hit} editing={editing} onEdit={setEditing} /> : null}
      {kind === 'app' ? <AppList items={data.apps} needleHit={hit} editing={editing} onEdit={setEditing} /> : null}

      <footer className="prep__foot">
        {askReset ? (
          <div className="prep__confirm" role="alertdialog" aria-label="恢复初始条目">
            <p>这一栏在这台设备上的增删改会丢掉，换回初始条目。行程图不受影响。</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (kind === 'todo') prepActions.resetTodos();
                  else if (kind === 'note') prepActions.resetNotes();
                  else if (kind === 'pack') prepActions.resetPacks();
                  else prepActions.resetApps();
                  setAskReset(false);
                  setAdding(false);
                  setEditing(null);
                  setChapter('全部');
                  setQuery('');
                }}
              >
                恢复
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAskReset(false)}>
                留下
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="text-btn prep__reset" data-testid="prep-reset" onClick={() => setAskReset(true)}>
            恢复初始条目
          </button>
        )}
      </footer>
    </section>
  );
}

function TodoList({
  items,
  needleHit,
  editing,
  onEdit,
}: {
  items: TodoItem[];
  needleHit: (parts: string[]) => boolean;
  editing: string | null;
  onEdit: (id: string | null) => void;
}) {
  const visible = items.filter((item) => needleHit([item.group, item.text, item.note]));
  const groups = orderedGroups(
    visible.map((item) => item.group),
    TODO_GROUPS,
  );
  return (
    <>
      {visible.length !== items.length ? <p className="prep__filter">筛出 {visible.length} 条</p> : null}
      {groups.map((group) => (
        <section key={group} className="prep__group">
          <h3>{group}</h3>
          <ul>
            {visible
              .filter((item) => item.group === group)
              .map((item) =>
                editing === item.id ? (
                  <li key={item.id}>
                    <PrepForm
                      kind="todo"
                      initial={item}
                      onCancel={() => onEdit(null)}
                      onSave={(draft) => {
                        if (draft.kind !== 'todo') return;
                        prepActions.updateTodo(item.id, draft);
                        onEdit(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={item.id} className={item.done ? 'prep__item is-done' : 'prep__item'}>
                    <Check className="prep__check" checked={item.done} onChange={() => prepActions.toggleTodo(item.id)}>
                      <b>{item.text}</b>
                      {item.note ? <small>{item.note}</small> : null}
                    </Check>
                    <RowActions onEdit={() => onEdit(item.id)} onRemove={() => prepActions.removeTodo(item.id)} />
                  </li>
                ),
              )}
          </ul>
        </section>
      ))}
      {visible.length === 0 ? <p className="empty-note">没有对上的待办。</p> : null}
    </>
  );
}

function NoteList({
  items,
  mode,
  chapter,
  onChapter,
  needleHit,
  editing,
  onEdit,
  openIds,
  onToggleOpen,
}: {
  items: NoteItem[];
  mode: PrepMode;
  chapter: string;
  onChapter: (chapter: string) => void;
  needleHit: (parts: string[]) => boolean;
  editing: string | null;
  onEdit: (id: string | null) => void;
  openIds: Set<string>;
  onToggleOpen: (id: string) => void;
}) {
  const chapters = orderedGroups(
    items.map((item) => item.chapter),
    NOTE_CHAPTERS,
  );
  const visible = items.filter((item) => {
    if (chapter !== '全部' && item.chapter !== chapter) return false;
    return needleHit([item.chapter, item.title, item.body]);
  });
  const gates = visible.filter((item) => item.strict);
  const rest = visible.filter((item) => !item.strict);
  return (
    <>
      <div className="prep-chips" role="tablist" aria-label="章节">
        {['全部', ...chapters].map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={chapter === name}
            className={[chapter === name ? 'is-on' : '', name.startsWith('入境') ? 'is-strict' : ''].filter(Boolean).join(' ') || undefined}
            onClick={() => onChapter(name)}
          >
            {name === '入境澳大利亚' ? '入境 · 澳' : name === '入境新西兰' ? '入境 · 新' : name}
          </button>
        ))}
      </div>
      {gates.length > 0 ? (
        <div className="prep-gates">
          <p className="prep-gates__kicker">过关时按这个做</p>
          <ul>
            {gates.map((item) => (
              <NoteCard
                key={item.id}
                item={item}
                mode={mode}
                editing={editing === item.id}
                open={openIds.has(item.id)}
                onToggleOpen={() => onToggleOpen(item.id)}
                onEdit={() => onEdit(item.id)}
                onCancel={() => onEdit(null)}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="prep__group">
          {chapter === '全部' && gates.length > 0 ? <h3>其余</h3> : chapter !== '全部' ? <h3>{chapter}</h3> : null}
          <ul>
            {rest.map((item) => (
              <NoteCard
                key={item.id}
                item={item}
                mode={mode}
                editing={editing === item.id}
                open={openIds.has(item.id)}
                onToggleOpen={() => onToggleOpen(item.id)}
                onEdit={() => onEdit(item.id)}
                onCancel={() => onEdit(null)}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {visible.length === 0 ? <p className="empty-note">没有对上的条目。</p> : null}
    </>
  );
}

function NoteCard({
  item,
  mode,
  editing,
  open,
  onToggleOpen,
  onEdit,
  onCancel,
}: {
  item: NoteItem;
  mode: PrepMode;
  editing: boolean;
  open: boolean;
  onToggleOpen: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <li>
        <PrepForm
          kind="note"
          initial={item}
          onCancel={onCancel}
          onSave={(draft) => {
            if (draft.kind !== 'note') return;
            prepActions.updateNote(item.id, draft);
            onCancel();
          }}
        />
      </li>
    );
  }
  const mark = item.chapter === '入境澳大利亚' ? 'AU' : item.chapter === '入境新西兰' ? 'NZ' : item.chapter.slice(0, 1);
  const showClamp = !item.strict && !open && mode === 'land';
  return (
    <li className={item.strict ? 'prep-gate' : 'prep-note'}>
      <div className="prep-note__top">
        <span className="prep-note__mark" aria-hidden>
          {mark}
        </span>
        <div>
          <b>{item.title}</b>
          <small>{item.chapter}</small>
        </div>
      </div>
      <p className={showClamp ? 'is-clamp' : undefined}>
        <Rich text={item.body} />
      </p>
      <div className="prep__row-actions">
        {mode === 'land' && !item.strict ? (
          <button type="button" className="text-btn" onClick={onToggleOpen}>
            {open ? '收起' : '展开'}
          </button>
        ) : null}
        <button type="button" className="text-btn" onClick={onEdit}>
          修改
        </button>
        <button type="button" className="text-btn text-btn--danger" onClick={() => prepActions.removeNote(item.id)}>
          删除
        </button>
      </div>
    </li>
  );
}

function PackList({
  items,
  needleHit,
  editing,
  onEdit,
}: {
  items: PackItem[];
  needleHit: (parts: string[]) => boolean;
  editing: string | null;
  onEdit: (id: string | null) => void;
}) {
  const visible = items.filter((item) => needleHit([item.group, item.text]));
  const groups = orderedGroups(
    visible.map((item) => item.group),
    PACK_GROUPS,
  );
  return (
    <>
      {visible.length !== items.length ? <p className="prep__filter">筛出 {visible.length} 条</p> : null}
      {groups.map((group) => (
        <section key={group} className={`prep__group${group === '不带' ? ' is-ban' : ''}`}>
          <h3>{group === '不带' ? '不要塞进行李' : group}</h3>
          <ul>
            {visible
              .filter((item) => item.group === group)
              .map((item) =>
                editing === item.id ? (
                  <li key={item.id}>
                    <PrepForm
                      kind="pack"
                      initial={item}
                      onCancel={() => onEdit(null)}
                      onSave={(draft) => {
                        if (draft.kind !== 'pack') return;
                        prepActions.updatePack(item.id, draft);
                        onEdit(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={item.id} className={item.packed ? 'prep__item is-done' : 'prep__item'}>
                    {item.group === '不带' ? (
                      <p className="prep__ban">
                        <b>{item.text}</b>
                      </p>
                    ) : (
                      <Check className="prep__check" checked={item.packed} onChange={() => prepActions.togglePack(item.id)}>
                        <b>{item.text}</b>
                      </Check>
                    )}
                    <RowActions onEdit={() => onEdit(item.id)} onRemove={() => prepActions.removePack(item.id)} />
                  </li>
                ),
              )}
          </ul>
        </section>
      ))}
      {visible.length === 0 ? <p className="empty-note">没有对上的物品。</p> : null}
    </>
  );
}

function AppList({
  items,
  needleHit,
  editing,
  onEdit,
}: {
  items: AppItem[];
  needleHit: (parts: string[]) => boolean;
  editing: string | null;
  onEdit: (id: string | null) => void;
}) {
  const visible = items.filter((item) => needleHit([item.group, item.name, item.detail]));
  const groups = orderedGroups(
    visible.map((item) => item.group),
    APP_GROUPS,
  );
  return (
    <>
      {visible.length !== items.length ? <p className="prep__filter">筛出 {visible.length} 条</p> : null}
      {groups.map((group) => (
        <section key={group} className={`prep__group${group === '不装' ? ' is-ban' : ''}`}>
          <h3>{group === '不装' ? '不用装' : group}</h3>
          <ul>
            {visible
              .filter((item) => item.group === group)
              .map((item) =>
                editing === item.id ? (
                  <li key={item.id}>
                    <PrepForm
                      kind="app"
                      initial={item}
                      onCancel={() => onEdit(null)}
                      onSave={(draft) => {
                        if (draft.kind !== 'app') return;
                        prepActions.updateApp(item.id, { group: draft.group, name: draft.name, detail: draft.detail });
                        onEdit(null);
                      }}
                    />
                  </li>
                ) : (
                  <li key={item.id} className={item.installed ? 'prep__item is-done' : 'prep__item'}>
                    {item.group === '不装' ? (
                      <p className="prep__ban">
                        <b>{item.name}</b>
                        <small>{item.detail}</small>
                      </p>
                    ) : (
                      <Check className="prep__check" checked={item.installed} onChange={() => prepActions.toggleApp(item.id)}>
                        <b>{item.name}</b>
                        <small>{item.detail}</small>
                      </Check>
                    )}
                    <RowActions onEdit={() => onEdit(item.id)} onRemove={() => prepActions.removeApp(item.id)} />
                  </li>
                ),
              )}
          </ul>
        </section>
      ))}
      {visible.length === 0 ? <p className="empty-note">没有对上的 App。</p> : null}
    </>
  );
}

function RowActions({ onEdit, onRemove }: { onEdit: () => void; onRemove: () => void }) {
  return (
    <div className="prep__row-actions">
      <button type="button" className="text-btn" onClick={onEdit}>
        修改
      </button>
      <button type="button" className="text-btn text-btn--danger" onClick={onRemove}>
        删除
      </button>
    </div>
  );
}

type Draft =
  | { kind: 'todo'; group: string; text: string; note: string }
  | { kind: 'note'; chapter: string; title: string; body: string; strict: boolean }
  | { kind: 'pack'; group: string; text: string }
  | { kind: 'app'; group: string; name: string; detail: string };

function PrepForm({
  kind,
  initial,
  onSave,
  onCancel,
}: {
  kind: PrepKind;
  initial?: TodoItem | NoteItem | PackItem | AppItem;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const todo = kind === 'todo' ? (initial as TodoItem | undefined) : undefined;
  const note = kind === 'note' ? (initial as NoteItem | undefined) : undefined;
  const pack = kind === 'pack' ? (initial as PackItem | undefined) : undefined;
  const app = kind === 'app' ? (initial as AppItem | undefined) : undefined;
  const [group, setGroup] = useState(
    todo?.group ?? pack?.group ?? app?.group ?? (kind === 'app' ? APP_GROUPS[0] : kind === 'pack' ? PACK_GROUPS[0] : TODO_GROUPS[0]),
  );
  const [text, setText] = useState(todo?.text ?? pack?.text ?? app?.name ?? '');
  const [extra, setExtra] = useState(todo?.note ?? app?.detail ?? '');
  const [chapter, setChapter] = useState(note?.chapter ?? NOTE_CHAPTERS[0]);
  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const strict = note?.strict ?? false;
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (kind === 'note') {
      if (!title.trim() || !body.trim() || !chapter.trim()) {
        setError('章节、标题和正文都要填。');
        return;
      }
      onSave({ kind: 'note', chapter: chapter.trim(), title: title.trim(), body: body.trim(), strict });
      return;
    }
    if (kind === 'app') {
      if (!text.trim() || !group.trim()) {
        setError('分组和名称都要填。');
        return;
      }
      onSave({ kind: 'app', group: group.trim(), name: text.trim(), detail: extra.trim() });
      return;
    }
    if (!text.trim() || !group.trim()) {
      setError('分组和内容都要填。');
      return;
    }
    if (kind === 'todo') onSave({ kind: 'todo', group: group.trim(), text: text.trim(), note: extra.trim() });
    else onSave({ kind: 'pack', group: group.trim(), text: text.trim() });
  }

  const groupOptions = kind === 'app' ? APP_GROUPS : kind === 'pack' ? PACK_GROUPS : TODO_GROUPS;
  return (
    <form className="prep-form" onSubmit={submit}>
      {kind === 'note' ? (
        <>
          <label className="field">
            <span>章节</span>
            <select value={chapter} onChange={(event) => setChapter(event.target.value)}>
              {NOTE_CHAPTERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {NOTE_CHAPTERS.some((name) => name === chapter) ? null : <option value={chapter}>{chapter}</option>}
            </select>
          </label>
          <label className="field">
            <span>标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field">
            <span>正文</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span>分组</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)}>
              {groupOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {groupOptions.some((name) => name === group) ? null : <option value={group}>{group}</option>}
            </select>
          </label>
          <label className="field">
            <span>{kind === 'app' ? '名称' : kind === 'pack' ? '物品' : '要做的事'}</span>
            <textarea value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          {kind === 'todo' || kind === 'app' ? (
            <label className="field">
              <span>{kind === 'app' ? '说明，可以空着' : '补充，可以空着'}</span>
              <input value={extra} onChange={(event) => setExtra(event.target.value)} />
            </label>
          ) : null}
        </>
      )}
      {error ? <p className="form-error">{error}</p> : null}
      <div className="btn-row">
        <button type="submit" className="btn btn-primary">
          保存
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  );
}

function Rich({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s\u3000，。、；）)]+)/g);
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part.startsWith('http')) {
      nodes.push(
        <a key={index} href={part} target="_blank" rel="noreferrer">
          {part.replace(/^https?:\/\//, '')}
        </a>,
      );
    } else if (part) {
      nodes.push(part);
    }
  });
  return <>{nodes}</>;
}
