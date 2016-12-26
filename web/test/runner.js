import './runner.less'
import TestList from './tmpl/test-list.html'
import '../app/utils/jqueryfy'
import suites from './suites'
import {Menu} from './menu'
import {TestEnv} from './test'
import DurationFormat from './utils/duration-format'


$(() => {
  const runBtn = $('#run-button');
  const pauseBtn = $('#pause-button');

  disableBtn(pauseBtn);

  runBtn.click(() => {
    run();
    //disableBtn(runBtn);
    //enableBtn(pauseBtn);
  });

  pauseBtn.click(() => {
    disableBtn(pauseBtn);
    enableBtn(runBtn);
  });
  $('#test-list').html(TestList({suites}));
  new Menu(ACTIONS);
});

const queue = [];
let running = false;

function scheduleSuite(name) {
  const testCases = suites[name];
  for (let testCase of testCases) {
    scheduleTestCase(testCase, name + ':' +testCase.name);
  }
  //updateIcon($('#suite-' + name), success);
}

function scheduleTestCase(testCase, caseId) {
  testCase.tests.forEach(test => scheduleTest(test, caseId + ':' + test.name));
  //updateIcon($('#case-' + caseId.replace(/:/g, '-')), success);
}

function scheduleTest(test, id) {
  queue.push({
      id,
      func: test
    });
}

function pokeQueue() {
  if (running) return;
  //let ui refresh
  setTimeout(() => {
    if (queue.length != 0) {
      const test = queue.shift();
      running = true;
      runTest(test.func, test.id, (testSuccess) => {
        running = false;
        pokeQueue();
      });
    }
  });
}

function runTest(test, testId, callback) {
  let testDom = $('#test-' + testId.replace(/:/g, '-'));
  testDom.find('.status').hide();
  testDom.find('.progress').show();
  const env = new TestEnv((env) => {
    testDom.find('.progress').hide();
    testDom.find('.status').show();
    let success = env.finished && !env.failed;
    updateIcon(testDom, success);
    let result = 'took: ' + DurationFormat(env.took);
    if (env.error) {
      result += ' ' + env.error;
    }
    testDom.find('.result').html(result);
    callback(success);
  });
  test(env);
}

function run() {
  queue.length = 0;
  for (let suite of Object.keys(suites)) {
    scheduleSuite(suite);
  }
  pokeQueue();
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
    invoke: (target) => {
      queue.length = 0;
      scheduleSuite(target.data('suiteName'));
      pokeQueue();
    }
  },
  
  RunTestCase: {
    label: "Run Test Case",
    invoke: (target) => {
      var testCaseIdStr = target.data('testCaseId');
      const testCaseId = testCaseIdStr.split(':');
      queue.length = 0;
      scheduleTestCase(findTestCaseById(testCaseId), testCaseIdStr);
      pokeQueue();
    }
  },
  
  RunTest: {
    label: "Run Test",
    invoke: (target) => {
      var testIdStr = target.data('testId');
      const testId = testIdStr.split(':');
      queue.length = 0;
      scheduleTest(findTestById(testId), testIdStr);
      pokeQueue();
    }
  }
};
