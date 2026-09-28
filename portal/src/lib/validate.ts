import { en } from '../i18n/en';
import { emailDomain, isValidEmail, normalizeEmail } from './email';
import { checkFiles } from './files';
import {
  BUSINESS_TYPES, CATEGORIES, COUNTRIES, DELIVERY, FREQUENCIES, ORDER_SIZES, SHELF_LIFE, STORAGE, UNITS, oneOf,
} from './options';
import { clean, normalizeWebsite } from './text';
import { isValidDate } from './time';

/** Error messages in the person's language. English by default (the account pages and tests). */
export type ValidationMessages = typeof en.errors;

export type Role = 'seller' | 'buyer';
export type Kind = 'stock' | 'want';
export type Mode = 'describe' | 'upload' | 'details';
export const MODES: Mode[] = ['describe', 'upload', 'details'];

/** The option the person picked in step 1. Defaults to the quickest one. */
export function parseMode(value: string): Mode {
  return (MODES as string[]).includes(value) ? (value as Mode) : 'describe';
}

export function kindFor(role: Role): Kind {
  return role === 'seller' ? 'stock' : 'want';
}

export function isRole(value: string): value is Role {
  return value === 'seller' || value === 'buyer';
}

/** The subset of FormData the parsers need, so they can be tested with plain objects. */
export interface FormLike {
  get(name: string): string;
  getAll(name: string): string[];
}

export type Errors = Record<string, string>;

export interface LotInput {
  product: string;
  quantity: string;
  unit: string;
  best_before: string;
  brand: string;
  ean: string;
  category: string;
  stock_country: string;
  packaging_languages: string;
  storage: string;
  asking_price: string;
  notes: string;
}

export interface WantDetails {
  categories: string[];
  brands: string;
  countries: string[];
  other_countries: string;
  min_shelf_life: string;
  packaging_languages: string;
  order_size: string;
  frequency: string;
  delivery: string;
}

export interface ItemInput {
  mode: Mode;
  body: string;
  lots: LotInput[];
  want: WantDetails;
}

export interface ContactInput {
  company: string;
  name: string;
  email: string;
  vat_number: string;
  country: string;
  phone: string;
  website: string;
  business_type: string;
  job_title: string;
}

export const LOT_FIELDS: (keyof LotInput)[] = [
  'product', 'quantity', 'unit', 'best_before', 'brand', 'ean', 'category', 'stock_country',
  'packaging_languages', 'storage', 'asking_price', 'notes',
];

export function emptyLot(): LotInput {
  return {
    product: '', quantity: '', unit: 'Pallets', best_before: '', brand: '', ean: '', category: '',
    stock_country: '', packaging_languages: '', storage: 'Ambient', asking_price: '', notes: '',
  };
}

export function emptyWant(): WantDetails {
  return {
    categories: [], brands: '', countries: [], other_countries: '', min_shelf_life: 'Any',
    packaging_languages: '', order_size: '', frequency: '', delivery: '',
  };
}

export function emptyItem(): ItemInput {
  return { mode: 'describe', body: '', lots: [emptyLot()], want: emptyWant() };
}

export function emptyContact(): ContactInput {
  return {
    company: '', name: '', email: '', vat_number: '', country: '', phone: '', website: '',
    business_type: '', job_title: '',
  };
}

/** A lot the person started filling in. Blank rows (an unused "add another lot") are ignored. */
export function isLotStarted(lot: LotInput): boolean {
  return Boolean(lot.product || lot.quantity || lot.best_before || lot.brand || lot.ean || lot.notes);
}

function parseLots(form: FormLike): LotInput[] {
  const cols = Object.fromEntries(LOT_FIELDS.map((f) => [f, form.getAll(`lot_${f}`)])) as Record<
    keyof LotInput,
    string[]
  >;
  const count = Math.min(cols.product.length, 50);
  const lots: LotInput[] = [];
  for (let i = 0; i < count; i++) {
    const v = (f: keyof LotInput, max = 200) => clean(cols[f][i] ?? '', max);
    lots.push({
      product: v('product'),
      quantity: v('quantity', 60),
      unit: oneOf(UNITS, v('unit')) || 'Pallets',
      best_before: v('best_before', 10),
      brand: v('brand'),
      ean: v('ean', 40),
      category: oneOf(CATEGORIES, v('category')),
      stock_country: oneOf(COUNTRIES, v('stock_country')),
      packaging_languages: v('packaging_languages', 100),
      storage: oneOf(STORAGE, v('storage')) || 'Ambient',
      asking_price: v('asking_price', 40),
      notes: v('notes', 2000),
    });
  }
  return lots.length ? lots : [emptyLot()];
}

