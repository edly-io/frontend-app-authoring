import { useEffect, useState } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import {
  Button,
  Dropzone,
  Form,
  Image,
} from '@openedx/paragon';

import messages from './messages';

/**
 * Object URL for a picked file, revoked when the file changes or the component unmounts.
 * Exported for callers that need to preview a picked file outside of `ImageField`.
 */
export const useObjectUrl = (file: File | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
};

interface ImageFieldProps {
  /** File picked in the current session; drives the blob URL preview. */
  value: File | null;
  /**
   * Pre-computed existing URL to show when `value` is null.
   * Pass `null` when the caller has set removeImage=true so the preview is hidden.
   */
  existingUrl: string | null;
  onPick: (f: File) => void;
  onRemove: () => void;
  maxBytes: number;
  /** Same shape as react-dropzone's Accept type: `{ 'image/png': ['.png'], … }`. */
  accept: Record<string, string[]>;
  /** Formatted label string rendered above the dropzone. */
  label?: string;
  /** Formatted help text rendered below the dropzone. */
  helpText?: string;
  /** Alt text for the preview image. */
  altText?: string;
  /** Formik field error displayed below the field. */
  error?: string;
  /**
   * Prefix used to generate `id` on the label span, `aria-labelledby` and
   * `data-testid` on the Dropzone.
   * e.g. `"badge-image"` → label id `"badge-image-label"`, testid `"badge-image-dropzone"`.
   */
  fieldId?: string;
}

/**
 * Shared image upload field: Dropzone + preview + Remove button + error.
 * Used by `CurriculumForm` and `BadgeForm`.
 */
const ImageField = ({
  value,
  existingUrl,
  onPick,
  onRemove,
  maxBytes,
  accept,
  label,
  helpText,
  altText = '',
  error,
  fieldId = 'image-field',
}: ImageFieldProps) => {
  const intl = useIntl();
  const previewUrl = useObjectUrl(value);
  const currentUrl = previewUrl ?? existingUrl;
  const labelId = `${fieldId}-label`;

  return (
    <Form.Group isInvalid={!!error}>
      {label && (
        <span className="d-block small font-weight-bold text-gray-700 mb-2" id={labelId}>
          {label}
        </span>
      )}
      {currentUrl && (
        <Image
          src={currentUrl}
          alt={altText}
          className="curriculum-management-image-preview d-block mb-3"
        />
      )}
      <Dropzone
        data-testid={`${fieldId}-dropzone`}
        aria-labelledby={labelId}
        accept={accept}
        maxSize={maxBytes}
        errorMessages={{
          invalidType: intl.formatMessage(messages.imageInvalidType),
          invalidSizeMore: intl.formatMessage(messages.imageTooLarge),
        }}
        onProcessUpload={({ fileData }: { fileData: FormData }) => {
          const file = fileData.get('file');
          if (file instanceof File) { onPick(file); }
        }}
      />
      {helpText && <Form.Text>{helpText}</Form.Text>}
      {currentUrl && (
        <Button variant="tertiary" size="sm" className="mt-2" onClick={onRemove}>
          {intl.formatMessage(messages.removeImage)}
        </Button>
      )}
      {error && <Form.Control.Feedback type="invalid" hasIcon={false}>{error}</Form.Control.Feedback>}
    </Form.Group>
  );
};

export default ImageField;
