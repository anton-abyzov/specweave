/* Weave shell: carries a light or dark choice between the family's domains.
   Canonical source: specweave repo design/weave/. Load it in <head>, before the site's own theme script. */
(function () {
  try {
    var key = 'theme';
    var url = new URL(location.href);
    var carried = url.searchParams.get('wv-theme');
    if (carried) {
      if (carried === 'light' || carried === 'dark') {
        localStorage.setItem(key, carried);
        document.documentElement.setAttribute('data-theme', carried);
      } else {
        localStorage.removeItem(key);
      }
      url.searchParams.delete('wv-theme');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', function (event) {
      var link = event.target && event.target.closest && event.target.closest('.wv-family a[href^="http"]');
      if (!link) return;
      try {
        var target = new URL(link.href);
        if (target.host === location.host) return;
        var choice = localStorage.getItem(key);
        if (choice !== 'light' && choice !== 'dark') return;
        target.searchParams.set('wv-theme', choice);
        link.href = target.toString();
      } catch (_) {}
    }, true);
  } catch (_) {}
})();
