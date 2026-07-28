import React, { useLayoutEffect, useRef } from 'react';
import type { CertificateConfig } from '../data/types';
import irsAcademyLogo from './assets/irs-academy-logo-color.png';
import fbrLogo from './assets/fbr-logo-color.png';

type FitMode = 'fill' | 'fit';

interface CertificatePreviewProps {
  config: CertificateConfig;
  programName: string;
  traineeName: string;
  issuedAt: string;
  /**
   * 'fill' (default): scale to the container width (settings live preview).
   * 'fit': scale to fit both the container width and the remaining viewport
   * height (the modal), so the whole certificate is visible with no scrolling.
   */
  mode?: FitMode;
}

const DEFAULT_AUTHORITY = 'Inland Revenue Service (IRS) at Inland Revenue Service Academy, Lahore';

// Native design size of the certificate (px). `scale()` needs a unitless
// number, which CSS can't derive from container/viewport units, so sizing is
// driven from JS: we measure the container width and — in 'fit' mode — the real
// available viewport height (independent of Paragon's modal layout), then size
// the wrapper to hug the scaled document and centre it.
const CERT_WIDTH = 1123;
const CERT_HEIGHT = 710;
// Total vertical chrome around the preview in the modal (header + footer + body
// padding + dialog margins). Used as a *fixed* budget so the fit does not read
// the live element position — which would feed back through the modal's
// vertical centring and shrink the certificate on each pass.
const MODAL_CHROME = 256;

const useFitScale = (mode: FitMode) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) {
      return undefined;
    }
    const apply = () => {
      if (mode === 'fit') {
        // The wrapper is sized in px below, so read the available width from the
        // container; fit to both that width and the remaining viewport height.
        const availWidth = parent.clientWidth;
        if (availWidth <= 0) {
          return;
        }
        const availHeight = window.innerHeight - MODAL_CHROME;
        const scale = availHeight > 0
          ? Math.min(availWidth / CERT_WIDTH, availHeight / CERT_HEIGHT)
          : availWidth / CERT_WIDTH;
        // Hug the scaled document so it centres with balanced gaps and the
        // container never grows taller than the certificate (no scrollbar).
        el.style.width = `${CERT_WIDTH * scale}px`;
        el.style.height = `${CERT_HEIGHT * scale}px`;
        el.style.setProperty('--fit-scale', String(scale));
        return;
      }
      // 'fill': the wrapper itself is width:100% with a fixed aspect ratio, so
      // scale to its own rendered width — the aspect box gives the height.
      const width = el.clientWidth;
      if (width > 0) {
        el.style.setProperty('--fit-scale', String(width / CERT_WIDTH));
      }
    };
    apply();
    const raf = requestAnimationFrame(apply);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(apply);
    observer?.observe(mode === 'fit' ? parent : el);
    window.addEventListener('resize', apply);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [mode]);
  return ref;
};

const ordinal = (day: number): string => {
  if (day > 3 && day < 21) { return 'th'; }
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

// Matches the credentials template's `jS F Y` (e.g. "18th June 2026").
const formatLongDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  return `${day}${ordinal(day)} ${month} ${date.getFullYear()}`;
};

/**
 * The FBR program certificate document — a faithful port of the certificate
 * from edly-io/credentials PR #29 (logos, watermark, Algerian title, Monotype
 * Corsiva name, Bookman body, Open Sans signatories). Pure presentational: the
 * same component renders the settings preview, an award preview, and an issued
 * certificate. Presentation is always live (never snapshotted).
 */
const CertificatePreview: React.FC<CertificatePreviewProps> = ({
  config,
  programName,
  traineeName,
  issuedAt,
  mode = 'fill',
}) => {
  const authority = config.issuedBy || DEFAULT_AUTHORITY;
  const signatories = config.signatories.filter((s) => s.name || s.title);
  const sigCount = signatories.length;
  const scaleRef = useFitScale(mode);

  return (
    <div className="fbr-cert-scale" ref={scaleRef}>
      <div className="fbr-cert">
        <div className="fbr-cert__watermark" aria-hidden="true">
          <img src={irsAcademyLogo} alt="" />
        </div>

        <section className="fbr-cert__content">
          <header className="fbr-cert__topbar">
            <img className="fbr-cert__logo-left" src={irsAcademyLogo} alt="IRS Academy" />
            <img className="fbr-cert__logo-right" src={fbrLogo} alt="FBR Pakistan" />
          </header>

          <section className="fbr-cert__title-block">
            <h1 className="fbr-cert__title">{programName}</h1>
            <div className="fbr-cert__dates">({formatLongDate(issuedAt)})</div>
          </section>

          <div className="fbr-cert__presented-to">Certificate presented to</div>
          <div className="fbr-cert__name-wrap">
            <div className="fbr-cert__name-box">
              <p className="fbr-cert__name">{traineeName}</p>
            </div>
          </div>

          <section className="fbr-cert__body">
            <span className="fbr-cert__body-line">
              On successful completion of {programName} of
            </span>
            <span className="fbr-cert__body-line">{authority}</span>
          </section>

          <section
            className="fbr-cert__sigs"
            style={sigCount > 0 ? { gridTemplateColumns: `repeat(${sigCount}, minmax(0, 1fr))` } : undefined}
          >
            {signatories.map((signatory) => (
              <article className="fbr-cert__sig" key={`${signatory.name}-${signatory.title}`}>
                {signatory.signatureUrl && (
                  <img className="fbr-cert__sig-image" src={signatory.signatureUrl} alt="" />
                )}
                <div className="fbr-cert__sig-line" />
                <p className="fbr-cert__sig-name">{signatory.name || ' '}</p>
                <p className="fbr-cert__sig-title">{signatory.title}</p>
              </article>
            ))}
          </section>
        </section>
      </div>
    </div>
  );
};

export default CertificatePreview;
