/* Weave shell: carries a light, dark or system choice between the family's domains.
   Canonical source: specweave repo design/weave/. Load it in <head>, before the site's own theme script.
   Each site stores light or dark under 'theme' (nothing stored means system) and sets
   data-theme-choice on <html>. Only a choice the visitor made is carried. */
(function () {
  try {
    var key = 'theme';
    var chosenKey = 'wv-theme-chosen';
    var root = document.documentElement;
    var family = /(^|\.)(spec-weave\.com|verified-skill\.com)$/;
    var url = new URL(location.href);
    var carried = url.searchParams.get('wv-theme');
    if (carried) {
      if (carried === 'light' || carried === 'dark') {
        localStorage.setItem(key, carried);
        root.setAttribute('data-theme', carried);
      } else {
        localStorage.removeItem(key);
      }
      localStorage.setItem(chosenKey, '1');
      url.searchParams.delete('wv-theme');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    // The site's switch changes data-theme-choice; from then on the choice is the visitor's own.
    if (typeof MutationObserver === 'function') {
      new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var before = records[i].oldValue;
          if (before && before !== root.getAttribute('data-theme-choice')) {
            try { localStorage.setItem(chosenKey, '1'); } catch (_) {}
          }
        }
      }).observe(root, { attributes: true, attributeFilter: ['data-theme-choice'], attributeOldValue: true });
    }
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest && event.target.closest('a[href^="http"]');
      if (!link) return;
      try {
        var target = new URL(link.href);
        if (target.host === location.host || !family.test(target.hostname)) return;
        var choice = localStorage.getItem(key);
        if (choice !== 'light' && choice !== 'dark') {
          if (!localStorage.getItem(chosenKey)) return;
          choice = 'system';
        }
        target.searchParams.set('wv-theme', choice);
        link.href = target.toString();
      } catch (_) {}
    }, true);
  } catch (_) {}
})();
