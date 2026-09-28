// Option lists shown in forms. Categories match the public site's seller form.

export const CATEGORIES = [
  'Confectionery',
  'Snacks',
  'Beverages',
  'Ambient grocery',
  'Pet food',
  'Health & sports nutrition',
  'Seasonal',
  'Mixed / multiple',
] as const;

export const COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland',
  'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom', 'Other',
] as const;

// Quick-pick delivery countries for buyers. Anything else goes in "other countries".
export const BUYER_COUNTRIES = [
  'Sweden', 'Denmark', 'Norway', 'Finland', 'Germany', 'Netherlands', 'Poland', 'Czechia', 'Spain',
] as const;

export const BUSINESS_TYPES = [
  'Manufacturer or brand owner',
  'Distributor or wholesaler',
  'Retailer or discounter',
  'Online shop',
  'Food rescue or charity',
  'Other',
] as const;

export const UNITS = ['Pallets', 'Cases', 'Units'] as const;
export const STORAGE = ['Ambient', 'Chilled', 'Frozen'] as const;
export const SHELF_LIFE = ['Any', 'At least 14 days', 'At least 30 days', 'At least 60 days', 'At least 90 days'] as const;
export const ORDER_SIZES = ['Less than 1 pallet', '1 to 5 pallets', '5 to 20 pallets', 'Full trucks'] as const;
export const FREQUENCIES = ['Now and then', 'Every month', 'Every week'] as const;
export const DELIVERY = ['Delivered to us', 'We collect', 'Either'] as const;

export function oneOf<T extends readonly string[]>(list: T, value: string): string {
  return (list as readonly string[]).includes(value) ? value : '';
}
