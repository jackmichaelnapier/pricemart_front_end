import type { FC } from 'hono/jsx';
import { ACCEPT_ATTR } from '../lib/files';
import {
  BUSINESS_TYPES, BUYER_COUNTRIES, CATEGORIES, COUNTRIES, DELIVERY, FREQUENCIES, ORDER_SIZES, SHELF_LIFE, STORAGE, UNITS,
} from '../lib/options';
import {
  type ContactInput, type Errors, type ItemInput, type LotInput, type Mode, type Role, emptyLot,
} from '../lib/validate';
import { FieldError } from './components';

const Select: FC<{ id: string; name: string; value: string; options: readonly string[]; placeholder?: string; label?: string }> = ({
  id, name, value, options, placeholder, label,
}) => (
  <select id={id} name={name} aria-label={label}>
    {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
    {options.map((o) => (
      <option value={o} selected={o === value}>
        {o}
      </option>
    ))}
  </select>
);

const describedBy = (errors: Errors, name: string) => (errors[name] ? `${name}-error` : undefined);

// ---------- step 1: what they have / what they want ----------

const OPTIONS: Record<Role, { mode: Mode; title: string; text: string; badge?: string }[]> = {
  seller: [
    { mode: 'describe', title: 'Describe it', text: 'Write a few lines. Rough is fine.', badge: 'Quickest' },
    { mode: 'upload', title: 'Upload a stock list', text: 'Excel, CSV, PDF or a photo. Any layout.' },
    { mode: 'details', title: 'Enter lots', text: 'Item by item, if you prefer.' },
  ],
  buyer: [
    { mode: 'describe', title: 'Describe it', text: 'Tell us in a few lines.', badge: 'Quickest' },
    { mode: 'upload', title: 'Upload a list', text: 'Products or brands you buy, any format.' },
    { mode: 'details', title: 'Pick from options', text: 'Categories, countries, shelf life.' },
  ],
};

export const LotFieldset: FC<{ lot: LotInput; index: number | '__i__'; errors: Errors }> = ({ lot, index, errors }) => {
  const id = (f: string) => `lot-${index}-${f}`;
  const err = (f: string) => (typeof index === 'number' ? errors[`lot_${index}_${f}`] : undefined);
  const hasExtra = Boolean(
    lot.brand || lot.ean || lot.category || lot.stock_country || lot.packaging_languages || lot.asking_price || lot.notes,
  );
  return (
    <fieldset class="pm-lot" data-lot>
      <legend>
        Lot <span data-lot-number>{typeof index === 'number' ? index + 1 : ''}</span>
      </legend>
      <button type="button" class="pm-linkbtn pm-remove-lot" data-remove-lot>
        Remove
      </button>
      <div class="pm-row-3">
        <div class="field">
          <label for={id('product')}>Product</label>
          <input id={id('product')} name="lot_product" type="text" value={lot.product} placeholder="e.g. Gummy bears 200 g" />
          {err('product') ? <p class="pm-field-error">{err('product')}</p> : null}
        </div>
        <div class="field">
          <label for={id('quantity')}>Quantity</label>
          <div class="pm-qty">
            <input id={id('quantity')} name="lot_quantity" type="text" inputmode="decimal" value={lot.quantity} placeholder="12" />
            <Select id={id('unit')} name="lot_unit" value={lot.unit} options={UNITS} label="Unit" />
          </div>
          {err('quantity') ? <p class="pm-field-error">{err('quantity')}</p> : null}
        </div>
        <div class="field">
          <label for={id('best_before')}>Best before</label>
          <input id={id('best_before')} name="lot_best_before" type="date" value={lot.best_before} />
          {err('best_before') ? <p class="pm-field-error">{err('best_before')}</p> : null}
        </div>
      </div>
      <details class="pm-more" open={hasExtra}>
        <summary>More details (optional)</summary>
        <div class="field-row">
          <div class="field">
            <label for={id('brand')}>Brand</label>
            <input id={id('brand')} name="lot_brand" type="text" value={lot.brand} />
          </div>
          <div class="field">
            <label for={id('ean')}>EAN barcode</label>
            <input id={id('ean')} name="lot_ean" type="text" inputmode="numeric" value={lot.ean} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('category')}>Category</label>
            <Select id={id('category')} name="lot_category" value={lot.category} options={CATEGORIES} placeholder="Choose…" />
          </div>
          <div class="field">
            <label for={id('stock_country')}>Stock is in</label>
            <Select id={id('stock_country')} name="lot_stock_country" value={lot.stock_country} options={COUNTRIES} placeholder="Choose…" />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('packaging_languages')}>Packaging languages</label>
            <input id={id('packaging_languages')} name="lot_packaging_languages" type="text" value={lot.packaging_languages} placeholder="e.g. DE, EN" />
          </div>
          <div class="field">
            <label for={id('storage')}>Storage</label>
            <Select id={id('storage')} name="lot_storage" value={lot.storage} options={STORAGE} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('asking_price')}>Asking price per case (€)</label>
            <input id={id('asking_price')} name="lot_asking_price" type="text" inputmode="decimal" value={lot.asking_price} placeholder="Leave empty for an offer" />
          </div>
          <div class="field">
            <label for={id('notes')}>Notes</label>
            <input id={id('notes')} name="lot_notes" type="text" value={lot.notes} />
          </div>
        </div>
      </details>
    </fieldset>
  );
};

