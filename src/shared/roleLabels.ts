export const toRoleLabel = (role?: string | null): string => (role ?? '')
  .split(/[_\s-]+/)
  .filter(Boolean)
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(' ');

export const toRoleBadges = (role?: string | null): string[] => {
  const label = toRoleLabel(role);
  return label ? [label] : [];
};
