import React, { FC, useEffect } from 'react';
import {
  TestInput,
  RunnableType,
  TestRun,
  Result,
  TestSession,
  TestGroup,
  Test,
  TestSuite,
  Request,
  TestOutput,
} from 'models/testSuiteModels';
import ActionModal from 'components/ActionModal/ActionModal';
import InputsModal from 'components/InputsModal/InputsModal';
import useStyles from './styles';
import TestRunProgressBar from './TestRunProgressBar/TestRunProgressBar';
import TestSuiteTreeComponent from './TestSuiteTree/TestSuiteTree';
import TestSuiteDetailsPanel from './TestSuiteDetails/TestSuiteDetailsPanel';
import TestSuiteReport from './TestSuiteDetails/TestSuiteReport';
import { useLocation } from 'react-router-dom';
import { deleteTestRun, getTestRunWithResults, postTestRun } from 'api/TestRunsApi';
import { Drawer, Toolbar, Box } from '@mui/material';

function mapRunnableRecursive(
  testGroup: TestGroup,
  map: Map<string, TestSuite | TestGroup | Test>
) {
  map.set(testGroup.id, testGroup);
  testGroup.test_groups.forEach((subGroup: TestGroup) => {
    mapRunnableRecursive(subGroup, map);
  });
  testGroup.tests.forEach((test: Test) => {
    map.set(test.id, test);
  });
}

function mapRunnableToId(testSuite: TestSuite): Map<string, TestSuite | TestGroup | Test> {
  const map = new Map<string, TestSuite | TestGroup | Test>();
  map.set(testSuite.id, testSuite);
  testSuite?.test_groups?.forEach((testGroup: TestGroup) => {
    mapRunnableRecursive(testGroup, map);
  });
  return map;
}

function resultsToMap(results: Result[], map?: Map<string, Result>): Map<string, Result> {
  let resultsMap: Map<string, Result>;
  if (map == undefined) {
    resultsMap = new Map<string, Result>();
  } else {
    resultsMap = map;
  }
  results.forEach((result: Result) => {
    if (result.test_suite_id) {
      resultsMap.set(result.test_suite_id, result);
    } else if (result.test_group_id) {
      resultsMap.set(result.test_group_id, result);
    } else if (result.test_id) {
      resultsMap.set(result.test_id, result);
    }
  });
  return new Map(resultsMap);
}

export interface TestSessionComponentProps {
  testSession: TestSession;
  previousResults: Result[];
  initialTestRun: TestRun | null;
  sessionData: Map<string, unknown>;
  setSessionData: (data: Map<string, unknown>) => void;
}

