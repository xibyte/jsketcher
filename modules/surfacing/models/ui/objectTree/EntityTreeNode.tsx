import React, {useState} from 'react';
import {GeometricEntity} from '../../GeometricEntity';
import {NurbsSurface} from '../../NurbsSurface/NurbsSurface.entity';
import {BoundingCurve} from '../../BoundingCurve/BoundingCurve.entity';
import {ControlPoint} from '../../ControlPoint/ControlPoint.entity';
import {Vertex} from '../../Vertex/Vertex.entity';
import {Line} from '../../Line/Line.entity';
import {Cage} from '../../Cage/Cage.entity';
import {NurbsCurve} from '../../NurbsCurve/NurbsCurve.entity';
import {Group} from '../../Group/Group.entity';
import type {Scene} from '../../Scene/Scene.entity';

const SIDE_NAMES = ['bottom', 'right', 'top', 'left'];

// Contrast palette — works on dark, medium and light backgrounds via rgba
const COLORS = {
  text: '#f2f2f2',
  textMuted: 'rgba(255,255,255,0.55)',
  chevron: 'rgba(255,255,255,0.75)',
  icon: 'rgba(255,255,255,0.85)',
  eye: 'rgba(255,255,255,0.75)',
  eyeOff: 'rgba(255,255,255,0.25)',
  rowBg: 'rgba(255,255,255,0.04)',
  hoverBg: 'rgba(255,255,255,0.12)',
  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
};

const FONT = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';

export interface EntityTreeCallbacks {
  onOpenDialog?: (entity: GeometricEntity) => void;
  onRemoveEntity?: (entity: GeometricEntity) => void;
}

interface EntityNodeProps {
  entity: GeometricEntity;
  depth?: number;
  callbacks?: EntityTreeCallbacks;
}

/**
 * Recursive tree node for displaying the GeometricEntity graph.
 * Fusion-360-inspired row layout: chevron, visibility eye, icon, label, detail, delete.
 */
