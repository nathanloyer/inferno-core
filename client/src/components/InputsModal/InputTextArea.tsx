import { ListItem, TextField } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { TestInput } from 'models/testSuiteModels';
import React, { FC, Fragment } from 'react';
import useStyles from './styles';

export interface InputTextAreaProps {
  requirement: TestInput;
  index: number;
  inputsMap: Map<string, unknown>;
  setInputsMap: (map: Map<string, unknown>) => void;
}

const InputTextArea: FC<InputTextAreaProps> = ({ requirement, index, inputsMap, setInputsMap }) => {
  const styles = useStyles();
  const fieldLabelText = requirement.title || requirement.name;
  const lockedIcon = requirement.locked ? (
    <LockIcon fontSize="small" className={styles.lockedIcon} />
  ) : null;
  const requiredLabel = !requirement.optional && !requirement.locked ? ' (required)' : '';
  const fieldLabel = (
    <Fragment>
      {fieldLabelText}
      {requiredLabel}
      {lockedIcon}
    </Fragment>
  );

  return (
    <ListItem disabled={requirement.locked}>
      <TextField
        disabled={requirement.locked}
        required={!requirement.optional && !requirement.locked}
        id={`requirement${index}_input`}
        className={styles.inputField}
        variant="standard"
        fullWidth
        label={fieldLabel}
        helperText={requirement.description}
        value={inputsMap.get(requirement.name)}
        multiline
        rows={4}
        onChange={(event) => {
          const value = event.target.value;
          inputsMap.set(requirement.name, value);
          setInputsMap(new Map(inputsMap));
        }}
      />
    </ListItem>
  );
};

export default InputTextArea;
