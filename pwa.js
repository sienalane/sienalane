// Makes the Games section installable as an app and work offline.
(function () {
    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }

    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

    // Inside the app, keep the menu on the games and send the logo home to the games list
    if (standalone) {
        document.documentElement.classList.add('in-app');
        const tidy = () => {
            document.querySelectorAll('.nav-link').forEach(a => {
                if (!/games\.html/.test(a.getAttribute('href') || '')) a.style.display = 'none';
            });
            const logo = document.querySelector('.logo');
            if (logo) { logo.setAttribute('href', 'games.html'); logo.textContent = 'SL Games'; }
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tidy); else tidy();
        return;
    }

    // Install banner on the Games page
    let deferred = null;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; show(); });

    function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

    function show() {
        const box = document.getElementById('installBox');
        if (!box) return;
        let dismissed = false;
        try { dismissed = localStorage.getItem('sl_install_dismissed') === '1'; } catch (e) {}
        if (dismissed) return;
        if (deferred) {
            box.innerHTML = '<div><strong>📲 Get SienaLane Games as an app</strong><span>Add it to your home screen. It opens full screen and works offline.</span></div>' +
                '<div class="ib"><button id="installGo">Install</button><button id="installX" class="x" aria-label="Dismiss">✕</button></div>';
            box.style.display = 'flex';
            document.getElementById('installGo').addEventListener('click', async () => {
                deferred.prompt();
                await deferred.userChoice.catch(() => {});
                deferred = null;
                box.style.display = 'none';
            });
        } else if (isIOS()) {
            box.innerHTML = '<div><strong>📲 Get SienaLane Games as an app</strong><span>In Safari, tap the Share button <b>⬆︎</b>, then <b>Add to Home Screen</b>.</span></div>' +
                '<div class="ib"><button id="installX" class="x" aria-label="Dismiss">✕</button></div>';
            box.style.display = 'flex';
        } else return;
        document.getElementById('installX').addEventListener('click', () => {
            box.style.display = 'none';
            try { localStorage.setItem('sl_install_dismissed', '1'); } catch (e) {}
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