export function EntityTreeNode({entity, depth = 0, callbacks}: EntityNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(true);
  const info = getEntityInfo(entity);
  const childEntries = getChildEntries(entity);
  const hasChildren = childEntries.length > 0;
  const hasDialog = entityHasDialog(entity);
  const removable = isRemovable(entity) && !!callbacks?.onRemoveEntity;
  const toggleable = canToggleVisibility(entity);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = info.label;
    if (window.confirm(`Remove ${label}?`)) {
      callbacks!.onRemoveEntity!(entity);
    }
  };

  const indentPx = depth * 12;

  return <div style={{marginBottom: 2}}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 22,
        paddingLeft: 4 + indentPx,
        paddingRight: 6,
        fontFamily: FONT,
        fontSize: 12,
        color: visible ? COLORS.text : COLORS.textMuted,
        background: hover ? COLORS.hoverBg : COLORS.rowBg,
        borderRadius: 3,
        cursor: 'default',
        userSelect: 'none',
        textShadow: COLORS.textShadow,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Chevron — expand/collapse only */}
      <span
        onClick={hasChildren ? () => setExpanded(e => !e) : undefined}
        style={{
          width: 14,
          flexShrink: 0,
          fontSize: 10,
          color: COLORS.chevron,
          cursor: hasChildren ? 'pointer' : 'default',
          textAlign: 'center',
          lineHeight: '22px',
          display: 'inline-block',
        }}
      >
        {hasChildren ? (expanded ? '\u25BC' : '\u25B6') : ''}
      </span>

      {/* Visibility eye — reserves space only when toggleable */}
      {toggleable && <span
        onClick={(e) => { e.stopPropagation(); setVisible(v => !v); }}
        style={{
          width: 14,
          flexShrink: 0,
          marginLeft: 2,
          color: visible ? COLORS.eye : COLORS.eyeOff,
          fontSize: 11,
          textAlign: 'center',
          cursor: 'pointer',
          lineHeight: '22px',
        }}
        title={visible ? 'Hide' : 'Show'}
      >
        {visible ? '\u25C9' : '\u25CE'}
      </span>}

      {/* Type icon — monochrome */}
      <span style={{
        width: 14,
        flexShrink: 0,
        marginLeft: 4,
        marginRight: 4,
        color: COLORS.icon,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: '22px',
      }}>
        {info.icon}
      </span>

      {/* Label — opens dialog on click */}
      <span
        onClick={hasDialog && callbacks?.onOpenDialog ? () => callbacks.onOpenDialog!(entity) : undefined}
        style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: hasDialog ? 'pointer' : 'default',
          lineHeight: '22px',
          fontWeight: info.bold ? 600 : 400,
        }}
      >
        {info.label}
      </span>

      {/* Detail (count/extras) */}
      {info.detail && <span style={{
        color: COLORS.textMuted,
        marginLeft: 6,
        fontSize: 11,
        flexShrink: 0,
        lineHeight: '22px',
      }}>{info.detail}</span>}

      {/* Delete button — hidden (not removed) until hover to avoid jitter */}
      {removable && <span
        onClick={hover ? handleRemove : undefined}
        title="Remove"
        style={{
          marginLeft: 6,
          padding: '0 4px',
          fontSize: 14,
          lineHeight: '22px',
          color: '#ff7070',
          cursor: 'pointer',
          flexShrink: 0,
          fontWeight: 700,
          visibility: hover ? 'visible' : 'hidden',
        }}
      >&times;</span>}
    </div>

    {expanded && childEntries.map((entry, i) => {
      const childIndent = 4 + (depth + 1) * 12 + 18;
      return <div key={`${entry.key}-${i}`}>
        {entry.label && <div style={{
          paddingLeft: childIndent,
          paddingTop: 1,
          paddingBottom: 1,
          fontFamily: FONT,
          fontSize: 10,
          color: COLORS.textMuted,
          lineHeight: '14px',
          fontStyle: 'italic',
          textShadow: COLORS.textShadow,
        }}>{entry.label}</div>}
        {entry.entity && <EntityTreeNode entity={entry.entity} depth={depth + 1} callbacks={callbacks} />}
        {entry.value !== undefined && <div style={{
          paddingLeft: childIndent,
          paddingTop: 1,
          paddingBottom: 1,
          fontFamily: FONT,
          fontSize: 10,
          color: COLORS.textMuted,
          lineHeight: '14px',
          textShadow: COLORS.textShadow,
        }}>{entry.value}</div>}
      </div>;
    })}
  </div>;
}

interface ChildEntry {
  key: string;
  label?: string;
  entity?: GeometricEntity;
  value?: string;
}

