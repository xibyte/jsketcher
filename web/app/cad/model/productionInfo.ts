export class ProductionInfo {
  
  role: string = undefined;
  originatedFromPrimitive: string = undefined;

  static fromRawData(rawProductionInfo) {
    const info = new ProductionInfo();
    
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