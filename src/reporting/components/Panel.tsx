import type { ReactNode } from 'react';

/** A titled panel: one job per card, so a chart and a table are never read as one block. */
const Panel = ({ title, children }: { title: string; children: ReactNode; }) => (
  <section className="reporting-panel">
    <h3 className="reporting-panel__title">{title}</h3>
    {children}
  </section>
);

export default Panel;
