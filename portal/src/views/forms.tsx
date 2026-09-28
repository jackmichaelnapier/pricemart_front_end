import type { FC } from 'hono/jsx';
import { ACCEPT_ATTR } from '../lib/files';
import { type Lang, messagesFor, optionLabel, sortedCountries } from '../lib/i18n';
import {
  BUSINESS_TYPES, BUYER_COUNTRIES, CATEGORIES, COUNTRIES, DELIVERY, FREQUENCIES, ORDER_SIZES, SHELF_LIFE, STORAGE, UNITS,
} from '../lib/options';
import {
  type ContactInput, type Errors, type ItemInput, type LotInput, type Mode, type Role, emptyLot,
} from '../lib/validate';
import { FieldError } from './components';

// Every part takes the page language (English by default, as in the account pages).
// Option values stay in English; only what people read is translated.

const Select: FC<{
  id: string; name: string; value: string; options: readonly string[]; lang: Lang; placeholder?: string; label?: string;
}> = ({ id, name, value, options, lang, placeholder, label }) => (
  <select id={id} name={name} aria-label={label}>
    {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
    {options.map((o) => (
      <option value={o} selected={o === value}>
        {optionLabel(lang, o)}
      </option>
    ))}
  </select>
);

const describedBy = (errors: Errors, name: string) => (errors[name] ? `${name}-error` : undefined);

// ---------- step 1: what they have / what they want ----------

const MODES: { mode: Mode; quickest?: boolean }[] = [{ mode: 'describe', quickest: true }, { mode: 'upload' }, { mode: 'details' }];

export const LotFieldset: FC<{ lot: LotInput; index: number | '__i__'; errors: Errors; lang?: Lang }> = ({
  lot, index, errors, lang = 'en',
}) => {
  const f = messagesFor(lang).form;
  const id = (name: string) => `lot-${index}-${name}`;
  const err = (name: string) => (typeof index === 'number' ? errors[`lot_${index}_${name}`] : undefined);
  const hasExtra = Boolean(
    lot.brand || lot.ean || lot.category || lot.stock_country || lot.packaging_languages || lot.asking_price || lot.notes,
  );
  return (
    <fieldset class="pm-lot" data-lot>
      <legend>
        {f.lot} <span data-lot-number>{typeof index === 'number' ? index + 1 : ''}</span>
      </legend>
      <button type="button" class="pm-linkbtn pm-remove-lot" data-remove-lot>
        {f.remove}
      </button>
      <div class="pm-row-3">
        <div class="field">
          <label for={id('product')}>{f.product}</label>
          <input id={id('product')} name="lot_product" type="text" value={lot.product} placeholder={f.productPlaceholder} />
          {err('product') ? <p class="pm-field-error">{err('product')}</p> : null}
        </div>
        <div class="field">
          <label for={id('quantity')}>{f.quantity}</label>
          <div class="pm-qty">
            <input id={id('quantity')} name="lot_quantity" type="text" inputmode="decimal" value={lot.quantity} placeholder="12" />
            <Select id={id('unit')} name="lot_unit" value={lot.unit} options={UNITS} lang={lang} label={f.unit} />
          </div>
          {err('quantity') ? <p class="pm-field-error">{err('quantity')}</p> : null}
        </div>
        <div class="field">
          <label for={id('best_before')}>{f.bestBefore}</label>
          <input id={id('best_before')} name="lot_best_before" type="date" value={lot.best_before} />
          {err('best_before') ? <p class="pm-field-error">{err('best_before')}</p> : null}
        </div>
      </div>
      <details class="pm-more" open={hasExtra}>
        <summary>{f.moreDetails}</summary>
        <div class="field-row">
          <div class="field">
            <label for={id('brand')}>{f.brand}</label>
            <input id={id('brand')} name="lot_brand" type="text" value={lot.brand} />
          </div>
          <div class="field">
            <label for={id('ean')}>{f.ean}</label>
            <input id={id('ean')} name="lot_ean" type="text" inputmode="numeric" value={lot.ean} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('category')}>{f.category}</label>
            <Select id={id('category')} name="lot_category" value={lot.category} options={CATEGORIES} lang={lang} placeholder={f.choose} />
          </div>
          <div class="field">
            <label for={id('stock_country')}>{f.stockIn}</label>
            <Select id={id('stock_country')} name="lot_stock_country" value={lot.stock_country} options={sortedCountries(lang, COUNTRIES)} lang={lang} placeholder={f.choose} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('packaging_languages')}>{f.packagingLanguages}</label>
            <input id={id('packaging_languages')} name="lot_packaging_languages" type="text" value={lot.packaging_languages} placeholder={f.packagingPlaceholder} />
          </div>
          <div class="field">
            <label for={id('storage')}>{f.storage}</label>
            <Select id={id('storage')} name="lot_storage" value={lot.storage} options={STORAGE} lang={lang} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label for={id('asking_price')}>{f.askingPrice}</label>
            <input id={id('asking_price')} name="lot_asking_price" type="text" inputmode="decimal" value={lot.asking_price} placeholder={f.askingPlaceholder} />
          </div>
          <div class="field">
            <label for={id('notes')}>{f.notes}</label>
            <input id={id('notes')} name="lot_notes" type="text" value={lot.notes} />
          </div>
        </div>
      </details>
    </fieldset>
  );
};

