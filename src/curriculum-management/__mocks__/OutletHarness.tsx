/* istanbul ignore file */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { CurriculumManagementOutletContext, FormTarget } from '../types';

/**
 * Test-only stand-in for ManagementPageLayout: a stateful outlet context.
 * `harness-form-dirty` shows what the open form last reported through `setFormDirty`.
 * Use as `<Routes><Route element={<OutletHarness />}><Route path="*" element={<Page />} /></Route></Routes>`.
 */
const OutletHarness = ({ initialTarget = null }: { initialTarget?: FormTarget; }) => {
  const [formTarget, setFormTarget] = useState<FormTarget>(initialTarget);
  const [formDirty, setFormDirty] = useState(false);
  const context: CurriculumManagementOutletContext = {
    formTarget,
    setFormTarget,
    closeForm: () => setFormTarget(null),
    setFormDirty,
  };
  return (
    <>
      <span data-testid="harness-form-dirty">{String(formDirty)}</span>
      <Outlet context={context} />
    </>
  );
};

export default OutletHarness;
