import React, {useCallback, useContext, useRef, useState, useEffect} from 'react';
import {EntityTreeNode, EntityTreeCallbacks} from "surfacing/models/ui/objectTree/EntityTreeNode";
import {Scene} from "surfacing/models/Scene/Scene.entity";
import {GeometricEntity} from "surfacing/models/GeometricEntity";
import {Group} from "surfacing/models/Group/Group.entity";
import {NurbsSurface} from "surfacing/models/NurbsSurface/NurbsSurface.entity";
import {showGroupDialog} from "surfacing/models/Group/Group.dialog";
import {showPropsDialog} from "surfacing/models/NurbsSurface/NurbsSurface.dialog";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {surfacingState$, SurfacingSnapshot} from "surfacing/surfacingBundle";

export function SceneInlineObjectExplorer() {

  const ctx = useContext(ReactApplicationContext);
  const openDialogRef = useRef<HTMLDivElement | null>(null);

  // Subscribe directly to the module-level surfacing snapshot stream.
  // This stream exists at import time, so it works even if the explorer
  // mounts before SurfacingBundle.activate() runs.
  const [snapshot, setSnapshot] = useState<SurfacingSnapshot>(() => surfacingState$.value);
  useEffect(() => {
    const dispose = surfacingState$.attach((s: SurfacingSnapshot) => setSnapshot(s));
    return () => dispose();
  }, []);

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

  const handleRemoveEntity = useCallback((entity: GeometricEntity) => {
    if (entity instanceof Group) removeGroup(entity);
    else if (entity instanceof NurbsSurface) removeSurface(entity);
  }, [removeGroup, removeSurface]);

  // Read scene from the snapshot — re-renders on every notifyChange()
  const scene = snapshot.scene;
  if (!scene) return null;

  scene.syncEntityGraph();
  const topLevelEntities = scene.children;
  if (topLevelEntities.length === 0) return null;

  const callbacks: EntityTreeCallbacks = {
    onOpenDialog: handleOpenDialog,
    onRemoveEntity: handleRemoveEntity,
  };

  return <div style={{
    marginTop: 4,
    pointerEvents: 'auto',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  }}>
    <div style={{
      height: 24,
      lineHeight: '24px',
      padding: '0 8px',
      background: 'rgba(255,255,255,0.08)',
      borderLeft: '3px solid rgba(120,180,255,0.9)',
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: '#f2f2f2',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
      marginBottom: 3,
    }}>OBJECTS</div>
    <div style={{overflowY: 'auto', maxHeight: '60vh'}}>
      {topLevelEntities.map((entity, i) =>
        <EntityTreeNode key={entity.id + '-' + i} entity={entity} callbacks={callbacks} />
      )}
    </div>
  </div>;
}
