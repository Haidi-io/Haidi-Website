export const site = {
  url: 'https://haidi.io',
  appUrl: 'https://app.haidi.io',
  email: 'hello@haidi.io',
  linkedin: 'https://www.linkedin.com/company/ibp-ready',
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
