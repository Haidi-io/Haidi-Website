export const site = {
  url: 'https://haidi.io',
  appUrl: 'https://app.haidi.io',
  email: 'hello@haidi.io',
  linkedin: 'https://www.linkedin.com/company/ibp-ready',
  // Contact-form endpoint – same-origin Azure Static Web Apps API. The function
  // (api/contact) logs each submission to a SharePoint Excel table and emails
  // hello@haidi.io via Microsoft Graph. See integrations/azure-contact-setup.md.
  // On hosts without the API (e.g. the current Vercel preview) the POST fails and
  // the form just shows the thank-you screen without storing anything.
  contactApi: '/api/contact',
  paths: {
    home: '/home',
    product: '/product-overview',
    usecases: '/use-cases',
    about: '/about',
    contact: '/contact',
    privacy: '/privacy',
    terms: '/terms',
    security: '/security',
  },
} as const;

export type NavKey = 'product' | 'usecases' | 'about' | '';
