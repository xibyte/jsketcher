import {roundValueForPresentation as r} from 'cad/craft/operationHelper';
import {ApplicationContext} from "cad/context";
import {OperationDescriptor} from "cad/craft/operationBundle";
import {abSegmentsToDigraph} from "./pathFinderLogic/js/sided_ab_graphs/digraph_ab_builder"
import {
  findShortestPathForAllPairsAsync,
  simpleArrayToPointPairs
} from "./pathFinderLogic/js/sided_ab_graphs/digraph_ab_pairs_analyser"


interface autoRouteParams {
  thickness: number;
}


export const AutoRouteOperation: OperationDescriptor<autoRouteParams> = {
  id: 'RE_AUTO_ROUTE',
  label: 'AUTO ROUTE',
  icon: 'img/cad/autoRoute',
  info: 'Auto Routing tool',
  path: __dirname,
  paramsInfo: ({ thickness, }) => `(${r(thickness)}  )`,
  run: async (params: autoRouteParams, ctx: ApplicationContext) => {

    const occ = ctx.occService;
    const oci = occ.commandInterface;


    //place code here to retrieve list of roughing splines from the model.
    const segments = [
      { "id": "seg1", "firstPoint": "p1", "firstSide": "A", "secondPoint": "p2", "secondSide": "A", "weight": 8 },
      { "id": "seg2", "firstPoint": "p1", "firstSide": "B", "secondPoint": "p3", "secondSide": "A", "weight": 2 },
      { "id": "seg3", "firstPoint": "p1", "firstSide": "B", "secondPoint": "p2", "secondSide": "A", "weight": 3 },
      { "id": "seg11", "firstPoint": "p1", "firstSide": "A", "secondPoint": "p5", "secondSide": "A", "weight": 10.1 },
      { "id": "seg12", "firstPoint": "p1", "firstSide": "A", "secondPoint": "p5", "secondSide": "B", "weight": 10.1 },
      { "id": "seg21", "firstPoint": "p2", "firstSide": "B", "secondPoint": "p3", "secondSide": "B", "weight": 15 },
      { "id": "otherSeg1", "firstPoint": "other1", "firstSide": "A", "secondPoint": "other2", "secondSide": "B", "weight": 115 }
    ];


    const connections = [
      { id: "WIRE1", startPoint: "p1", endPoint: "p2", wireInfo: { diameter: 2 } },
      { id: "WIRE2", startPoint: "p2", endPoint: "p3", wireInfo: { diameter: 5 } },
      { id: "WIRE4", startPoint: "p2", endPoint: "p3", wireInfo: { diameter: 5 } },
      { id: "WIRE6", startPoint: "p2", endPoint: "p3", wireInfo: { diameter: 5 } },
    ];


    const report = await sidedAdPairsResolve(segments, connections, false, "error", "timing", "");


    const segmentResults = [];

    for (const wire of report) {
      // ...use `element`...
      //console.log(wire);

      for (const segment of wire.route.segments) {
        // ...use `element`...
        //console.log(segment);
        if (segmentResults[segment] == undefined) segmentResults[segment] = [];
        segmentResults[segment].push(wire);
      }
    }

    console.log(report, segmentResults);
    //alert(JSON.stringify(report, null, 2));

    return {
      created: [],
      consumed: []
    };

  },


  form: [
    {
      type: 'number',
      label: 'Thickness',
      name: 'thickness',
      defaultValue: 1,
    },
  ],
}



async function sidedAdPairsResolve(segmentsJson, connections, brief, errorElementId, timingElementId, progressBarId) {
  const t0 = performance.now();
  const digraph = abSegmentsToDigraph(segmentsJson);
  let pointPairs = simpleArrayToPointPairs(connections);
  console.log(pointPairs);
  const t1 = performance.now();
  await findShortestPathForAllPairsAsync(digraph, pointPairs, progressBarId == null ? null : part => {
    //document.getElementById(progressBarId).value = Math.round(part * 100)
  });
  // - note: without "await" we will have now non-processed pointPairs!
  const t2 = performance.now();
  const timing = "Executing: " + (t2 - t0) + " ms = "
    + (t1 - t0) + " + " + (t2 - t1) + " for "
    + pointPairs.length + " pairs from " + digraph.getNumberOfNodes() + " nodes, "
    + ((t2 - t1) / pointPairs.length) + " ms/pair<br>&nbsp;";
  //document.getElementById(timingElementId).innerHTML = timing;
  if (brief) {
    pointPairs = pointPairs.map(pair => pair.briefClone())
  }
  return pointPairs;
}