import { useEffect, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Alert, Button } from '@openedx/paragon';
import { Download } from '@openedx/paragon/icons';

import { downloadCsv } from '../data/api';
import messages from '../messages';

const CsvDownloadButton = ({ csvUrl, filename }: { csvUrl: string; filename: string; }) => {
  const intl = useIntl();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  // A failure belongs to the selection that produced it; changing course or learning path clears it.
  useEffect(() => {
    setFailed(false);
  }, [csvUrl]);

  const onClick = () => {
    setBusy(true);
    setFailed(false);
    downloadCsv(csvUrl, filename)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        iconBefore={Download}
        onClick={onClick}
        disabled={busy}
        className="ml-auto"
      >
        {intl.formatMessage(messages.downloadCsv)}
      </Button>
      {failed && (
        <Alert variant="danger" className="w-100 mt-2 mb-0">
          {intl.formatMessage(messages.downloadFailed)}
        </Alert>
      )}
    </>
  );
};

export default CsvDownloadButton;
