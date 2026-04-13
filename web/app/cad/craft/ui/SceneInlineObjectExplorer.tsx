import React, {useCallback, useContext, useState, useEffect} from 'react';
import {EntityTreeNode, EntityTreeCallbacks} from "surfacing/models/ui/objectTree/EntityTreeNode";
import {Scene} from "surfacing/models/Scene/Scene.entity";
import {GeometricEntity} from "surfacing/models/GeometricEntity";
import {Group} from "surfacing/models/Group/Group.entity";
import {NurbsSurface} from "surfacing/models/NurbsSurface/NurbsSurface.entity";
import {GroupDialog} from "surfacing/models/Group/Group.dialog";
import {ReactApplicationContext} from "cad/dom/ReactApplicationContext";
import {surfacingState$, SurfacingSnapshot} from "surfacing/surfacingBundle";

export function SceneInlineObjectExplorer() {

  const ctx = useContext(ReactApplicationContext);
  const [openGroup, setOpenGroup] = useState<Group | null>(null);

  // Subscribe directly to the module-level surfacing snapshot stream.
  // This stream exists at import time, so it works even if the explorer
  // mounts before SurfacingBundle.activate() runs.
  const [snapshot, setSnapshot] = useState<SurfacingSnapshot>(() => surfacingState$.value);
  useEffect(() => {
    const dispose = surfacingState$.attach((s: SurfacingSnapshot) => setSnapshot(s));
    return () => dispose();
  }, []);

  const getScene = useCallback((): Scene | null => {
    const svc = (ctx as any).surfacingService;
    return svc ? svc.scene : null;
  }, [ctx]);

  // Persist + refresh after a mutation
  const persistAndRefresh = useCallback(() => {
    const scene = getScene();
    scene?.ctx.commit();
  }, [getScene]);

  // Remove a group and all its patches from the scene
  const removeGroup = useCallback((group: Group) => {
    const scene = getScene();
    if (!scene) return;
    // The Group entity holds direct surface references — drop them all and
    // then drop the group itself. No index gymnastics.
    for (const surface of [...group.surfaces]) {
      surface.parent?.removeChild(surface);
      surface.dispose();
    }
    group.parent?.removeChild(group);
    persistAndRefresh();
  }, [getScene, persistAndRefresh]);

  // Remove a single surface from the scene
  const removeSurface = useCallback((surface: NurbsSurface) => {
    const scene = getScene();
    if (!scene) return;
    surface.parent?.removeChild(surface);
    surface.dispose();
    persistAndRefresh();
  }, [getScene, persistAndRefresh]);

  const handleOpenDialog = useCallback((entity: GeometricEntity) => {
    if (entity instanceof Group) setOpenGroup(entity);
  }, []);

  const handleRemoveEntity = useCallback((entity: GeometricEntity) => {
    if (entity instanceof Group) removeGroup(entity);
    else if (entity instanceof NurbsSurface) removeSurface(entity);
  }, [removeGroup, removeSurface]);

  const scene = snapshot.scene;
  if (!scene || scene.children.length === 0) return null;

  const callbacks: EntityTreeCallbacks = {
    onOpenDialog: handleOpenDialog,
    onRemoveEntity: handleRemoveEntity,
  };

  return <div style={{
    marginTop: 4,
    pointerEvents: 'auto',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
  }}>
    <div style={{overflowY: 'auto', maxHeight: '60vh'}}>
      {scene.children.map((entity, i) =>
        <EntityTreeNode key={entity.id} entity={entity} callbacks={callbacks} />
      )}
    </div>
    {openGroup && (
      <GroupDialog
        group={openGroup}
        onClose={() => setOpenGroup(null)}
        onRemove={() => removeGroup(openGroup)}
      />
    )}
  </div>;
}