function getChildEntries(entity: GeometricEntity): ChildEntry[] {
  const entries: ChildEntry[] = [];

  if (isScene(entity)) {
    const scene = entity as Scene;
    const groups = scene.children.filter(c => c instanceof Group);
    if (groups.length > 0) {
      for (let i = 0; i < groups.length; i++) {
        entries.push({key: `g${i}`, entity: groups[i]});
      }
    } else {
      for (let i = 0; i < scene.surfaces.length; i++) {
        entries.push({key: `s${i}`, entity: scene.surfaces[i]});
      }
    }
  } else if (entity instanceof Group) {
    for (let i = 0; i < entity.children.length; i++) {
      entries.push({key: `c${i}`, entity: entity.children[i]});
    }
  } else if (entity instanceof NurbsSurface) {
    entries.push({key: 'bc-bottom', entity: entity.boundingCurves.bottom});
    entries.push({key: 'bc-right', entity: entity.boundingCurves.right});
    entries.push({key: 'bc-top', entity: entity.boundingCurves.top});
    entries.push({key: 'bc-left', entity: entity.boundingCurves.left});
    entries.push({key: 'cage', entity: entity.cage});
    if (entity.mirrorOf) {
      entries.push({key: 'mirror-source', label: 'mirror of', entity: entity.mirrorOf.source});
      for (let i = 0; i < entity.mirrorOf.cpPairs.length; i++) {
        entries.push({key: `mp-src-${i}`, label: `pair[${i}].source`, entity: entity.mirrorOf.cpPairs[i].source});
        entries.push({key: `mp-mir-${i}`, label: `pair[${i}].mirror`, entity: entity.mirrorOf.cpPairs[i].mirror});
      }
    }
  } else if (entity instanceof BoundingCurve) {
    for (let i = 0; i < entity.cp.length; i++) {
      entries.push({key: `cp${i}`, entity: entity.cp[i]});
    }
    if (entity.arcConstraint) {
      const ac = entity.arcConstraint;
      entries.push({key: 'arc', value: `Arc ${Math.round(ac.angle)}\u00B0 r=${(ac.radius).toFixed(2)} (${ac.mode})`});
    }
  } else if (entity instanceof ControlPoint) {
    // ControlPoint extends Vertex, so there's nothing separate to show
    // for the "vertex" — position lives on the CP directly.
    const p = entity.position;
    entries.push({key: 'pos', value: `pos: [${p[0].toFixed(3)}, ${p[1].toFixed(3)}, ${p[2].toFixed(3)}]`});
    entries.push({key: 'weight', value: `weight: ${entity.weight.value}`});
  } else if (entity instanceof Cage) {
    for (let i = 0; i < entity.vertices.length; i++) {
      entries.push({key: `v${i}`, entity: entity.vertices[i]});
    }
    for (let i = 0; i < entity.segments.length; i++) {
      entries.push({key: `seg${i}`, entity: entity.segments[i]});
    }
  } else if (entity instanceof Line) {
    entries.push({key: 'a', label: 'a', entity: entity.a});
    entries.push({key: 'b', label: 'b', entity: entity.b});
  } else if (entity instanceof Vertex) {
    const p = entity.position;
    entries.push({key: 'pos', value: `[${p[0].toFixed(3)}, ${p[1].toFixed(3)}, ${p[2].toFixed(3)}]`});
  }

  return entries;
}

interface EntityInfo {
  label: string;
  detail?: string;
  icon?: string;
  bold?: boolean;
}

function getEntityInfo(entity: GeometricEntity): EntityInfo {
  if (isScene(entity)) {
    return {label: 'Scene', icon: '\u25A3', bold: true};
  }
  if (entity instanceof Group) {
    return {label: entity.name || entity.id, icon: '\u25B1', bold: true};
  }
  if (entity instanceof NurbsSurface) {
    return {label: entity.id, icon: '\u25A2'};
  }
  if (entity instanceof BoundingCurve) {
    return {
      label: `${SIDE_NAMES[entity.side]} edge`,
      detail: entity.arcConstraint ? 'arc' : '',
      icon: '\u2500',
    };
  }
  if (entity instanceof ControlPoint) {
    return {
      label: entity.id,
      detail: entity.weight.value !== 1 ? `w=${entity.weight.value}` : '',
      icon: '\u25CB',
    };
  }
  if (entity instanceof Vertex) {
    return {label: entity.id, icon: '\u2022'};
  }
  if (entity instanceof Line) {
    return {label: entity.id, icon: '\u2015'};
  }
  if (entity instanceof Cage) {
    return {label: 'Cage', icon: '\u25A6'};
  }
  if (entity instanceof NurbsCurve) {
    return {label: entity.id, icon: '\u223F'};
  }
  return {label: entity.id};
}

function isScene(entity: GeometricEntity): boolean {
  return 'surfaces' in entity && Array.isArray((entity as any).surfaces);
}

/** Entities that have a properties dialog */
function entityHasDialog(entity: GeometricEntity): boolean {
  return entity instanceof Group || entity instanceof NurbsSurface;
}

/** Entities that can be removed from the scene */
function isRemovable(entity: GeometricEntity): boolean {
  return entity instanceof Group || entity instanceof NurbsSurface;
}

/** Entities that get a visibility toggle eye */
function canToggleVisibility(entity: GeometricEntity): boolean {
  return entity instanceof Group || entity instanceof NurbsSurface;
}
