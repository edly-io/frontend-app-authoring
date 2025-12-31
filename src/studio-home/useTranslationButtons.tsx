import { useCallback, useState, useContext } from 'react';
import { Button } from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';

import { ToastContext } from '../generic/toast-context';
import messages from './messages';

const getApiBaseUrl = () => getConfig().STUDIO_BASE_URL;

interface UseTranslationButtonsProps {
  courseBlocksSendFetchUrl?: string;
  showMetaApiButtons?: boolean;
}

/**
 * Custom hook for managing translation API buttons (send and fetch)
 * Returns an array of button JSX elements to be added to the header
 */
export const useTranslationButtons = ({
  courseBlocksSendFetchUrl,
  showMetaApiButtons,
}: UseTranslationButtonsProps): JSX.Element[] => {
  const intl = useIntl();
  const { showToast, closeToast } = useContext(ToastContext);
  
  // State for managing button disabled state during API calls
  const [isSendingTranslations, setIsSendingTranslations] = useState(false);
  const [isFetchingTranslations, setIsFetchingTranslations] = useState(false);

  // Handler for sending translations
  const handleSendTranslations = useCallback(async () => {
    if (!courseBlocksSendFetchUrl || isSendingTranslations) {
      return;
    }

    setIsSendingTranslations(true);
    const message = intl.formatMessage(messages.sendingTranslationsMessage);
    showToast(message);

    try {
      // Convert relative URL to full URL using STUDIO_BASE_URL
      const fullUrl = new URL(courseBlocksSendFetchUrl, getApiBaseUrl()).href;
      await getAuthenticatedHttpClient().post(
        fullUrl,
        { action: 'send' },
      );
    } catch (error) {
      // Error handling - toast will be closed on success, but we should handle errors
      console.error('Error sending translations:', error);
    } finally {
      setIsSendingTranslations(false);
      closeToast();
    }
  }, [courseBlocksSendFetchUrl, isSendingTranslations, intl, showToast, closeToast]);

  // Handler for fetching translations
  const handleFetchTranslations = useCallback(async () => {
    if (!courseBlocksSendFetchUrl || isFetchingTranslations) {
      return;
    }

    setIsFetchingTranslations(true);
    const message = intl.formatMessage(messages.fetchingTranslationsMessage);
    showToast(message);

    try {
      // Convert relative URL to full URL using STUDIO_BASE_URL
      const fullUrl = new URL(courseBlocksSendFetchUrl, getApiBaseUrl()).href;
      await getAuthenticatedHttpClient().post(
        fullUrl,
        { action: 'fetch' },
      );
    } catch (error) {
      // Error handling - toast will be closed on success, but we should handle errors
      console.error('Error fetching translations:', error);
    } finally {
      setIsFetchingTranslations(false);
      closeToast();
    }
  }, [courseBlocksSendFetchUrl, isFetchingTranslations, intl, showToast, closeToast]);

  // Return buttons array if showMetaApiButtons is true
  if (!showMetaApiButtons) {
    return [];
  }

  return [
    <Button
      key="send-translations"
      variant="primary"
      size="sm"
      disabled={isSendingTranslations}
      onClick={handleSendTranslations}
    >
      {intl.formatMessage(messages.sendTranslationsBtnText)}
    </Button>,
    <Button
      key="fetch-translations"
      variant="primary"
      size="sm"
      disabled={isFetchingTranslations}
      onClick={handleFetchTranslations}
    >
      {intl.formatMessage(messages.fetchTranslationsBtnText)}
    </Button>,
  ];
};

