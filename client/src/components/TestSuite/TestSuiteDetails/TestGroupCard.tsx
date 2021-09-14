import React, { FC } from 'react';
import useStyles from './styles';
import { TestGroup, RunnableType, TestSuite, runnableIsTestSuite } from 'models/testSuiteModels';
import { Card, IconButton, List } from '@material-ui/core';
import ResultIcon from './ResultIcon';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';

interface TestGroupCardProps {
  runnable: TestSuite | TestGroup;
  runTests: (runnableType: RunnableType, runnableId: string) => void;
}

const TestGroupCard: FC<TestGroupCardProps> = ({ runnable, runTests, children }) => {
  const styles = useStyles();

  const runnableType = 'tests' in runnable ? RunnableType.TestGroup : RunnableType.TestSuite;
  const showRunButton =
    runnableIsTestSuite(runnable) || (runnable as TestGroup).user_runnable;
  const runButton = showRunButton ? (
    <IconButton
      edge="end"
      size="small"
      onClick={() => {
        runTests(runnableType, runnable.id);
      }}
      data-testid={`${runnable.id}-run-button`}
    >
      <PlayArrowIcon />
    </IconButton>
  ) : null;
  return (
    <Card className={styles.testGroupCard} variant="outlined">
      <div className={styles.testGroupCardHeader}>
        <span className={styles.testGroupCardHeaderResult}>
          <ResultIcon result={runnable.result} />
        </span>
        <span className={styles.testGroupCardHeaderText}>{runnable.title}</span>
        {runButton}
      </div>
      <List className={styles.testGroupCardList}>{children}</List>
    </Card>
  );
};

export default TestGroupCard;
