import React from 'react';
import {useStream} from 'ui/effects';
import {state} from 'lstream';
import {Scope} from "../../../sketcher/components/Scope";

const CONTRIBUTED_COMPONENTS$ = state([]);

export function ContributedComponents() {
  const contrib = useStream(CONTRIBUTED_COMPONENTS$);
  return contrib.map((Comp, i) => <Scope key={i}><Comp /></Scope> );
}

export function contributeComponent(comp) {
  CONTRIBUTED_COMPONENTS$.update(contrib => [...contrib, comp]);
}