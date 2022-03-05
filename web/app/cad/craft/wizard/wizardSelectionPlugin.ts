import {FACE, SHELL} from 'cad/model/entities';
import {OperationRequest} from "cad/craft/craftPlugin";
import {FlattenPath, ParamsPath, WizardService} from "cad/craft/wizard/wizardTypes";
import {OperationParamValue} from "cad/craft/schema/schema";
import {EntityReference} from "cad/craft/operationPlugin";
import {ContextSpec, Plugin, Spec} from "plugable/pluginSystem";
import {MarkerPluginContext} from "cad/scene/selectionMarker/markerPlugin";
import {WizardPluginContext} from "cad/craft/wizard/wizardPlugin";
import {PickControlPluginContext} from "cad/scene/controls/pickControlPlugin";

export type WizardSelectionPluginInputContext = MarkerPluginContext & WizardPluginContext & PickControlPluginContext;

export interface WizardSelectionPluginContext {
}

export type WizardSelectionWorkingContext = WizardSelectionPluginInputContext & WizardSelectionPluginContext;

export const WizardSelectionPlugin: Plugin<WizardSelectionPluginInputContext, WizardSelectionPluginContext, WizardSelectionWorkingContext> = {

  inputContextSpec: {
    markerService: 'required',
    pickControlService: 'required',
    wizardService: 'required'
  },

  outputContextSpec: {
  },

  activate(ctx: WizardSelectionWorkingContext) {
    const wizardService = ctx.wizardService;
    wizardService.workingRequest$.attach((opRequest: OperationRequest) => {
      ctx.markerService.clear();
      if (opRequest) {
        const wizardPickHandler = createPickHandlerFromSchema(wizardService);
        ctx.pickControlService.setPickHandler(wizardPickHandler);
        const marker = ctx.markerService;
        marker.startSession();
        let {schemaIndex} = wizardService.operation;
        schemaIndex.entities.forEach(entityRef => {
          //TODO: move to uiDefinition
          let color = entityRef.metadata.markColor;

          let val = wizardService.readParam(entityRef.field.path);

          if (Array.isArray(val)) {
            val.forEach(id => marker.mark(id, color));
          } else {
            if (val) {
              marker.mark(val, color);
            }
          }
        });
        marker.commit();

      } else {
        ctx.pickControlService.setPickHandler(null);
      }
    });
  },

}


const singleValue = (id, current) =>  id;
const arrayValue = (id, arr) =>  {
  if (!arr) {
    return [id];
  } 
  if (arr.indexOf(id) === -1) {
    arr.push(id);
  }
  return arr;
};

function createPickHandlerFromSchema(wizardService: WizardService) {

  function update(param: ParamsPath, value: OperationParamValue, paramToMakeActive: FlattenPath) {
    wizardService.updateParam(param, value);
    wizardService.updateState(state => {
      state.activeParam = paramToMakeActive;
    });
  }
  return model => {
    const modelType = model.TYPE;

    let {schemaIndex} = wizardService.operation;
    let activeEntityRef = () => {
      const state = wizardService.state$.value;
      return schemaIndex.entitiesByFlattenedPaths[state.activeParam];
    }


    function activeCanTakeIt(kind) {
      let activeRef: EntityReference = activeEntityRef();
      if (!activeRef) {
        return false;
      }
      const activeMd = activeRef?.metadata;
      return activeMd && activeMd.allowedKinds.includes(kind);
    }

    function select(entityRef: EntityReference, id: string) {
      const param = entityRef.field;
      const valueGetter = entityRef.isArray ? arrayValue : singleValue;
      let paramToMakeActive = getNextActiveParam(entityRef);
      const currentValue = wizardService.readParam(param.path);
      update(param.path, valueGetter(id, currentValue), paramToMakeActive.field.flattenedPath);
    }

    function getNextActiveParam(entityRef: EntityReference): EntityReference {
      if (!entityRef.isArray) {
        const index = schemaIndex.entities.indexOf(entityRef);
        const nextIndex = (index + 1) % schemaIndex.entities.length;
        return schemaIndex.entities[nextIndex];
      }
      return entityRef;
    }
    
    function selectActive(id: string) {
      select(activeEntityRef(),  id);
    }

    function selectToFirst(entity, id) {
      for (let eRef of schemaIndex.entities) {
        if (eRef.metadata.allowedKinds.includes(entity)) {
          select(eRef, id);
        }
      }
      return true;
    }

    function deselectIfNeeded(id) {
      for (let entityRef of schemaIndex.entities) {
        let val = wizardService.readParam(entityRef.field.path);
        if (val === id) {
          update(entityRef.field.path, undefined, entityRef.field.flattenedPath);
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            val = val.slice(index, 1);
            update(entityRef.field.path, val, entityRef.field.flattenedPath);
            return true;
          }
        }
      }
    }

    if (deselectIfNeeded(model.id)) {
      return false;
    } else if (model.shell) {
      if (deselectIfNeeded(model.shell.id)) {
        return false;
      }
    }
    
    if (modelType === FACE) {
      if (activeCanTakeIt(SHELL)) {
        selectActive(model.shell.id);
      } else if (activeCanTakeIt(FACE)) {
        selectActive(model.id);
      } else {
        if (!selectToFirst(FACE, model.id)) {
          selectToFirst(SHELL, model.shell.id)
        }
      }
    } else{
      if (activeCanTakeIt(modelType)) {
        selectActive(model.id);
      } else {
        selectToFirst(modelType, model.id);
      }
    }
    return false;
  };
}

