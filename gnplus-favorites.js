/* GN Plus — favorites add-on
   Adds a heart to every game card and pins favorited games to the top.
   Self-contained: doesn't touch gnplus-stable.js. Stored in localStorage ("gnFavorites"). */
(function () {
    'use strict';

    const KEY = 'gnFavorites';
    const container = document.getElementById('container');
    if (!container) return;

    // Styles are injected here (not in the CSS file) so the heart is always sized correctly,
    // even if the stylesheet is stale in the CDN cache.
    const style = document.createElement('style');
    style.id = 'gn-fav-style';
    style.textContent = `
        .zone-item, .game-btn { position: relative; }
        .fav-heart {
            position: absolute;
            top: 14px; left: 14px;
            z-index: 5;
            width: 20px; height: 20px;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer;
            color: #fff;
            opacity: 0.4;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,0.55));
            transition: opacity 0.15s ease, transform 0.15s ease, color 0.15s ease;
            outline: none;
            -webkit-tap-highlight-color: transparent;
        }
        .fav-heart svg {
            width: 16px; height: 16px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2.2;
            display: block;
            pointer-events: none;
        }
        .zone-item:hover .fav-heart, .game-btn:hover .fav-heart { opacity: 0.9; }
        .fav-heart:hover { opacity: 1; transform: scale(1.15); }
        .fav-heart:focus-visible { opacity: 1; box-shadow: 0 0 0 2px var(--accent, #6366f1); border-radius: 50%; }
        .fav-heart.on { color: var(--accent, #6366f1); opacity: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35)); }
        .fav-heart.on svg { fill: currentColor; }
    `;
    document.head.appendChild(style);

    const HEART_SVG =
        '<svg viewBox="0 0 24 24" width="16" height="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

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

    function makeHeart(card) {
        const heart = document.createElement('span');
        heart.className = 'fav-heart';
        heart.setAttribute('role', 'button');
        heart.tabIndex = 0;
        heart.title = 'Add to favorites';
        heart.innerHTML = HEART_SVG;

        const toggle = e => {
            e.preventDefault();
            e.stopPropagation(); // don't open the game
            const k = keyOf(card);
            if (favs.has(k)) favs.delete(k); else favs.add(k);
            save();
            schedule();
        };
        heart.addEventListener('click', toggle);
        heart.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') toggle(e);
        });
        // keep the card's own mousedown/touch handlers from firing too
        heart.addEventListener('mousedown', e => e.stopPropagation());
        card.appendChild(heart);
        return heart;
    }

    function sync() {
        observer.disconnect(); // ignore our own DOM changes

        const list = cards();
        list.forEach(card => {
            const heart = card.querySelector(':scope > .fav-heart') || makeHeart(card);
            const on = favs.has(keyOf(card));
            card.classList.toggle('is-fav', on);
            heart.classList.toggle('on', on);
            heart.setAttribute('aria-pressed', on ? 'true' : 'false');
            heart.title = on ? 'Remove from favorites' : 'Add to favorites';
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
