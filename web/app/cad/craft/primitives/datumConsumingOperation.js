import CSys from 'math/csys';

export default function datumConsumingOperation(params, services, run) {
  let mDatum = params.datum && services.cadRegistry.findDatum(params.datum);
  let res = run(mDatum ? mDatum.csys : CSys.ORIGIN);
  if (mDatum) {
    res.consumed.push(mDatum);
  }
  return res;
}