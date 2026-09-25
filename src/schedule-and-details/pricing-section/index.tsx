import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Form, Spinner,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import SectionSubHeader from '../../generic/section-sub-header';
import {
  getCoursePricing, setCoursePricing, CoursePricing, CoursePricingError, PricingCategory,
} from './api';
import { isPriceValid, isSalePriceValid } from './validation';
import messages from './messages';

interface PricingSectionProps {
  courseId: string;
}

type FieldErrors = Partial<Record<'price' | 'discount' | 'pricing_category', string>>;

/** The backend error body of a rejected PUT, or null when the response carries no `detail`. */
const getErrorBody = (err: unknown): CoursePricingError | null => {
  const data = (err as { response?: { data?: Partial<CoursePricingError> } })?.response?.data;
  return data && typeof data.detail === 'string' ? (data as CoursePricingError) : null;
};

const PricingSection: React.FC<PricingSectionProps> = ({ courseId }) => {
  const intl = useIntl();
  const [isLoading, setIsLoading] = useState(true);
  // '' means the course has no type yet, so no radio is selected.
  const [category, setCategory] = useState<PricingCategory | ''>('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [canEdit, setCanEdit] = useState(false);
  const [managedByAdmin, setManagedByAdmin] = useState(false);
  const [programName, setProgramName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const applyPricing = (pricing: CoursePricing) => {
    setCategory(pricing.pricingCategory ?? '');
    setPrice(pricing.price ?? '');
    setDiscount(pricing.discount ?? '');
    setCurrency(pricing.currency ?? 'SAR');
    setCanEdit(pricing.canEdit);
    setManagedByAdmin(pricing.pricingManagedByAdmin);
    setProgramName(pricing.partOfProgram ? (pricing.partOfProgramName ?? pricing.partOfProgram) : null);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pricing = await getCoursePricing(courseId);
        if (!cancelled) { applyPricing(pricing); }
      } catch (err) {
        logError(err);
        if (!cancelled) { setLoadFailed(true); }
      } finally {
        if (!cancelled) { setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  const showPriceFields = category === 'is_paid';
  const isReadOnly = !canEdit;
  const isTypeLocked = isReadOnly || !!programName;

  const priceError = (value: string) => (
    isPriceValid(value) ? undefined : intl.formatMessage(messages.errorPriceNotPositive)
  );
  const discountError = (priceValue: string, discountValue: string) => (
    isSalePriceValid(priceValue, discountValue) ? undefined : intl.formatMessage(messages.errorSalePriceTooHigh)
  );

  const onPriceBlur = () => {
    setFieldErrors((prev) => ({
      ...prev,
      price: priceError(price),
      discount: discountError(price, discount),
    }));
  };

  const onDiscountBlur = () => {
    setFieldErrors((prev) => ({ ...prev, discount: discountError(price, discount) }));
  };

  const handleSave = async () => {
    if (!category) { return; }
    setError('');
    setSaved(false);
    if (showPriceFields) {
      const errors = { price: priceError(price), discount: discountError(price, discount) };
      setFieldErrors(errors);
      if (errors.price || errors.discount) { return; }
    } else {
      setFieldErrors({});
    }
    setIsSaving(true);
    try {
      const pricing = await setCoursePricing(courseId, {
        pricingCategory: category,
        // Only a Paid course carries a price. Free and Program-only clear it.
        price: showPriceFields ? price.trim() : null,
        discount: showPriceFields && discount.trim() !== '' ? discount.trim() : null,
      });
      applyPricing(pricing);
      setSaved(true);
    } catch (err) {
      logError(err);
      const body = getErrorBody(err);
      if (body?.field) {
        setFieldErrors({ [body.field]: body.detail });
      } else {
        setError(body?.detail ?? intl.formatMessage(messages.errorSaveFailed));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onCategoryChange = (value: PricingCategory) => {
    setCategory(value);
    setSaved(false);
    setError('');
    setFieldErrors({});
  };

  if (isLoading || loadFailed) {
    return (
      <section className="section-container pricing-section">
        <SectionSubHeader
          title={intl.formatMessage(messages.title)}
          description={intl.formatMessage(messages.description)}
        />
        {isLoading ? (
          <Spinner animation="border" size="sm" screenReaderText="loading" />
        ) : (
          <Alert variant="danger">{intl.formatMessage(messages.errorLoadFailed)}</Alert>
        )}
      </section>
    );
  }

  return (
    <section className="section-container pricing-section">
      <SectionSubHeader
        title={intl.formatMessage(messages.title)}
        description={intl.formatMessage(messages.description)}
      />

      {isReadOnly && managedByAdmin && (
        <Alert variant="info" className="mb-3">{intl.formatMessage(messages.managedByAdmin)}</Alert>
      )}
      {programName && (
        <Alert variant="info" className="mb-3">
          {intl.formatMessage(messages.partOfProgram, { program: programName })}
        </Alert>
      )}
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {saved && !error && <Alert variant="success" className="mb-3">{intl.formatMessage(messages.savedMsg)}</Alert>}
      {!category && !isTypeLocked && (
        <p className="small text-muted">{intl.formatMessage(messages.noTypeHint)}</p>
      )}

      <Form.Group isInvalid={!!fieldErrors.pricing_category}>
        <Form.Label className="sr-only">{intl.formatMessage(messages.title)}</Form.Label>
        <Form.RadioSet
          name="pricingCategory"
          value={category}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCategoryChange(e.target.value as PricingCategory)}
        >
          <Form.Radio
            value="is_free"
            description={intl.formatMessage(messages.categoryFreeDescription)}
            disabled={isSaving || isTypeLocked}
          >
            {intl.formatMessage(messages.categoryFree)}
          </Form.Radio>
          <Form.Radio
            value="is_paid"
            description={intl.formatMessage(messages.categoryPaidDescription)}
            disabled={isSaving || isTypeLocked}
          >
            {intl.formatMessage(messages.categoryPaid)}
          </Form.Radio>
          <Form.Radio
            value="is_program_only"
            description={intl.formatMessage(messages.categoryProgramOnlyDescription)}
            disabled={isSaving || isTypeLocked}
          >
            {intl.formatMessage(messages.categoryProgramOnly)}
          </Form.Radio>
        </Form.RadioSet>
        {fieldErrors.pricing_category && (
          <Form.Control.Feedback type="invalid">{fieldErrors.pricing_category}</Form.Control.Feedback>
        )}
      </Form.Group>

      {showPriceFields && (
        <>
          <Form.Group isInvalid={!!fieldErrors.price}>
            <Form.Label>{intl.formatMessage(messages.priceLabel, { currency })}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={price}
              disabled={isSaving || isReadOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPrice(e.target.value); setSaved(false); }}
              onBlur={onPriceBlur}
            />
            {fieldErrors.price ? (
              <Form.Control.Feedback type="invalid">{fieldErrors.price}</Form.Control.Feedback>
            ) : (
              <Form.Text muted>{intl.formatMessage(messages.priceHint)}</Form.Text>
            )}
          </Form.Group>

          <Form.Group isInvalid={!!fieldErrors.discount}>
            <Form.Label>{intl.formatMessage(messages.discountLabel, { currency })}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={discount}
              disabled={isSaving || isReadOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDiscount(e.target.value); setSaved(false); }}
              onBlur={onDiscountBlur}
            />
            {fieldErrors.discount ? (
              <Form.Control.Feedback type="invalid">{fieldErrors.discount}</Form.Control.Feedback>
            ) : (
              <Form.Text muted>{intl.formatMessage(messages.discountHint)}</Form.Text>
            )}
          </Form.Group>
        </>
      )}

      {!isTypeLocked && (
        <Button variant="outline-primary" size="sm" onClick={handleSave} disabled={isSaving || !category}>
          {intl.formatMessage(isSaving ? messages.savingBtn : messages.saveBtn)}
        </Button>
      )}
    </section>
  );
};

export default PricingSection;
