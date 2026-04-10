import React, {useState, useEffect} from 'react';
import {useStream} from "ui/effects";
import {SceneInlineSection} from "ui/components/SceneInlineSection";
import {EntityTreeNode} from "surfacing/models/EntityTreeNode";
import {MSurfacingScene} from "surfacing/models/MSurfacingScene";

export function SceneInlineObjectExplorer() {

  const models = useStream(ctx => ctx.craftService.models$);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener('patch-cage-constraints-changed', handler);
    return () => document.removeEventListener('patch-cage-constraints-changed', handler);
  }, []);

  if (!models) {
    return null;
  }

  // Collect all MSurfacingScene models and refresh their entity graphs
  const scenes: MSurfacingScene[] = models.filter(
    (m): m is MSurfacingScene => m instanceof MSurfacingScene
  );

  // Refresh scene entities to reflect latest cage state
  for (const s of scenes) {
    s.refreshSceneEntity();
  }

  // Flatten: show direct children of each scene (Groups / Surfaces) at top level
  const topLevelEntities = scenes.flatMap(s => s.scene.children);

  return <SceneInlineSection title='OBJECTS'>
    {topLevelEntities.map((entity, i) =>
      <EntityTreeNode key={entity.id + '-' + i} entity={entity} />
    )}
  </SceneInlineSection>;
}
