export default function datumConsumingOperation(params, services, run) {
  let mDatum = params.datum && services.cadRegistry.findDatum(params.datum);
  let res = run(mDatum.csys);
  if (mDatum) {
    res.outdated.push(mDatum);
  }
  return res;
}