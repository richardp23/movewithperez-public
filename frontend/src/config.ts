import agentPortraitHome from './assets/photos/agent-portrait-alt.jpg';

// Single source of truth for brand + compliance details.
// Fill these in, then footer, SEO, and JSON-LD all stay consistent.
export const SITE = {
  agentName: 'Richard Perez',
  jobTitle: 'Licensed Real Estate Salesperson', // NY title — verify exact wording with your broker
  licenseNumber: '00000000000',
  brokerage: 'EXIT Realty Central',
  brokerWebsite: 'https://www.exitrealtycentral.com',
  brokerEmail: 'broker@example.com',
  agentPhone: '+1-555-010-0000',
  brokerPhone: '+1-555-010-0001', // brokerage office line
  brokerAddress: '123 Example Blvd, Ozone Park, NY 11417',
  brokerStreet: '123 Example Blvd',
  brokerCityStateZip: 'Ozone Park, NY 11417',
  licenseDisclosure:
    'Richard Perez, Licensed Real Estate Salesperson, License #00000000000',
  domain: 'https://example-realestate.dev',
  email: 'agent@example.com',
  tagline: 'Your guide to living in Queens, NY',
  areaServed: [
    'Richmond Hill, Queens, NY',
    'Woodhaven, Queens, NY',
    'Glendale, Queens, NY',
    'Howard Beach, Queens, NY',
    'Ozone Park, Queens, NY',
  ],
  socials: {
    pinterest: '',
    instagram: '',
    facebook: '',
  },
  nysFairHousingNoticeUrl:
    'https://dos.ny.gov/system/files/documents/2025/03/nys-housing-and-anti-discrimination-notice_02.2025.pdf',
  /** Redacted public code snapshot — linked from footer */
  publicRepoUrl: 'https://github.com/example-account/realestate-site-public',
} as const;

/** Centralized image slots — see docs/IMAGES.md for licensing + replacement checklist */
export const IMAGES = {
  homeHero: agentPortraitHome,
  homeHeroAlt:
    'Richard Perez, Licensed Real Estate Salesperson at EXIT Realty Central',
} as const;

/** Required NY + EXIT compliance links */
export const COMPLIANCE = {
  /** EXIT Equal Housing Opportunity page — footer link opens in new tab */
  fairHousingUrl: 'https://www.exitrealtycentral.com/eho',
  /** NY-required Standard Operating Procedures PDF */
  sopPdfUrl:
    'https://cdn.exitrealty.com/agent-office-website/NY597/files/b132296db1dca64a2d2b32cace1108a2.pdf',
} as const;
