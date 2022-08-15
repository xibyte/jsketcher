import {state, StateStream} from "lstream";
import {ApplicationContext} from "cad/context";
import {MShell} from "../model/mshell";
import {LocationDialog} from "./LocationDialog";

export function activate(ctx: ApplicationContext) {

  ctx.domService.contributeComponent(LocationDialog);

  const editLocationRequest$ = state(null);

  ctx.locationService = {
    editLocationRequest$,

    edit: shell => {
      editLocationRequest$.next({
        shell
      })
    }
  };
}


export interface EditLocationRequest {

  shell: MShell;

}

export interface LocationService {

  editLocationRequest$: StateStream<EditLocationRequest>;

  edit(shell);

}

export interface LocationBundleContext {

  locationService: LocationService;
}

export const BundleName = "@Location";