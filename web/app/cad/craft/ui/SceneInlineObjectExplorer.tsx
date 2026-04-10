import React, {useState, useEffect, useCallback, useContext, useRef} from 'react';
import {useStream} from "ui/effects";
import {SceneInlineSection} from "ui/components/SceneInlineSection";
import {EntityTreeNode, EntityTreeCallbacks} from "surfacing/models/EntityTreeNode";
import {MSurfacingScene} from "surfacing/models/MSurfacingScene";
import {GeometricEntity} from "surfacing/models/GeometricEntity";
import {Group} from "surfacing/models/Group/Group.entity";
import {NurbsSurface} from "surfacing/models/NurbsSurface/NurbsSurface.entity";
import {showGroupDialog, closeGroupDialog} from "surfacing/models/Group/Group.dialog";
import {showPropsDialog, closeDialog} from "surfacing/models/NurbsSurface/NurbsSurface.dialog";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export function SceneInlineObjectExplorer() {

  const ctx = useContext(ReactApplicationContext);
  const models = useStream(c => c.craftService.models$);
  const [, forceUpdate] = useState(0);
  const openDialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('patch-cage-constraints-changed', handler);
    return () => document.removeEventListener('patch-cage-constraints-changed', handler);
  }, []);

  // Close any open dialog
  const closeOpenDialog = useCallback(() => {
    if (openDialogRef.current) {
      if (openDialogRef.current.parentNode) {
        openDialogRef.current.parentNode.removeChild(openDialogRef.current);
      }
      openDialogRef.current = null;
    }
  }, []);

  // Persist cage state after modifications
  const persistAndRefresh = useCallback((model: MSurfacingScene) => {
    model.recompute();
    model.refreshSceneEntity();
    ctx.projectService.scheduleSave();
    document.dispatchEvent(new CustomEvent('patch-cage-constraint-deleted'));
    forceUpdate(n => n + 1);
  }, [ctx]);

  // Find the MSurfacingScene that owns an entity
  const findOwner = useCallback((): MSurfacingScene | null => {
    if (!models) return null;
    const scenes = models.filter((m): m is MSurfacingScene => m instanceof MSurfacingScene);
    return scenes[0] || null;
  }, [models]);

  // Remove a group and all its patches from the cage
  const removeGroup = useCallback((group: Group) => {
    const model = findOwner();
    if (!model) return;
    const cage = model.cage;
    const cageGroup = cage.groups.find(g => g.name === group.name);
    if (cageGroup) {
      const indices = [...cageGroup.patchIndices].sort((a, b) => b - a);
      for (const idx of indices) {
        cage.patches.splice(idx, 1);
        cage.notifySplice(idx, 1, 0);
      }
      const gi = cage.groups.indexOf(cageGroup);
      if (gi >= 0) cage.groups.splice(gi, 1);
    }
    persistAndRefresh(model);
  }, [findOwner, persistAndRefresh]);

  // Remove a single surface from the cage
  const removeSurface = useCallback((surface: NurbsSurface) => {
    const model = findOwner();
    if (!model) return;
    const cage = model.cage;
    const parent = surface.parent;
    if (parent instanceof Group) {
      const childIdx = parent.children.indexOf(surface);
      const cageGroup = cage.groups.find(g => g.name === parent.name);
      if (cageGroup && childIdx >= 0 && childIdx < cageGroup.patchIndices.length) {
        const patchIdx = cageGroup.patchIndices[childIdx];
        cage.patches.splice(patchIdx, 1);
        cage.notifySplice(patchIdx, 1, 0);
      }
    }
    persistAndRefresh(model);
  }, [findOwner, persistAndRefresh]);

  const handleOpenDialog = useCallback((entity: GeometricEntity) => {
    closeOpenDialog();

    if (entity instanceof Group) {
      openDialogRef.current = showGroupDialog(entity, {
        onRemove: () => removeGroup(entity),
        onClose: closeOpenDialog,
      });
    } else if (entity instanceof NurbsSurface) {
      const model = findOwner();
      if (!model) return;
      const parent = entity.parent;
      let surfaceIdx = 0;
      if (parent instanceof Group) {
        const cageGroup = model.cage.groups.find(g => g.name === parent.name);
        const childIdx = parent.children.indexOf(entity);
        if (cageGroup && childIdx >= 0 && childIdx < cageGroup.patchIndices.length) {
          surfaceIdx = cageGroup.patchIndices[childIdx];
        }
      }
      openDialogRef.current = showPropsDialog(entity, surfaceIdx, {
        onPushPull: (dist) => {
          model.cage.pushPullPatch(surfaceIdx, dist);
          persistAndRefresh(model);
        },
        onExtrude: (dist) => {
          model.cage.extrudePatch(surfaceIdx, dist);
          persistAndRefresh(model);
        },
        onSubdivide: () => {
          model.cage.subdividePatch(surfaceIdx);
          persistAndRefresh(model);
          closeOpenDialog();
        },
        onRemove: () => {
          removeSurface(entity);
          closeOpenDialog();
        },
        onClose: closeOpenDialog,
      });
    }
  }, [closeOpenDialog, findOwner, persistAndRefresh, removeGroup, removeSurface]);

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
  const callbacks: EntityTreeCallbacks = {onOpenDialog: handleOpenDialog};

  return <SceneInlineSection title='OBJECTS'>
    {topLevelEntities.map((entity, i) =>
      <EntityTreeNode key={entity.id + '-' + i} entity={entity} callbacks={callbacks} />
    )}
  </SceneInlineSection>;
}
