// data-testid selectors for the rename fields in the course outline (CardHeader.tsx, namePrefix
// 'section' | 'subsection' | 'unit') and the standalone Unit page title (HeaderTitle.jsx). Kept as
// an external listener (rather than editing those upstream-tracked components) to avoid diverging
// from openedx/frontend-app-authoring.
const RENAME_FIELD_SELECTOR = '[data-testid$="-edit-field"], [data-testid="unit-header-title"] input';

const handleFocusIn = (event) => {
  if (event.target instanceof HTMLInputElement && event.target.matches(RENAME_FIELD_SELECTOR)) {
    event.target.select();
  }
};

let initialized = false;

// Highlights the current title text as soon as a Section/Subsection/Unit rename field opens, so
// typing immediately replaces it instead of requiring a manual select-all first.
export const initSelectTitleOnFocus = () => {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener('focusin', handleFocusIn);
};

export const resetSelectTitleOnFocus = () => {
  initialized = false;
  document.removeEventListener('focusin', handleFocusIn);
};
