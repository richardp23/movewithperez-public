import { SITE } from '../config';

export function realEstateAgentSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: SITE.agentName,
    jobTitle: SITE.jobTitle,
    url: SITE.domain,
    email: SITE.email,
    telephone: SITE.agentPhone,
    identifier: {
      '@type': 'PropertyValue',
      name: 'NY Real Estate License',
      value: SITE.licenseNumber,
    },
    worksFor: {
      '@type': 'RealEstateOrganization',
      name: SITE.brokerage,
      url: SITE.brokerWebsite,
      address: SITE.brokerAddress,
      telephone: SITE.brokerPhone,
    },
    areaServed: SITE.areaServed.map((a) => ({ '@type': 'Place', name: a })),
    sameAs: Object.values(SITE.socials).filter(Boolean),
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqSchema(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
