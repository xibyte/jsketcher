export class ProductionInfo {
  
  role = undefined;
  originatedFromPrimitive = undefined;
  
  static fromRawData(rawProductionInfo) {
    let info = new ProductionInfo();
    
    function collectProductionInfo(rawInfo) {
      Object.keys(info).forEach(attr => {
        if (info[attr] === undefined && rawInfo[attr] !== undefined) {
          info[attr] = rawInfo[attr]
        }
      });
      if (rawInfo.derived) {
        rawInfo.derived.forEach(d => collectProductionInfo(d));
      }
    }
    collectProductionInfo(rawProductionInfo);
    return info;
  }
  
}