const FilesInput: FC<{ name: string; label: string; errors: Errors; hint?: string; required?: boolean }> = ({
  name, label, errors, hint,
}) => (
  <div class="field">
    <label for={name}>{label}</label>
    <input
      id={name}
      name={name}
      type="file"
      multiple
      accept={ACCEPT_ATTR}
      data-file-input
      aria-describedby={describedBy(errors, name)}
    />
    {hint ? <p class="pm-hint">{hint}</p> : null}
    <FieldError errors={errors} name={name} />
  </div>
);

export const ItemFields: FC<{ role: Role; item: ItemInput; errors: Errors }> = ({ role, item, errors }) => {
  const seller = role === 'seller';
  return (
    <>
      <fieldset class="pm-options">
        <legend class="pm-sr">How would you like to tell us?</legend>
        {OPTIONS[role].map((o) => (
          <label class="pm-option" for={`mode-${o.mode}`}>
            <input type="radio" name="mode" id={`mode-${o.mode}`} value={o.mode} checked={item.mode === o.mode} />
            <span class="pm-option-title">
              {o.title}
              {o.badge ? <span class="pm-badge">{o.badge}</span> : null}
            </span>
            <span class="pm-option-text">{o.text}</span>
          </label>
        ))}
      </fieldset>

      <div class="pm-panel pm-panel-describe">
        <div class="field">
          <label for="body_describe">{seller ? 'Describe your stock' : 'Describe what you need'}</label>
          <textarea
            id="body_describe"
            name="body_describe"
            rows={7}
            aria-describedby={describedBy(errors, 'body_describe')}
            placeholder={
              seller
                ? 'For example: 12 pallets of gummy bears 200 g, best before November, stock in Hamburg. Also around 5 pallets of mixed chocolate.'
                : "For example: confectionery and snacks for Sweden and Denmark, 1 to 5 pallets a month, at least 30 days' shelf life, Swedish or English packaging."
            }
          >
            {item.mode === 'describe' ? item.body : ''}
          </textarea>
          <FieldError errors={errors} name="body_describe" />
        </div>
        <FilesInput name="files_describe" label="Photos or files (optional)" errors={errors} />
      </div>

      <div class="pm-panel pm-panel-upload">
        <FilesInput
          name="files_upload"
          label={seller ? 'Your stock list' : 'Your list'}
          errors={errors}
          hint="Excel, CSV, PDF, Word or photos. Any layout, no template needed. Up to 10 files, 15 MB each."
        />
        {seller ? (
          <p class="pm-hint">
            Prefer a template? <a href="/stock-list-template.csv" download>Download one</a>.
          </p>
        ) : null}
        <div class="field">
          <label for="body_upload">Anything to add? (optional)</label>
          <textarea id="body_upload" name="body_upload" rows={3}>
            {item.mode === 'upload' ? item.body : ''}
          </textarea>
        </div>
      </div>

      <div class="pm-panel pm-panel-details">
        {seller ? (
          <>
            <p class="pm-hint">Only product, quantity and best-before date are needed. Everything else is optional.</p>
            <div class="pm-lots" data-lots>
              {item.lots.map((lot, i) => (
                <LotFieldset lot={lot} index={i} errors={errors} />
              ))}
            </div>
            <template id="lot-template">
              <LotFieldset lot={emptyLot()} index="__i__" errors={{}} />
            </template>
            <FieldError errors={errors} name="lots" />
            <button type="button" class="btn btn-ghost pm-add-lot" data-add-lot>
              + Add another lot
            </button>
            <FilesInput name="files_details" label="Photos or files (optional)" errors={errors} />
          </>
        ) : (
          <>
            <fieldset class="pm-fieldset">
              <legend>Categories</legend>
              <div class="pm-checks">
                {CATEGORIES.map((c) => (
                  <label class="pm-check-chip">
                    <input type="checkbox" name="want_categories" value={c} checked={item.want.categories.includes(c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FieldError errors={errors} name="want" />
            <div class="field">
              <label for="want_brands">Brands (optional)</label>
              <input id="want_brands" name="want_brands" type="text" value={item.want.brands} placeholder="Leave empty for any brand" />
            </div>
            <fieldset class="pm-fieldset">
              <legend>Deliver to</legend>
              <div class="pm-checks">
                {BUYER_COUNTRIES.map((c) => (
                  <label class="pm-check-chip">
                    <input type="checkbox" name="want_countries" value={c} checked={item.want.countries.includes(c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
              <div class="field pm-mt">
                <label for="want_other_countries">Other countries</label>
                <input id="want_other_countries" name="want_other_countries" type="text" value={item.want.other_countries} />
              </div>
            </fieldset>
            <div class="field-row">
              <div class="field">
                <label for="want_min_shelf_life">Shelf life left, at least</label>
                <Select id="want_min_shelf_life" name="want_min_shelf_life" value={item.want.min_shelf_life} options={SHELF_LIFE} />
              </div>
              <div class="field">
                <label for="want_packaging_languages">Packaging languages you accept</label>
                <input id="want_packaging_languages" name="want_packaging_languages" type="text" value={item.want.packaging_languages} placeholder="e.g. SV, DA, EN" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="want_order_size">Typical order</label>
                <Select id="want_order_size" name="want_order_size" value={item.want.order_size} options={ORDER_SIZES} placeholder="Choose…" />
              </div>
              <div class="field">
                <label for="want_frequency">How often you buy</label>
                <Select id="want_frequency" name="want_frequency" value={item.want.frequency} options={FREQUENCIES} placeholder="Choose…" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="want_delivery">Delivery</label>
                <Select id="want_delivery" name="want_delivery" value={item.want.delivery} options={DELIVERY} placeholder="Choose…" />
              </div>
            </div>
            <div class="field">
              <label for="body_details">Notes (optional)</label>
              <textarea id="body_details" name="body_details" rows={3}>
                {item.mode === 'details' ? item.body : ''}
              </textarea>
            </div>
          </>
        )}
      </div>
    </>
  );
};

// ---------- step 2: how to reach them ----------

export const OptionalCompanyFields: FC<{ values: Omit<ContactInput, 'email'> }> = ({ values: v }) => (
  <>
    <div class="field-row">
      <div class="field">
        <label for="vat_number">VAT number</label>
        <input id="vat_number" name="vat_number" type="text" value={v.vat_number} autocomplete="off" />
      </div>
      <div class="field">
        <label for="country">Country</label>
        <Select id="country" name="country" value={v.country} options={COUNTRIES} placeholder="Choose…" />
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="phone">Phone</label>
        <input id="phone" name="phone" type="tel" value={v.phone} autocomplete="tel" placeholder="With country code" />
      </div>
      <div class="field">
        <label for="website">Website</label>
        <input id="website" name="website" type="text" value={v.website} autocomplete="url" />
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="business_type">Business type</label>
        <Select id="business_type" name="business_type" value={v.business_type} options={BUSINESS_TYPES} placeholder="Choose…" />
      </div>
      <div class="field">
        <label for="job_title">Your job title</label>
        <input id="job_title" name="job_title" type="text" value={v.job_title} autocomplete="organization-title" />
      </div>
    </div>
  </>
);

export const ContactFields: FC<{ contact: ContactInput; errors: Errors }> = ({ contact: c, errors }) => {
  const hasOptional = Boolean(c.vat_number || c.country || c.phone || c.website || c.business_type || c.job_title);
  return (
    <>
      <div class="field-row">
        <div class="field">
          <label for="company">Company name</label>
          <input id="company" name="company" type="text" value={c.company} autocomplete="organization" required aria-describedby={describedBy(errors, 'company')} />
          <FieldError errors={errors} name="company" />
        </div>
        <div class="field">
          <label for="name">Your name</label>
          <input id="name" name="name" type="text" value={c.name} autocomplete="name" required aria-describedby={describedBy(errors, 'name')} />
          <FieldError errors={errors} name="name" />
        </div>
      </div>
      <div class="field">
        <label for="email">Work email</label>
        <input id="email" name="email" type="email" value={c.email} autocomplete="email" required aria-describedby="email-hint" />
        <p class="pm-hint" id="email-hint">We'll send your sign-in link here. No password needed.</p>
        <FieldError errors={errors} name="email" />
      </div>
      <details class="pm-more" open={hasOptional}>
        <summary>Add more details (optional)</summary>
        <OptionalCompanyFields values={c} />
        <p class="pm-hint">You can also add these later in your account.</p>
      </details>
    </>
  );
};
