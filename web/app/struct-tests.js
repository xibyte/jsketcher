TCAD.struct.tests = {};

TCAD.struct.tests.testHashTable = function() {

  var map = new TCAD.struct.HashTable(TCAD.struct.stringEq, TCAD.struct.stringHash);
  map.put("John", "Doe");
  map.put("Patric", "Kane");
  map.put("Andrew", "Wozniak");
  
  console.log(map.get("John"));
  console.log(map.get("Patric"));
  console.log(map.get("Andrew"));
  
};

