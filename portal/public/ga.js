// Google Analytics (same property as www.pricemart.eu). Loaded on public portal pages only.
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-K7SHZYB10Z');
document.addEventListener('DOMContentLoaded', function () {
  var ev = document.body.getAttribute('data-ga-event');
  if (ev) gtag('event', ev, { method: 'portal', role: document.body.getAttribute('data-ga-role') || '' });
});
