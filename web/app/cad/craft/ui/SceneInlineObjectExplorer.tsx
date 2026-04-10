import React, {useCallback, useContext, useRef} from 'react';
import {useStream} from "ui/effects";
import {SceneInlineSection} from "ui/components/SceneInlineSection";
import {EntityTreeNode, EntityTreeCallbacks} from "surfacing/models/ui/objectTree/EntityTreeNode";
import {Scene} from "surfacing/models/Scene/Scene.entity";
import {GeometricEntity} from "surfacing/models/GeometricEntity";
import {Group} from "surfacing/models/Group/Group.entity";
import {NurbsSurface} from "surfacing/models/NurbsSurface/NurbsSurface.entity";
import {showGroupDialog} from "surfacing/models/Group/Group.dialog";
import {showPropsDialog} from "surfacing/models/NurbsSurface/NurbsSurface.dialog";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";

export function SceneInlineObjectExplorer() {

  const ctx = useContext(ReactApplicationContext);
  const openDialogRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to the surfacing state stream — fires immediately with the
  // current value on mount, then on every notifyChange() in surfacingBundle.
  const snapshot = useStream(c => (c as any).surfacingService?.state$);

  const closeOpenDialog = useCallback(() => {
    if (openDialogRef.current) {
      if (openDialogRef.current.parentNode) {
        openDialogRef.current.parentNode.removeChild(openDialogRef.current);
      }
      openDialogRef.current = null;
    }
  }, []);

  const getScene = useCallback((): Scene | null => {
    const svc = (ctx as any).surfacingService;
    return svc ? svc.scene : null;
  }, [ctx]);

  // Persist + refresh after a mutation
  const persistAndRefresh = useCallback(() => {
    const scene = getScene();
    if (!scene) return;
    scene.syncEntityGraph();
    const view = (scene as any).ext?.view;
    if (view && typeof view.rebuildAll === 'function') view.rebuildAll();
    const svc = (ctx as any).surfacingService;
    if (svc) {
      if (svc.scheduleSave) svc.scheduleSave();
      if (svc.notifyChange) svc.notifyChange();
    }
  }, [ctx, getScene]);

  // Remove a group and all its patches from the scene
  const removeGroup = useCallback((group: Group) => {
    const scene = getScene();
    if (!scene) return;
    const sceneGroup = scene.groups.find(g => g.name === group.name);
    if (sceneGroup) {
      const indices = [...sceneGroup.patchIndices].sort((a, b) => b - a);
      for (const idx of indices) {
        scene.surfaces.splice(idx, 1);
        scene.notifySplice(idx, 1, 0);
      }
      const gi = scene.groups.indexOf(sceneGroup);
      if (gi >= 0) scene.groups.splice(gi, 1);
    }
    persistAndRefresh();
  }, [getScene, persistAndRefresh]);

  // Remove a single surface from the scene
  const removeSurface = useCallback((surface: NurbsSurface) => {
    const scene = getScene();
    if (!scene) return;
    const idx = scene.surfaces.indexOf(surface);
    if (idx >= 0) {
      scene.surfaces.splice(idx, 1);
      scene.notifySplice(idx, 1, 0);
    }
    persistAndRefresh();
  }, [getScene, persistAndRefresh]);

  const handleOpenDialog = useCallback((entity: GeometricEntity) => {
    closeOpenDialog();

    if (entity instanceof Group) {
      openDialogRef.current = showGroupDialog(entity, {
        onRemove: () => removeGroup(entity),
        onClose: closeOpenDialog,
      });
    } else if (entity instanceof NurbsSurface) {
      const scene = getScene();
      if (!scene) return;
      const surfaceIdx = scene.surfaces.indexOf(entity);
      openDialogRef.current = showPropsDialog(entity, surfaceIdx, {
        onPushPull: (dist) => {
          scene.pushPullPatch(surfaceIdx, dist);
          persistAndRefresh();
        },
        onExtrude: (dist) => {
          scene.extrudePatch(surfaceIdx, dist);
          persistAndRefresh();
        },
        onSubdivide: () => {
          scene.subdividePatch(surfaceIdx);
          persistAndRefresh();
          closeOpenDialog();
        },
        onRemove: () => {
          removeSurface(entity);
          closeOpenDialog();
        },
        onClose: closeOpenDialog,
      });
    }
  }, [closeOpenDialog, getScene, persistAndRefresh, removeGroup, removeSurface]);

  // Read scene from the snapshot stream — guarantees re-render on every
  // notifyChange() (mergeScene, load, persistAndRefresh, etc.)
  const scene = snapshot ? (snapshot as any).scene as Scene | null : null;
  if (!scene) {
    return <SceneInlineSection title='OBJECTS'><></></SceneInlineSection>;
  }

  scene.syncEntityGraph();
  const topLevelEntities = scene.children;
  const callbacks: EntityTreeCallbacks = {onOpenDialog: handleOpenDialog};

  return <SceneInlineSection title='OBJECTS'>
    {topLevelEntities.map((entity, i) =>
      <EntityTreeNode key={entity.id + '-' + i} entity={entity} callbacks={callbacks} />
    )}
  </SceneInlineSection>;
}
