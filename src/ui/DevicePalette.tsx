import { useDraggable } from '@dnd-kit/core';

export type DeviceKind = 'camera' | 'sensor' | 'ap';

function PaletteItem(props: { kind: DeviceKind; title: string; subtitle: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette_${props.kind}`,
    data: { kind: props.kind },
  });

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? 'wm-palette-item wm-palette-item-dragging' : 'wm-palette-item'}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      title="拖拽到画布放置"
    >
      <div className="wm-palette-icon" aria-hidden>
        {props.kind === 'camera' ? '⦿' : props.kind === 'sensor' ? '◎' : '⌁'}
      </div>
      <div className="wm-palette-text">
        <div className="wm-palette-title">{props.title}</div>
        <div className="wm-palette-sub">{props.subtitle}</div>
      </div>
    </div>
  );
}

export function DevicePalette() {
  return (
    <div className="wm-palette">
      <PaletteItem kind="camera" title="摄像头" subtitle="可拖拽放置，3D 中可见" />
      <PaletteItem kind="sensor" title="传感器" subtitle="点位/告警设备（mock）" />
      <PaletteItem kind="ap" title="AP" subtitle="无线覆盖设备（mock）" />
    </div>
  );
}

