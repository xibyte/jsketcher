import {Vec3} from "math/vec";


export function OCCModellingEngine(commandFn: Function) {

  const call = (commandName: string, data: any) => commandFn(commandName, data);

  return {
    topo: {

      makeSegmentEdge: (request: {
        name: string
        a: Vec3,
        b: Vec3,
      }) => call('makeSegmentEdge', request)
    }
  }

}