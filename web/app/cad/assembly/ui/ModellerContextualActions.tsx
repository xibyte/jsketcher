import React, {useContext} from 'react';
import {AppContext} from "../../dom/components/AppContext";
import {useStream} from "ui/effects";
import {Dialog} from "ui/components/Dialog";
import {matchAvailableSubjects, MatchIndex, matchSelection} from "../../../sketcher/selectionMatcher";
import {AssemblyConstraintSchema} from "../assemblyConstraint";
import {AssemblyConstraintsSchemas} from "../assemblySchemas";

export function ModellerContextualActions() {

  const ctx = useContext(AppContext);

  const selection: string[] = useStream(ctx => ctx.streams.selection.all);

  if (!selection || selection.length === 0) {
    return null;
  }

  const entities = selection.map(ctx.cadRegistry.find);

  const allConstraints = Object.values(AssemblyConstraintsSchemas) as AssemblyConstraintSchema[];
  const availableConstraints = matchAvailableSubjects(entities, allConstraints) as AssemblyConstraintSchema[];

  if (availableConstraints.length === 0) {
    return null;
  }

  return <Dialog initRight={50} title='AVAILABLE ACTIONS' onClose={() => {}}>
    {availableConstraints.map( schema => <button key={schema.id}
                                                 onClick={() => {

                                                   const objects = matchSelection(schema.selectionMatcher, new MatchIndex(entities), false);
                                                   ctx.assemblyService.addConstraint(schema.id, objects.map(o => o.id));

                                                 }}>{schema.name}</button> ) }
  </Dialog>;
}