const FilesInput: FC<{ name: string; label: string; errors: Errors; hint?: string }> = ({ name, label, errors, hint }) => (
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

export const ItemFields: FC<{ role: Role; item: ItemInput; errors: Errors; lang?: Lang }> = ({ role, item, errors, lang = 'en' }) => {
  const seller = role === 'seller';
  const f = messagesFor(lang).form;
  const modes = f.modes[role];
  return (
    <>
      <fieldset class="pm-options">
        <legend class="pm-sr">{f.howLegend}</legend>
        {MODES.map((o) => (
          <label class="pm-option" for={`mode-${o.mode}`}>
            <input type="radio" name="mode" id={`mode-${o.mode}`} value={o.mode} checked={item.mode === o.mode} />
            <span class="pm-option-title">
              {modes[o.mode].title}
              {o.quickest ? <span class="pm-badge">{f.quickest}</span> : null}
            </span>
            <span class="pm-option-text">{modes[o.mode].text}</span>
          </label>
        ))}
      </fieldset>

      <div class="pm-panel pm-panel-describe">
        <div class="field">
          <label for="body_describe">{seller ? f.describeSeller : f.describeBuyer}</label>
          <textarea
            id="body_describe"
            name="body_describe"
            rows={7}
            aria-describedby={describedBy(errors, 'body_describe')}
            placeholder={seller ? f.placeholderSeller : f.placeholderBuyer}
          >
            {item.mode === 'describe' ? item.body : ''}
          </textarea>
          <FieldError errors={errors} name="body_describe" />
        </div>
        <FilesInput name="files_describe" label={f.filesOptional} errors={errors} />
      </div>

      <div class="pm-panel pm-panel-upload">
        <FilesInput name="files_upload" label={seller ? f.stockList : f.list} errors={errors} hint={f.uploadHint} />
        {seller ? (
          <p class="pm-hint">
            {f.templateQuestion} <a href="/stock-list-template.csv" download>{f.templateLink}</a>.
          </p>
        ) : null}
        <div class="field">
          <label for="body_upload">{f.anythingToAdd}</label>
          <textarea id="body_upload" name="body_upload" rows={3}>
            {item.mode === 'upload' ? item.body : ''}
          </textarea>
        </div>
      </div>

      <div class="pm-panel pm-panel-details">
        {seller ? (
          <>
            <p class="pm-hint">{f.lotsHint}</p>
            <div class="pm-lots" data-lots>
              {item.lots.map((lot, i) => (
                <LotFieldset lot={lot} index={i} errors={errors} lang={lang} />
              ))}
            </div>
            <template id="lot-template">
              <LotFieldset lot={emptyLot()} index="__i__" errors={{}} lang={lang} />
            </template>
            <FieldError errors={errors} name="lots" />
            <button type="button" class="btn btn-ghost pm-add-lot" data-add-lot>
              {f.addLot}
            </button>
            <FilesInput name="files_details" label={f.filesOptional} errors={errors} />
          </>
        ) : (
          <>
            <fieldset class="pm-fieldset">
              <legend>{f.categories}</legend>
              <div class="pm-checks">
                {CATEGORIES.map((c) => (
                  <label class="pm-check-chip">
                    <input type="checkbox" name="want_categories" value={c} checked={item.want.categories.includes(c)} />
                    <span>{optionLabel(lang, c)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <FieldError errors={errors} name="want" />
            <div class="field">
              <label for="want_brands">{f.brandsOptional}</label>
              <input id="want_brands" name="want_brands" type="text" value={item.want.brands} placeholder={f.brandsPlaceholder} />
            </div>
            <fieldset class="pm-fieldset">
              <legend>{f.deliverTo}</legend>
              <div class="pm-checks">
                {BUYER_COUNTRIES.map((c) => (
                  <label class="pm-check-chip">
                    <input type="checkbox" name="want_countries" value={c} checked={item.want.countries.includes(c)} />
                    <span>{optionLabel(lang, c)}</span>
                  </label>
                ))}
              </div>
              <div class="field pm-mt">
                <label for="want_other_countries">{f.otherCountries}</label>
                <input id="want_other_countries" name="want_other_countries" type="text" value={item.want.other_countries} />
              </div>
            </fieldset>
            <div class="field-row">
              <div class="field">
                <label for="want_min_shelf_life">{f.shelfLife}</label>
                <Select id="want_min_shelf_life" name="want_min_shelf_life" value={item.want.min_shelf_life} options={SHELF_LIFE} lang={lang} />
              </div>
              <div class="field">
                <label for="want_packaging_languages">{f.packagingAccept}</label>
                <input id="want_packaging_languages" name="want_packaging_languages" type="text" value={item.want.packaging_languages} placeholder={f.packagingAcceptPlaceholder} />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="want_order_size">{f.orderSize}</label>
                <Select id="want_order_size" name="want_order_size" value={item.want.order_size} options={ORDER_SIZES} lang={lang} placeholder={f.choose} />
              </div>
              <div class="field">
                <label for="want_frequency">{f.frequency}</label>
                <Select id="want_frequency" name="want_frequency" value={item.want.frequency} options={FREQUENCIES} lang={lang} placeholder={f.choose} />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="want_delivery">{f.delivery}</label>
                <Select id="want_delivery" name="want_delivery" value={item.want.delivery} options={DELIVERY} lang={lang} placeholder={f.choose} />
              </div>
            </div>
            <div class="field">
              <label for="body_details">{f.notesOptional}</label>
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

export const OptionalCompanyFields: FC<{ values: Omit<ContactInput, 'email'>; lang?: Lang }> = ({ values: v, lang = 'en' }) => {
  const f = messagesFor(lang).form;
  return (
    <>
      <div class="field-row">
        <div class="field">
          <label for="vat_number">{f.vat}</label>
          <input id="vat_number" name="vat_number" type="text" value={v.vat_number} autocomplete="off" />
        </div>
        <div class="field">
          <label for="country">{f.country}</label>
          <Select id="country" name="country" value={v.country} options={sortedCountries(lang, COUNTRIES)} lang={lang} placeholder={f.choose} />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="phone">{f.phone}</label>
          <input id="phone" name="phone" type="tel" value={v.phone} autocomplete="tel" placeholder={f.phonePlaceholder} />
        </div>
        <div class="field">
          <label for="website">{f.website}</label>
          <input id="website" name="website" type="text" value={v.website} autocomplete="url" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="business_type">{f.businessType}</label>
          <Select id="business_type" name="business_type" value={v.business_type} options={BUSINESS_TYPES} lang={lang} placeholder={f.choose} />
        </div>
        <div class="field">
          <label for="job_title">{f.jobTitle}</label>
          <input id="job_title" name="job_title" type="text" value={v.job_title} autocomplete="organization-title" />
        </div>
      </div>
    </>
  );
};

export const ContactFields: FC<{ contact: ContactInput; errors: Errors; lang?: Lang }> = ({ contact: c, errors, lang = 'en' }) => {
  const f = messagesFor(lang).form;
  const hasOptional = Boolean(c.vat_number || c.country || c.phone || c.website || c.business_type || c.job_title);
  return (
    <>
      <div class="field-row">
        <div class="field">
          <label for="company">{f.company}</label>
          <input id="company" name="company" type="text" value={c.company} autocomplete="organization" required aria-describedby={describedBy(errors, 'company')} />
          <FieldError errors={errors} name="company" />
        </div>
        <div class="field">
          <label for="name">{f.name}</label>
          <input id="name" name="name" type="text" value={c.name} autocomplete="name" required aria-describedby={describedBy(errors, 'name')} />
          <FieldError errors={errors} name="name" />
        </div>
      </div>
      <div class="field">
        <label for="email">{f.email}</label>
        <input id="email" name="email" type="email" value={c.email} autocomplete="email" required aria-describedby="email-hint" />
        <p class="pm-hint" id="email-hint">{f.emailHint}</p>
        <FieldError errors={errors} name="email" />
      </div>
      <details class="pm-more" open={hasOptional}>
        <summary>{f.moreOptional}</summary>
        <OptionalCompanyFields values={c} lang={lang} />
        <p class="pm-hint">{f.laterHint}</p>
      </details>
    </>
  );
};
