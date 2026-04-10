import React, {useState, useEffect, useCallback, useContext} from 'react';
import {useStream} from "ui/effects";
import {SceneInlineSection} from "ui/components/SceneInlineSection";
import {EntityTreeNode, EntityTreeCallbacks} from "surfacing/models/EntityTreeNode";
import {MSurfacingScene} from "surfacing/models/MSurfacingScene";
import {GeometricEntity} from "surfacing/models/GeometricEntity";
import {Group} from "surfacing/models/Group/Group.entity";
import {NurbsSurface} from "surfacing/models/NurbsSurface/NurbsSurface.entity";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export function SceneInlineObjectExplorer() {

  const ctx = useContext(ReactApplicationContext);
  const models = useStream(c => c.craftService.models$);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('patch-cage-constraints-changed', handler);
    return () => document.removeEventListener('patch-cage-constraints-changed', handler);
  }, []);

  const handleRemoveEntity = useCallback((entity: GeometricEntity) => {
    // Find the MSurfacingScene that owns this entity
    const scenes: MSurfacingScene[] = (models || []).filter(
      (m): m is MSurfacingScene => m instanceof MSurfacingScene
    );

    for (const model of scenes) {
      const cage = model.cage;

      if (entity instanceof Group) {
        // Remove all patches in the group from the cage
        const group = cage.groups.find(g => g.name === (entity as Group).name);
        if (group) {
          // Remove patches in reverse order to preserve indices
          const indices = [...group.patchIndices].sort((a, b) => b - a);
          for (const idx of indices) {
            cage.patches.splice(idx, 1);
            cage.notifySplice(idx, 1, 0);
          }
          // Remove the group itself
          const gi = cage.groups.indexOf(group);
          if (gi >= 0) cage.groups.splice(gi, 1);
        }
      } else if (entity instanceof NurbsSurface) {
        // Find patch index by matching control point positions
        // Since the entity is built from the cage, we match by index within the group
        const parent = entity.parent;
        if (parent instanceof Group) {
          const childIdx = parent.children.indexOf(entity);
          const group = cage.groups.find(g => g.name === parent.name);
          if (group && childIdx >= 0 && childIdx < group.patchIndices.length) {
            const patchIdx = group.patchIndices[childIdx];
            cage.patches.splice(patchIdx, 1);
            cage.notifySplice(patchIdx, 1, 0);
          }
        }
      }

      // Rebuild mesh and refresh
      model.recompute();
      model.refreshSceneEntity();

      // Persist state
      const opIdx = model.originatingOperation;
      if (opIdx !== undefined && opIdx >= 0) {
        ctx.craftService.updateOperationParams(opIdx, {cageState: model.serializeCage()});
        ctx.projectService.scheduleSave();
      }
    }

    // Update view
    document.dispatchEvent(new CustomEvent('patch-cage-constraint-deleted'));
    forceUpdate(n => n + 1);
  }, [models, ctx]);

  if (!models) {
    return null;
  }

  const scenes: MSurfacingScene[] = models.filter(
    (m): m is MSurfacingScene => m instanceof MSurfacingScene
  );

  for (const s of scenes) {
    s.refreshSceneEntity();
  }

  const topLevelEntities = scenes.flatMap(s => s.scene.children);
  const callbacks: EntityTreeCallbacks = {onRemoveEntity: handleRemoveEntity};

  return <SceneInlineSection title='OBJECTS'>
    {topLevelEntities.map((entity, i) =>
      <EntityTreeNode key={entity.id + '-' + i} entity={entity} callbacks={callbacks} />
    )}
  </SceneInlineSection>;
}
