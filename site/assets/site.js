// Header dropdowns (the phone menu button and the language switcher) close on a tap
// outside or on Escape. Both are <details>, so they open and close without this file.
(function () {
  function openMenus() {
    return document.querySelectorAll('.topbar details[open]');
  }

  // The phone menu panel is the <nav> right after the menu button, so it counts as inside.
  function isInside(details, target) {
    if (details.contains(target)) return true;
    var panel = details.classList.contains('nav-toggle') ? details.nextElementSibling : null;
    return !!(panel && panel.contains(target));
  }

  document.addEventListener('click', function (e) {
    openMenus().forEach(function (d) {
      if (isInside(d, e.target)) return;
      // The phone menu dims the page: a tap there only closes it, it does not follow a link underneath.
      // Taps on the header bar (logo, Contact) still work.
      if (d.classList.contains('nav-toggle') && !d.closest('.topbar').contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
      d.open = false;
    });
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = openMenus();
    if (!open.length) return;
    // Close the innermost first: the language list inside the phone menu, then the menu.
    var d = open[open.length - 1];
    var hadFocus = isInside(d, document.activeElement);
    d.open = false;
    if (hadFocus) d.querySelector('summary').focus();
  });
})();
