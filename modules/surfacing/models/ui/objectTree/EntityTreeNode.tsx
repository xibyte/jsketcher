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
 *
 * - Chevron click: expand/collapse children
 * - Label click: open properties dialog for the entity (if implemented)
 * - Cyclic graph: same entity can be expanded infinitely in different locations
 */
export function EntityTreeNode({entity, depth = 0, callbacks}: EntityNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [hover, setHover] = useState(false);
  const info = getEntityInfo(entity);
  const childEntries = getChildEntries(entity);
  const hasChildren = childEntries.length > 0;
  const hasDialog = entityHasDialog(entity);
  const removable = isRemovable(entity) && !!callbacks?.onRemoveEntity;

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = info.label;
    if (window.confirm(`Remove ${label}?`)) {
      callbacks!.onRemoveEntity!(entity);
    }
  };

  return <div style={{paddingLeft: depth > 0 ? 12 : 0}}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 4px',
        fontSize: 11,
        color: info.color || '#ccc',
        borderRadius: 2,
        background: hover ? 'rgba(255,255,255,0.05)' : 'transparent',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Chevron — expand/collapse only */}
      {hasChildren
        ? <span
            onClick={() => setExpanded(e => !e)}
            style={{fontSize: 8, width: 10, flexShrink: 0, cursor: 'pointer'}}
          >
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
        : <span style={{width: 10, flexShrink: 0}} />
      }

      {/* Label — opens dialog on click */}
      <span
        onClick={hasDialog && callbacks?.onOpenDialog ? () => callbacks.onOpenDialog!(entity) : undefined}
        style={{
          fontWeight: info.bold ? 600 : 400,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: hasDialog ? 'pointer' : 'default',
        }}
      >
        {info.icon && <span style={{marginRight: 3}}>{info.icon}</span>}
        {info.label}
      </span>
      {info.detail && <span style={{color: '#777', marginLeft: 4, fontSize: 10, flexShrink: 0}}>{info.detail}</span>}

      {/* Delete button — only on hover, only for removable entities */}
      {removable && hover && <span
        onClick={handleRemove}
        title="Remove"
        style={{
          marginLeft: 4,
          padding: '0 4px',
          fontSize: 13,
          lineHeight: '12px',
          color: '#e55',
          cursor: 'pointer',
          flexShrink: 0,
          fontWeight: 700,
        }}
      >&times;</span>}
    </div>
    {expanded && childEntries.map((entry, i) => (
      <div key={`${entry.key}-${i}`}>
        {entry.label && <div style={{
          paddingLeft: (depth + 1) * 12,
          fontSize: 10,
          color: '#666',
          padding: '1px 4px 1px ' + ((depth + 1) * 12) + 'px',
        }}>{entry.label}</div>}
        {entry.entity && <EntityTreeNode entity={entry.entity} depth={depth + 1} callbacks={callbacks} />}
        {entry.value !== undefined && <div style={{
          paddingLeft: (depth + 1) * 12 + 10,
          fontSize: 10,
          color: '#999',
          padding: '1px 4px 1px ' + ((depth + 1) * 12 + 10) + 'px',
        }}>{entry.value}</div>}
      </div>
    ))}
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
    entries.push({key: 'bc-bottom', label: 'bottom', entity: entity.boundingCurves.bottom});
    entries.push({key: 'bc-right', label: 'right', entity: entity.boundingCurves.right});
    entries.push({key: 'bc-top', label: 'top', entity: entity.boundingCurves.top});
    entries.push({key: 'bc-left', label: 'left', entity: entity.boundingCurves.left});
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
    entries.push({key: 'vertex', entity: entity.vertex});
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
  color?: string;
  bold?: boolean;
}

function getEntityInfo(entity: GeometricEntity): EntityInfo {
  if (isScene(entity)) {
    const scene = entity as Scene;
    return {label: 'Scene', detail: `${scene.surfaces.length} surfaces`, icon: '\u25A6', color: '#eee', bold: true};
  }
  if (entity instanceof Group) {
    return {label: `Group: ${entity.name || entity.id}`, detail: `${entity.children.length}`, icon: '\u25A4', color: '#fcb', bold: true};
  }
  if (entity instanceof NurbsSurface) {
    return {label: entity.id, icon: '\u25A3', color: '#8cf'};
  }
  if (entity instanceof BoundingCurve) {
    return {label: `${SIDE_NAMES[entity.side]} edge`, detail: entity.arcConstraint ? '\u25CF arc' : '', icon: '\u2500', color: '#adf'};
  }
  if (entity instanceof ControlPoint) {
    return {label: entity.id, detail: entity.weight.value !== 1 ? `w=${entity.weight.value}` : '', icon: '\u25C9', color: '#dda'};
  }
  if (entity instanceof Vertex) {
    const p = entity.position;
    return {label: entity.id, detail: `[${p[0].toFixed(1)}, ${p[1].toFixed(1)}, ${p[2].toFixed(1)}]`, icon: '\u2022', color: '#afa'};
  }
  if (entity instanceof Line) {
    return {label: entity.id, icon: '\u2014', color: '#aaa'};
  }
  if (entity instanceof Cage) {
    return {label: 'Cage', detail: `${entity.vertices.length}v ${entity.segments.length}seg`, icon: '\u25A1', color: '#ccc'};
  }
  if (entity instanceof NurbsCurve) {
    return {label: entity.id, icon: '\u223F', color: '#fca'};
  }
  return {label: entity.id, color: '#999'};
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
