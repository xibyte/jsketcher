import {FACE, SHELL} from '../../model/entities';
import {memoize} from "lodash/function";
import {Types} from "cad/craft/schema/types";
import {OperationRequest} from "cad/craft/craftPlugin";
import {FlattenPath, ParamsPath, WizardContext} from "cad/craft/wizard/wizardTypes";
import {OperationParamValue, SchemaField} from "cad/craft/schema/schema";
import {EntityReference, SchemaIndexField} from "cad/craft/operationPlugin";

export function activate(ctx) {
  ctx.streams.wizard.wizardContext.attach((wizCtx: WizardContext) => {
    ctx.services.marker.clear();
    if (wizCtx) {
      const wizardPickHandler = createPickHandlerFromSchema(wizCtx);
      ctx.services.pickControl.setPickHandler(wizardPickHandler);
      wizCtx.workingRequest$.attach(({type, params}: OperationRequest) => {
        const marker = ctx.services.marker;
        marker.startSession();
        let {schemaIndex} = wizCtx.operation;
        schemaIndex.entities.forEach(entityRef => {
          //TODO: move to uiDefinition
          let color = entityRef.metadata.markColor;

          let val = wizCtx.readParam(entityRef.field.path);

          if (Array.isArray(val)) {
            val.forEach(id => marker.mark(id, color));
          } else {
            if (val) {
              marker.mark(val, color);
            }
          }
        });
        marker.commit();
      });

    } else {
      ctx.services.pickControl.setPickHandler(null);
    }
  });
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

const getEntityParams = memoize(schema => Object.keys(schema).filter(key => schema[key].type === 'entity'));

function createPickHandlerFromSchema(wizCtx: WizardContext) {

  function update(param: ParamsPath, value: OperationParamValue, paramToMakeActive: FlattenPath) {
    wizCtx.updateParam(param, value);
    wizCtx.updateState(state => {
      state.activeParam = paramToMakeActive;
    });
  }
  return model => {
    const modelType = model.TYPE;

    let {schemaIndex} = wizCtx.operation;
    let activeEntityRef = () => {
      const state = wizCtx.state$.value;
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
      const currentValue = wizCtx.readParam(param.path);
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
        const val = wizCtx.readParam(entityRef.field.path);
        if (val === id) {
          update(entityRef.field.path, undefined, entityRef.field.flattenedPath);
          return true;
        } else if (Array.isArray(val)) {
          let index = val.indexOf(id);
          if (index !== -1) {
            update(entityRef.field.path, val.splice(index, 1), entityRef.field.flattenedPath);
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