function parseWant(form: FormLike): WantDetails {
  return {
    categories: form.getAll('want_categories').filter((c) => (CATEGORIES as readonly string[]).includes(c)),
    brands: clean(form.get('want_brands'), 500),
    countries: form.getAll('want_countries').filter((c) => (COUNTRIES as readonly string[]).includes(c)),
    other_countries: clean(form.get('want_other_countries'), 200),
    min_shelf_life: oneOf(SHELF_LIFE, clean(form.get('want_min_shelf_life'))) || 'Any',
    packaging_languages: clean(form.get('want_packaging_languages'), 100),
    order_size: oneOf(ORDER_SIZES, clean(form.get('want_order_size'))),
    frequency: oneOf(FREQUENCIES, clean(form.get('want_frequency'))),
    delivery: oneOf(DELIVERY, clean(form.get('want_delivery'))),
  };
}

/**
 * Step 1: what they have (sellers) or what they want (buyers).
 * `files` are the files attached for the chosen mode.
 */
export function parseItem(
  role: Role,
  form: FormLike,
  files: { name: string; size: number }[],
  msg: ValidationMessages = en.errors,
): { input: ItemInput; errors: Errors } {
  const mode = parseMode(clean(form.get('mode'), 20));
  const input: ItemInput = {
    mode,
    body: clean(form.get(`body_${mode}`), 10_000),
    lots: role === 'seller' && mode === 'details' ? parseLots(form) : [emptyLot()],
    want: role === 'buyer' && mode === 'details' ? parseWant(form) : emptyWant(),
  };
  const errors: Errors = {};

  if (mode === 'describe' && input.body.length < 3) {
    errors.body_describe = role === 'seller' ? msg.describeSeller : msg.describeBuyer;
  }
  if (mode === 'upload' && files.length === 0) {
    errors.files_upload = msg.filesUpload;
  }
  if (files.length) {
    const fileError = checkFiles(files, msg);
    if (fileError) errors[`files_${mode}`] = fileError;
  }
  if (mode === 'details' && role === 'seller') {
    const started = input.lots.filter(isLotStarted);
    if (started.length === 0) {
      errors.lots = msg.lots;
    }
    input.lots.forEach((lot, i) => {
      if (!isLotStarted(lot)) return;
      if (!lot.product) errors[`lot_${i}_product`] = msg.product;
      if (!lot.quantity) errors[`lot_${i}_quantity`] = msg.quantity;
      if (!lot.best_before) errors[`lot_${i}_best_before`] = msg.bestBefore;
      else if (!isValidDate(lot.best_before)) errors[`lot_${i}_best_before`] = msg.dateFormat;
    });
  }
  if (mode === 'details' && role === 'buyer') {
    if (input.want.categories.length === 0 && !input.want.brands) {
      errors.want = msg.want;
    }
  }
  return { input, errors };
}

/** Step 2: how to reach them. Only company, name and email are required. */
export function parseContact(form: FormLike, msg: ValidationMessages = en.errors): { input: ContactInput; errors: Errors } {
  const input: ContactInput = {
    company: clean(form.get('company'), 200),
    name: clean(form.get('name'), 120),
    email: normalizeEmail(clean(form.get('email'), 254)),
    vat_number: clean(form.get('vat_number'), 40),
    country: oneOf(COUNTRIES, clean(form.get('country'))),
    phone: clean(form.get('phone'), 40),
    website: normalizeWebsite(clean(form.get('website'), 200)),
    business_type: oneOf(BUSINESS_TYPES, clean(form.get('business_type'))),
    job_title: clean(form.get('job_title'), 120),
  };
  const errors: Errors = {};
  if (!input.company) errors.company = msg.company;
  if (!input.name) errors.name = msg.name;
  if (!input.email) errors.email = msg.emailMissing;
  else if (!isValidEmail(input.email) || !emailDomain(input.email)) errors.email = msg.emailInvalid;
  return { input, errors };
}

/** Profile edits in the account: the same fields as step 2, minus the email. */
export function parseProfile(form: FormLike): { input: Omit<ContactInput, 'email'>; errors: Errors } {
  const { input, errors } = parseContact({
    get: (n) => (n === 'email' ? 'placeholder@example.com' : form.get(n)),
    getAll: (n) => form.getAll(n),
  });
  const { email: _ignored, ...rest } = input;
  delete errors.email;
  return { input: rest, errors };
}
