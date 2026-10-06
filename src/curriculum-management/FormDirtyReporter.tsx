import { useEffect } from 'react';

interface FormDirtyReporterProps {
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

/** Rendered inside a Formik render-prop; reports `dirty` up and resets it when the form unmounts. */
const FormDirtyReporter = ({ dirty, onDirtyChange }: FormDirtyReporterProps) => {
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty]);
  useEffect(() => () => onDirtyChange(false), []);
  return null;
};

export default FormDirtyReporter;
