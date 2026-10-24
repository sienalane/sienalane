// Shared helpers for SienaLane games
(function () {
    const G = {};

    // Day number in the player's local time, counted from Jan 1, 2026
    G.dayNumber = function () {
        const now = new Date();
        const start = new Date(2026, 0, 1);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.round((today - start) / 86400000);
    };

    G.dateLabel = function () {
        return new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    };

    G.rng = function (seed) {
        let s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };

    G.shuffle = function (arr, rand) {
        const a = arr.slice();
        rand = rand || Math.random;
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    G.load = function (key, fallback) {
        try {
            const v = localStorage.getItem('sl_' + key);
            return v ? JSON.parse(v) : fallback;
        } catch (e) { return fallback; }
    };

    G.save = function (key, value) {
        try { localStorage.setItem('sl_' + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
    };

    let toastTimer;
    G.toast = function (msg, ms) {
        let el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), ms || 1600);
    };

    G.share = function (text) {
        if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
            navigator.share({ text: text }).catch(() => {});
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => G.toast('Copied to clipboard'), () => G.toast('Could not copy'));
        } else {
            G.toast('Could not copy');
        }
    };

    G.shake = function (el) {
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    };

    // Daily / Unlimited tab bar. onChange(mode) is called with 'daily' or 'free'.
    G.modeTabs = function (container, onChange) {
        const btns = container.querySelectorAll('button[data-mode]');
        btns.forEach(b => b.addEventListener('click', () => {
            btns.forEach(x => x.classList.toggle('on', x === b));
            onChange(b.dataset.mode);
        }));
    };

    window.GameKit = G;
})();
