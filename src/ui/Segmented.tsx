export function Segmented(props: {
  items: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="wm-seg">
      {props.items.map((it) => (
        <button
          key={it.value}
          className={it.value === props.value ? 'wm-seg-btn wm-seg-btn-active' : 'wm-seg-btn'}
          onClick={() => props.onChange(it.value)}
          type="button"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

