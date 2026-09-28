// PriceMart portal: small progressive enhancements. Every form also works without this file.
(function () {
  document.documentElement.classList.add('js');

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // ---------- inline errors ----------

  function clearErrors(scope) {
    scope.querySelectorAll('.pm-client-error').forEach(function (el) { el.remove(); });
    scope.querySelectorAll('[aria-invalid="true"]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function showError(input, message) {
    if (!input) return;
    input.setAttribute('aria-invalid', 'true');
    var p = document.createElement('p');
    p.className = 'pm-field-error pm-client-error';
    p.textContent = message;
    var anchor = input.closest('.pm-qty') || input.closest('.pm-checks') || input;
    anchor.insertAdjacentElement('afterend', p);
  }

  function focusFirstError(scope) {
    var first = scope.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
    return !first;
  }

  // ---------- step 1: what they have / want ----------

  function modeOf(form) {
    var r = form.querySelector('input[name="mode"]:checked');
    return r ? r.value : 'describe';
  }

  function validateItem(form) {
    var role = form.getAttribute('data-role');
    var mode = modeOf(form);
    var panel = form.querySelector('.pm-panel-' + mode) || form;
    clearErrors(form);
    if (mode === 'describe') {
      var body = form.querySelector('#body_describe');
      if (body && body.value.trim().length < 3) {
        showError(body, role === 'seller' ? 'Tell us a little about what you have.' : "Tell us a little about what you're looking for.");
      }
    } else if (mode === 'upload') {
      var files = form.querySelector('#files_upload');
      if (files && files.files.length === 0) showError(files, 'Choose at least one file.');
    } else if (role === 'seller') {
      var started = 0;
      panel.querySelectorAll('[data-lot]').forEach(function (lot) {
        var get = function (n) { return lot.querySelector('[name="lot_' + n + '"]'); };
        var product = get('product'), quantity = get('quantity'), bbd = get('best_before');
        var any = product.value.trim() || quantity.value.trim() || bbd.value || get('brand').value.trim() || get('ean').value.trim() || get('notes').value.trim();
        if (!any) return;
        started++;
        if (!product.value.trim()) showError(product, 'Add the product.');
        if (!quantity.value.trim()) showError(quantity, 'Add the quantity.');
        if (!bbd.value) showError(bbd, 'Add the best-before date.');
      });
      if (!started) {
        var firstProduct = panel.querySelector('[name="lot_product"]');
        showError(firstProduct, 'Add at least one lot: product, quantity and best-before date.');
      }
    } else {
      var anyCat = panel.querySelector('input[name="want_categories"]:checked');
      var brands = panel.querySelector('#want_brands');
      if (!anyCat && !(brands && brands.value.trim())) {
        showError(panel.querySelector('input[name="want_categories"]'), 'Pick at least one category, or name a brand.');
      }
    }
    return focusFirstError(form);
  }

  // ---------- step 2: how to reach them ----------

  function validateContact(form) {
    var step = form.querySelector('[data-step="2"]');
    clearErrors(step);
    var company = step.querySelector('#company'), name = step.querySelector('#name'), email = step.querySelector('#email');
    if (!company.value.trim()) showError(company, 'Add your company name.');
    if (!name.value.trim()) showError(name, 'Add your name.');
    if (!email.value.trim()) showError(email, 'Add your work email.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) showError(email, 'Check the email address.');
    return focusFirstError(step);
  }

  function setupSteps(form) {
    function go(step) {
      form.setAttribute('data-current', step);
      var heading = form.querySelector('[data-step="' + step + '"] h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
      var top = form.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    var next = form.querySelector('[data-next]');
    if (next) next.addEventListener('click', function () { if (validateItem(form)) go('2'); });
    var back = form.querySelector('[data-back]');
    if (back) back.addEventListener('click', function () { go('1'); });

    // Enter in a step 1 field moves on instead of submitting half a form.
    form.addEventListener('keydown', function (e) {
      var t = e.target;
      if (e.key === 'Enter' && form.getAttribute('data-current') !== '2' && t.tagName === 'INPUT' && t.type !== 'submit') {
        e.preventDefault();
        if (validateItem(form)) go('2');
      }
    });
    form.addEventListener('submit', function (e) {
      if (form.getAttribute('data-current') !== '2') {
        e.preventDefault();
        if (validateItem(form)) go('2');
        return;
      }
      if (!validateContact(form)) e.preventDefault();
    });
  }

  // ---------- lots ----------

  function setupLots(container) {
    var tpl = document.getElementById('lot-template');
    var add = document.querySelector('[data-add-lot]');
    if (!tpl || !add) return;
    var counter = 0;
    function renumber() {
      container.querySelectorAll('[data-lot]').forEach(function (fs, i) {
        var n = fs.querySelector('[data-lot-number]');
        if (n) n.textContent = String(i + 1);
      });
    }
    add.addEventListener('click', function () {
      container.insertAdjacentHTML('beforeend', tpl.innerHTML.replace(/__i__/g, 'n' + counter++));
      renumber();
      var first = container.lastElementChild && container.lastElementChild.querySelector('input');
      if (first) first.focus();
    });
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove-lot]');
      if (!btn) return;
      if (container.querySelectorAll('[data-lot]').length > 1) {
        btn.closest('[data-lot]').remove();
        renumber();
        add.focus();
      }
    });
  }

  // ---------- files ----------

  function setupFileList(input) {
    input.addEventListener('change', function () {
      var list = input.parentElement.querySelector('.pm-file-names');
      if (!list) {
        list = document.createElement('ul');
        list.className = 'pm-file-names';
        input.insertAdjacentElement('afterend', list);
      }
      list.innerHTML = '';
      Array.prototype.forEach.call(input.files, function (f) {
        var li = document.createElement('li');
        li.textContent = f.name;
        list.appendChild(li);
      });
      if (input.files.length) {
        input.removeAttribute('aria-invalid');
        var err = input.parentElement.querySelector('.pm-client-error');
        if (err) err.remove();
      }
    });
  }

  // ---------- one submit only ----------

  function guardSubmit(form) {
    var btn = form.querySelector('[data-submit]');
    if (!btn) return;
    form.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      if (form.hasAttribute('data-single') && !validateItem(form)) {
        e.preventDefault();
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Sending…';
    });
  }

  ready(function () {
    var steps = document.querySelector('form[data-steps]');
    if (steps) setupSteps(steps);
    document.querySelectorAll('[data-lots]').forEach(setupLots);
    document.querySelectorAll('input[type="file"][data-file-input]').forEach(setupFileList);
    document.querySelectorAll('form').forEach(guardSubmit);
    var summary = document.querySelector('.pm-error-summary');
    if (summary) summary.focus();
  });

  // Back/forward cache: re-enable the submit button if the page is restored.
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    document.querySelectorAll('[data-submit][disabled]').forEach(function (b) {
      b.disabled = false;
      b.textContent = 'Send';
    });
  });
})();
