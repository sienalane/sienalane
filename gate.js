// SienaLane password screen.
// This keeps casual visitors out. It is not real security: the site files are public on GitHub.
// To change the password, replace HASH with the SHA-256 of "sl:" + the new password.
(function () {
    var HASH = '7d98c3580cda107a7a734411d19c11cc71dfb490dae8a098c2ada47e582d30f5';
    var KEY = 'sl_gate';

    function saved() {
        try { if (localStorage.getItem(KEY) === HASH || sessionStorage.getItem(KEY) === HASH) return true; } catch (e) {}
        return false;
    }
    if (saved()) return;

    // Hide the page until the right password is entered
    var hide = document.createElement('style');
    hide.id = 'sl-gate-hide';
    hide.textContent = 'html{visibility:hidden!important;overflow:hidden!important}' +
        '#sl-gate{visibility:visible;position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:1.5rem;' +
        'background:linear-gradient(135deg,#6B8E7F 0%,#A8C5B3 100%);font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;color:#3D3D3D}' +
        '#sl-gate form{background:#F5F1E8;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.18);padding:2rem 1.75rem;width:100%;max-width:360px;text-align:center}' +
        '#sl-gate h1{font-size:1.7rem;color:#6B8E7F;margin:0 0 .25rem}' +
        '#sl-gate p{margin:0 0 1.2rem;color:#6B8E7F;font-size:.95rem}' +
        '#sl-gate input[type=password]{width:100%;box-sizing:border-box;padding:.75rem 1rem;border:2px solid #D4E5DC;border-radius:10px;font:inherit;font-size:1rem;background:#fff;color:#3D3D3D;outline:none}' +
        '#sl-gate input[type=password]:focus{border-color:#6B8E7F}' +
        '#sl-gate label.rm{display:flex;align-items:center;justify-content:center;gap:.4rem;margin:.8rem 0;font-size:.88rem;color:#6B8E7F;cursor:pointer}' +
        '#sl-gate button{width:100%;border:none;border-radius:25px;padding:.75rem;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;background:#6B8E7F;color:#F5F1E8}' +
        '#sl-gate button:hover{background:#5a7a6c}' +
        '#sl-gate .err{color:#b4534a;font-size:.9rem;min-height:1.2em;margin-top:.7rem}' +
        '@keyframes slshake{0%,100%{transform:none}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}' +
        '#sl-gate form.shake{animation:slshake .3s}' +
        '@media (prefers-color-scheme:dark){#sl-gate{background:linear-gradient(135deg,#2a3a35,#1a1a1a)}#sl-gate form{background:#242424;color:#e0e0e0}#sl-gate h1,#sl-gate p,#sl-gate label.rm{color:#a8c5b3}#sl-gate input[type=password]{background:#2a2a2a;color:#e0e0e0;border-color:#3a4a45}}';
    document.head.appendChild(hide);

    function sha256(text) {
        var data = new TextEncoder().encode(text);
        return crypto.subtle.digest('SHA-256', data).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        });
    }

    function build() {
        var box = document.createElement('div');
        box.id = 'sl-gate';
        box.innerHTML = '<form autocomplete="on"><h1>SienaLane</h1><p>This site is private. Enter the password to continue.</p>' +
            '<input type="password" name="password" autocomplete="current-password" placeholder="Password" aria-label="Password" required>' +
            '<label class="rm"><input type="checkbox" checked> Remember me on this device</label>' +
            '<button type="submit">Enter</button><div class="err" role="alert"></div></form>';
        document.body.appendChild(box);
        var form = box.querySelector('form'), input = box.querySelector('input[type=password]'),
            remember = box.querySelector('input[type=checkbox]'), err = box.querySelector('.err');
        input.focus();
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!window.crypto || !crypto.subtle) { err.textContent = 'Please open this site over https.'; return; }
            sha256('sl:' + input.value.trim()).then(function (h) {
                if (h === HASH) {
                    try { (remember.checked ? localStorage : sessionStorage).setItem(KEY, HASH); } catch (x) {}
                    box.remove();
                    hide.remove();
                } else {
                    err.textContent = 'That password is not right.';
                    form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
                    input.select();
                }
            });
        });
    }
    if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
