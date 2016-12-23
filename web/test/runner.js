import './runner.less'
import TestList from './tmpl/test-list.html'
import '../app/utils/jqueryfy'
import suites from './suites'
import {Menu} from './menu'
import {AssertionError} from './test'

$(() => {
  const runBtn = $('#run-button');
  const pauseBtn = $('#pause-button');

  disableBtn(pauseBtn);

  runBtn.click(() => {
    run();
    disableBtn(runBtn);
    enableBtn(pauseBtn);
  });

  pauseBtn.click(() => {
    disableBtn(pauseBtn);
    enableBtn(runBtn);
  });
  console.log(suites);
  $('#test-list').html(TestList({suites}));
  new Menu(ACTIONS);
});


function runSuite(name) {
  const testCases = suites[name];
  let success = true;
  for (let testCase of testCases) {
    if (!runTestCase(testCase, name + ':' +testCase.name)) {
      success = false;
    }
  }
  updateIcon($('#suite-' + name), success);
}

function runTestCase(testCase, caseId) {
  let success = true;
  for (let test of testCase.tests) {
    if (!runTest(test, caseId + ':' + test.name)) {
      success = false;
    }
  }
  updateIcon($('#case-' + caseId.replace(/:/g, '-')), success);
}

function runTest(test, testId) {
  let success = true;
  let testDom = $('#test-' + testId.replace(/:/g, '-'));
  testDom.find('.status').hide();
  testDom.find('.progress').show();
  try {
    test();
  } catch (e) {
    success = false;
    if (e instanceof AssertionError) {
      testDom.find('.result').text(e.msg);
    }
  }
  testDom.find('.progress').hide();
  testDom.find('.status').show();
  updateIcon(testDom, success);
  return success;
}

function run() {
  for (let suite of Object.keys(suites)) {
    runSuite(suite);
  }
}

function pause() {

}


function updateIcon(dom, success) {
  dom.find('.status').addClass(success ? 'status-success' : 'status-fail');
}

function findTestCaseById(id) {
  const suite = suites[id[0]];
  return suite.filter(tc => tc.name == id[1])[0];
}

function findTestById(id) {
  const testCase = findTestCaseById(id);
  return testCase.tests.filter(t => t.name == id[2])[0];
}

function disableBtn(btn) {
  btn.attr('disabled', 'disabled');
}

function enableBtn(btn) {
  btn.removeAttr('disabled');
}


const ACTIONS = {
  RunSuite: {
    label: "Run Suite",
    invoke: (target) => runSuite(target.data('suiteName'))
  },
  
  RunTestCase: {
    label: "Run Test Case",
    invoke: (target) => {
      var testCaseIdStr = target.data('testCaseId');
      const testCaseId = testCaseIdStr.split(':');
      runTestCase(findTestCaseById(testCaseId), testCaseIdStr);
    }
  },
  
  RunTest: {
    label: "Run Test",
    invoke: (target) => {
      var testIdStr = target.data('testId');
      const testId = testIdStr.split(':');
      runTest(findTestById(testId), testIdStr)
    }
  }
};
