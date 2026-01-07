import { IntlShape } from '@edx/frontend-platform/i18n';
import messages from './messages';

interface GetDeleteModalDescriptionParams {
  intl: IntlShape;
  category: string;
  isTranslatedOrBaseCourse?: string;
}

export const getDeleteModalDescription = ({
  intl,
  category,
  isTranslatedOrBaseCourse,
}: GetDeleteModalDescriptionParams): JSX.Element | undefined => {
  if (isTranslatedOrBaseCourse === 'BASE') {
    return (
      <>
        {intl.formatMessage(messages.description, { category })}
        <br />
        <br />
        <strong>{intl.formatMessage(messages.translatedRerunNote)}</strong>
      </>
    );
  }

  return undefined;
};