const TestSessionComponent: FC<TestSessionComponentProps> = ({
  testSession,
  previousResults,
  initialTestRun,
  sessionData,
  setSessionData,
}) => {
  const styles = useStyles();
  const { test_suite, id } = testSession;
  const [inputModalVisible, setInputModalVisible] = React.useState(false);
  const [waitingTestId, setWaitingTestId] = React.useState<string | null>();
  const [inputs, setInputs] = React.useState<TestInput[]>([]);
  const [runnableType, setRunnableType] = React.useState<RunnableType>(RunnableType.TestSuite);
  const [runnableId, setRunnableId] = React.useState<string>('');
  const [resultsMap, setResultsMap] = React.useState<Map<string, Result>>(
    resultsToMap(previousResults)
  );
  const [testRun, setTestRun] = React.useState<TestRun | null>(null);
  const [showProgressBar, setShowProgressBar] = React.useState<boolean>(false);

  useEffect(() => {
    test_suite.inputs?.forEach((input: TestInput) => {
      const defaultValue = input.default || '';
      sessionData.set(input.name, sessionData.get(input.name) || defaultValue);
    });
    setSessionData(new Map(sessionData));
  }, [testSession]);

  if (!testRun && initialTestRun) {
    setTestRun(initialTestRun);
    if (testRunNeedsProgressBar(initialTestRun)) {
      setShowProgressBar(true);
      pollTestRunResults(initialTestRun);
    }
  }

  useEffect(() => {
    let waitingTestId = null;
    if (testRun?.status === 'waiting') {
      resultsMap.forEach((result) => {
        if (result.test_id && result.result === 'wait') {
          waitingTestId = result.test_id;
        }
      });
    }

    setWaitingTestId(waitingTestId);
  }, [resultsMap]);

  const runnableMap = React.useMemo(() => mapRunnableToId(test_suite), [test_suite]);
  const location = useLocation();
  const locationHashParts = location.hash.replace('#', '').split('/');
  let [selectedRunnable] = locationHashParts;
  const [, testView] = locationHashParts;

  if (!runnableMap.get(selectedRunnable)) {
    selectedRunnable = testSession.test_suite.id;
  }

  // limit to 'run' and 'report' views
  // using this somewhat awkward form to satisfy TypeScript
  const view = testView === 'report' ? 'report' : 'run';

  function showInputsModal(runnableType: RunnableType, runnableId: string, inputs: TestInput[]) {
    setInputs(inputs);
    setRunnableType(runnableType);
    setRunnableId(runnableId);
    setInputModalVisible(true);
  }

  function latestResult(results: Result[] | null | undefined): Result | null {
    if (!results) {
      return null;
    }
    return results.reduce((lastResult, result) => {
      return Date.parse(result.updated_at) > Date.parse(lastResult.updated_at)
        ? result
        : lastResult;
    }, results[0]);
  }

  function pollTestRunResults(testRun: TestRun): void {
    getTestRunWithResults(testRun.id, latestResult(testRun.results)?.updated_at)
      .then((testRunResults: TestRun | null) => {
        setTestRun(testRunResults);
        if (testRunResults?.results) {
          testRunResults.results.forEach((result: Result) => {
            const outputs: TestOutput[] = result.outputs;
            outputs.forEach((output: TestOutput) => {
              if (output.value) {
                sessionData.set(output.name, output.value);
              }
            });
          });
          setSessionData(new Map(sessionData));
          const updatedMap = resultsToMap(testRunResults.results, resultsMap);
          setResultsMap(updatedMap);
        }
        if (testRunResults && testRunNeedsProgressBar(testRunResults)) {
          setTimeout(() => pollTestRunResults(testRunResults), 500);
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function updateRequest(requestId: string, resultId: string, request: Request): void {
    const result = Array.from(resultsMap.values()).find((result) => result.id == resultId);
    if (result && result.requests) {
      const requestIndex = result.requests.findIndex((request) => request.id == requestId);
      result.requests[requestIndex] = request;
      setResultsMap(new Map(resultsMap));
    }
  }

  resultsMap.forEach((result, runnableId) => {
    const runnable = runnableMap.get(runnableId);
    if (runnable) {
      runnable.result = result;
    }
  });

  function runTests(runnableType: RunnableType, runnableId: string) {
    const runnable = runnableMap.get(runnableId);
    runnable?.inputs?.forEach((input: TestInput) => {
      input.value = sessionData.get(input.name);
    });
    if (runnable?.inputs && runnable.inputs.length > 0) {
      showInputsModal(runnableType, runnableId, runnable.inputs);
    } else {
      createTestRun(runnableType, runnableId, []);
    }
  }

  function createTestRun(runnableType: RunnableType, runnableId: string, inputs: TestInput[]) {
    inputs.forEach((input: TestInput) => {
      sessionData.set(input.name, input.value as string);
    });
    setSessionData(new Map(sessionData));
    postTestRun(id, runnableType, runnableId, inputs)
      .then((testRun: TestRun | null) => {
        if (testRun) {
          setTestRun(testRun);
          setShowProgressBar(true);
          pollTestRunResults(testRun);
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }

  function testRunNeedsProgressBar(testRun: TestRun | null): boolean {
    return testRun?.status
      ? ['running', 'queued', 'waiting', 'cancelling'].includes(testRun?.status)
      : false;
  }

  function testRunProgressBar() {
    const duration = testRunNeedsProgressBar(testRun) ? null : 2000;
    return (
      <TestRunProgressBar
        showProgressBar={showProgressBar}
        setShowProgressBar={setShowProgressBar}
        cancelTestRun={() => {
          testRun && deleteTestRun(testRun.id);
        }}
        duration={duration}
        testRun={testRun}
        resultsMap={resultsMap}
      />
    );
  }

  return (
    <Box className={styles.testSuiteMain}>
      {testRunProgressBar()}
      <Drawer
        variant="permanent"
        anchor="left"
        className={styles.drawer}
        classes={{ paper: styles.drawerPaper }}
      >
        <TestSuiteTreeComponent
          testSuite={test_suite}
          runTests={runTests}
          selectedRunnable={selectedRunnable}
          testRunInProgress={testRunNeedsProgressBar(testRun)}
          view={view}
        />
      </Drawer>
      <Box className={styles.contentContainer}>
        <Toolbar className={styles.spacerToolbar} />
        {runnableMap.get(selectedRunnable) &&
          (testView == 'report' ? (
            // This is a little strange because we are only allowing reports
            // at the suite level right now for simplicity.
            <TestSuiteReport testSuite={runnableMap.get(selectedRunnable) as TestSuite} />
          ) : (
            <TestSuiteDetailsPanel
              runnable={runnableMap.get(selectedRunnable) as TestSuite | TestGroup}
              runTests={runTests}
              updateRequest={updateRequest}
              testRunInProgress={testRunNeedsProgressBar(testRun)}
            />
          ))}
        <InputsModal
          hideModal={() => setInputModalVisible(false)}
          createTestRun={createTestRun}
          modalVisible={inputModalVisible}
          runnableType={runnableType}
          runnableId={runnableId}
          title={(runnableMap.get(selectedRunnable) as TestSuite | TestGroup | Test).title}
          inputInstructions={
            (runnableMap.get(selectedRunnable) as TestSuite | TestGroup | Test).input_instructions
          }
          inputs={inputs}
          sessionData={sessionData}
        />
        <ActionModal
          cancelTestRun={() => {
            testRun && deleteTestRun(testRun.id);
          }}
          message={waitingTestId ? resultsMap.get(waitingTestId)?.result_message : ''}
          modalVisible={waitingTestId != null}
        />
      </Box>
    </Box>
  );
};

export default TestSessionComponent;
