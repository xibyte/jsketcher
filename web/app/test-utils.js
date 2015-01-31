
function _test_utils_msg(msg) {
  return (msg === undefined ? "" : "\n" + msg);
}

function assert(statement, msg) {
  if (!statement) {
    throw "ASSERTION ERROR." + _test_utils_msg(msg) ;
  }
}

function assertEQ(expected, actual, msg) {
  if ( expected !== actual ) {
    throw "ASSERTION ERROR. \n Expected: " + a + ", Actual: " + b + _test_utils_msg(msg) ;
  }
}