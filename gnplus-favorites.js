/* GN Plus — favorites add-on
   Adds a star to every game card and pins starred games to the top.
   Self-contained: doesn't touch gnplus-stable.js. Stored in localStorage ("gnFavorites"). */
(function () {
    'use strict';

    const KEY = 'gnFavorites';
    const container = document.getElementById('container');
    if (!container) return;

    const STAR_SVG =
        '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5 6.1 20.7l1.2-6.6L2.5 9.5l6.6-.9z"/></svg>';

    function load() {
        try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
        catch (e) { return new Set(); }
    }
    function save() {
        try { localStorage.setItem(KEY, JSON.stringify([...favs])); } catch (e) {}
    }

    let favs = load();

    // Favorites are keyed by provider + name so same-named games on different providers stay separate
    const providerName = () => ((document.getElementById('providerLabel') || {}).textContent || '').trim();
    const cards = () => [...container.children].filter(el => el.matches('.zone-item, .game-btn'));
    const nameOf = el => ((el.querySelector('.card-name') || el).textContent || '').trim();
    const keyOf = el => providerName() + '::' + nameOf(el);

    function makeStar(card) {
        const star = document.createElement('span');
        star.className = 'fav-star';
        star.setAttribute('role', 'button');
        star.tabIndex = 0;
        star.title = 'Favorite';
        star.innerHTML = STAR_SVG;

        const toggle = e => {
            e.preventDefault();
            e.stopPropagation(); // don't open the game
            const k = keyOf(card);
            if (favs.has(k)) favs.delete(k); else favs.add(k);
            save();
            schedule();
        };
        star.addEventListener('click', toggle);
        star.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') toggle(e);
        });
        // keep the card's own mousedown/touch handlers from firing too
        star.addEventListener('mousedown', e => e.stopPropagation());
        card.appendChild(star);
        return star;
    }

    function sync() {
        observer.disconnect(); // ignore our own DOM changes

        const list = cards();
        list.forEach(card => {
            const star = card.querySelector(':scope > .fav-star') || makeStar(card);
            const on = favs.has(keyOf(card));
            card.classList.toggle('is-fav', on);
            star.classList.toggle('on', on);
            star.setAttribute('aria-pressed', on ? 'true' : 'false');
            star.title = on ? 'Remove from favorites' : 'Add to favorites';
        });

        // Stable pin: favorites first, everything else keeps its current order
        const desired = list.filter(c => c.classList.contains('is-fav'))
            .concat(list.filter(c => !c.classList.contains('is-fav')));
        const changed = desired.some((c, i) => c !== list[i]);
        if (changed) desired.forEach(c => container.appendChild(c));

        observer.observe(container, { childList: true });
    }

    let raf = 0;
    function schedule() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(sync);
    }

    const observer = new MutationObserver(schedule);
    observer.observe(container, { childList: true });

    // Re-sync if the provider label changes (different provider = different favorites)
    const label = document.getElementById('providerLabel');
    if (label) new MutationObserver(schedule).observe(label, { childList: true, characterData: true, subtree: true });

    // Keep tabs in sync
    window.addEventListener('storage', e => {
        if (e.key === KEY) { favs = load(); schedule(); }
    });

    schedule();
})();
