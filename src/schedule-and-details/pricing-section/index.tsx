import React, { useEffect, useState } from 'react';
import {
  Alert, Button, Form, Spinner,
} from '@openedx/paragon';
import { useIntl } from '@edx/frontend-platform/i18n';
import { logError } from '@edx/frontend-platform/logging';
import SectionSubHeader from '../../generic/section-sub-header';
import {
  clearCoursePricing, getCoursePricing, setCoursePricing, PricingCategory,
} from './api';
import messages from './messages';

interface PricingSectionProps {
  courseId: string;
}

/** 'free' is a UI-only value: the backend represents free as no pricing row. */
type UiCategory = 'free' | PricingCategory;

const PricingSection: React.FC<PricingSectionProps> = ({ courseId }) => {
  const intl = useIntl();
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState<UiCategory>('free');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isManagedByAdmin, setIsManagedByAdmin] = useState(false);
  const [paidProgramName, setPaidProgramName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pricing = await getCoursePricing(courseId);
        if (cancelled) { return; }
        setCategory(pricing.pricingCategory ?? 'free');
        setPrice(pricing.price ?? '');
        setDiscount(pricing.discount ?? '');
        setCurrency(pricing.currency ?? 'SAR');
        setIsManagedByAdmin(pricing.pricingManagedByAdmin);
        setPaidProgramName(pricing.partOfProgram ? (pricing.partOfProgramName ?? pricing.partOfProgram) : null);
      } catch (err) {
        logError(err);
      } finally {
        if (!cancelled) { setIsLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [courseId]);

  // A price only applies to a standalone paid course: a free course has no
  // pricing row, and a course inside a paid program is sold via the program.
  const showPriceFields = category === 'is_paid';

  const validate = (): string => {
    if (!showPriceFields) { return ''; }
    if (price.trim() === '') { return intl.formatMessage(messages.errorPriceRequired); }
    const p = Number(price);
    const d = discount.trim() === '' ? null : Number(discount);
    if (p < 0 || (d !== null && d < 0)) { return intl.formatMessage(messages.errorNegative); }
    if (d !== null && d > p) { return intl.formatMessage(messages.errorDiscountTooHigh); }
    return '';
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSaved(false);
      return;
    }
    setError('');
    setIsSaving(true);
    try {
      if (category === 'free') {
        await clearCoursePricing(courseId);
        setPrice('');
        setDiscount('');
      } else {
        await setCoursePricing(courseId, {
          pricingCategory: category,
          // An is_within_program course never carries its own price.
          price: showPriceFields ? price.trim() : null,
          discount: showPriceFields && discount.trim() !== '' ? discount.trim() : null,
        });
      }
      setSaved(true);
    } catch (err) {
      logError(err);
      setError(intl.formatMessage(messages.errorSaveFailed));
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const onCategoryChange = (value: UiCategory) => {
    setCategory(value);
    setSaved(false);
    setError('');
  };

  // Admin-managed pricing and a paid program both make this section read-only.
  const isReadOnly = isManagedByAdmin || !!paidProgramName;

  if (isLoading) {
    return (
      <section className="section-container pricing-section">
        <SectionSubHeader
          title={intl.formatMessage(messages.title)}
          description={intl.formatMessage(messages.description)}
        />
        <Spinner animation="border" size="sm" screenReaderText="loading" />
      </section>
    );
  }

  return (
    <section className="section-container pricing-section">
      <SectionSubHeader
        title={intl.formatMessage(messages.title)}
        description={intl.formatMessage(messages.description)}
      />

      {paidProgramName && (
        <Alert variant="info" className="mb-3">
          {intl.formatMessage(messages.partOfProgram, { program: paidProgramName })}
        </Alert>
      )}
      {isManagedByAdmin && !paidProgramName && (
        <Alert variant="info" className="mb-3">{intl.formatMessage(messages.managedByAdmin)}</Alert>
      )}
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {saved && !error && <Alert variant="success" className="mb-3">{intl.formatMessage(messages.savedMsg)}</Alert>}

      <Form.Group>
        <Form.Label>{intl.formatMessage(messages.categoryLabel)}</Form.Label>
        <Form.Control
          as="select"
          value={category}
          disabled={isSaving || isReadOnly}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onCategoryChange(e.target.value as UiCategory)}
        >
          <option value="free">{intl.formatMessage(messages.categoryFree)}</option>
          <option value="is_paid">{intl.formatMessage(messages.categoryPaid)}</option>
          <option value="is_within_program">{intl.formatMessage(messages.categoryWithinProgram)}</option>
        </Form.Control>
      </Form.Group>

      {category === 'is_within_program' && !paidProgramName && (
        <p className="small text-muted">{intl.formatMessage(messages.withinProgramHint)}</p>
      )}

      {showPriceFields && (
        <>
          <Form.Group>
            <Form.Label>{intl.formatMessage(messages.priceLabel, { currency })}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={price}
              disabled={isSaving || isReadOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPrice(e.target.value); setSaved(false); }}
            />
            <Form.Text muted>{intl.formatMessage(messages.priceHint)}</Form.Text>
          </Form.Group>

          <Form.Group>
            <Form.Label>{intl.formatMessage(messages.discountLabel, { currency })}</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={discount}
              disabled={isSaving || isReadOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setDiscount(e.target.value); setSaved(false); }}
            />
            <Form.Text muted>{intl.formatMessage(messages.discountHint)}</Form.Text>
          </Form.Group>
        </>
      )}

      {!isReadOnly && (
        <Button variant="outline-primary" size="sm" onClick={handleSave} disabled={isSaving}>
          {intl.formatMessage(isSaving ? messages.savingBtn : messages.saveBtn)}
        </Button>
      )}
    </section>
  );
};

export default PricingSection;
