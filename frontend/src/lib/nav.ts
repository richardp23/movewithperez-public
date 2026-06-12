export interface NavLink {
  path: string;
  label: string;
}

export const PRIMARY_NAV_LINKS: NavLink[] = [
  { path: '/neighborhoods', label: 'Neighborhoods' },
  { path: '/buyers', label: 'Buyers' },
  { path: '/renters', label: 'Renters' },
  { path: '/sellers', label: 'Sellers' },
  { path: '/about', label: 'About' },
  { path: '/insights', label: 'Insights' },
];

export const FOOTER_QUICK_LINKS: NavLink[] = [
  { path: '/neighborhoods', label: 'Neighborhoods' },
  { path: '/buyers', label: 'Buyers' },
  { path: '/renters', label: 'Renters' },
  { path: '/sellers', label: 'Sellers' },
  { path: '/insights', label: 'Insights' },
  { path: '/contact', label: 'Contact' },
];

export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { path: '/legal/privacy', label: 'Privacy' },
  { path: '/legal/terms', label: 'Terms of Use' },
  { path: '/legal/accessibility', label: 'Accessibility' },
  { path: '/legal/fair-housing', label: 'Fair Housing' },
  { path: '/legal/sop', label: 'Standard Operating Procedures' },
];
