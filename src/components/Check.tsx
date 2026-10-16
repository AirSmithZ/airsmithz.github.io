import type { ReactNode } from 'react';

export function Check({
  checked,
  onChange,
  children,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className ? `check ${className}` : 'check'}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="check__box" aria-hidden />
      <span className="check__text">{children}</span>
    </label>
  );
}
