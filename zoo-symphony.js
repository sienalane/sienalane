// Zoo Symphony: every animal you adopt adds its own voice to a looping song.
// All sounds are synthesized with the Web Audio API. No audio files needed.
(function () {
    const MOODS = {
        // bright C major: C, Am, F, G
        day: { bpm: 92, chords: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], lp: 12000 },
        // slower and softer: Am, F, C, G
        night: { bpm: 76, chords: [[-3, 0, 4], [-7, -3, 0], [0, 4, 7], [-5, -1, 2]], lp: 2200 },
        // spooky minor: Am, F, Dm, E
        spooky: { bpm: 84, chords: [[-3, 0, 4], [-7, -3, 0], [-10, -7, -3], [-8, -4, -1]], lp: 4000 }
    };
    let mood = 'day';
    let STEP = 60 / MOODS.day.bpm / 4; // 16th note
    const STEPS = 16;
    let CHORDS = MOODS.day.chords;
    let tone_lp = null;
    const BASE = 261.63; // middle C

    let ctx = null, master = null, comp = null, verb = null, noiseBuf = null;
    let enabled = false, volume = 0.6;
    let timer = null, nextTime = 0, step = 0, bar = 0;
    let levelsFn = () => [];

    const hz = semi => BASE * Math.pow(2, semi / 12);
    // chord tone: idx 0..2 is the triad, 3+ goes up an octave
    function tone(idx, oct) {
        const c = CHORDS[bar % CHORDS.length];
        const o = Math.floor(idx / 3) + (oct || 0);
        return hz(c[((idx % 3) + 3) % 3] + 12 * o);
    }

    function init() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 6;
        master = ctx.createGain();
        master.gain.value = volume;
        tone_lp = ctx.createBiquadFilter();
        tone_lp.type = 'lowpass';
        tone_lp.frequency.value = MOODS[mood].lp;
        // simple echo for a little space
        verb = ctx.createDelay(1);
        verb.delayTime.value = STEP * 3;
        const fb = ctx.createGain(); fb.gain.value = 0.25;
        const wet = ctx.createGain(); wet.gain.value = 0.18;
        verb.connect(fb); fb.connect(verb); verb.connect(wet); wet.connect(comp);
        master.connect(tone_lp); tone_lp.connect(comp); tone_lp.connect(verb);
        comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // ---------- building blocks ----------
    function osc(t, f, dur, o) {
        o = o || {};
        const g = ctx.createGain();
        const s = ctx.createOscillator();
        s.type = o.type || 'sine';
        s.frequency.setValueAtTime(f, t);
        if (o.slide) s.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t + (o.slideTime || dur));
        if (o.vib) {
            const l = ctx.createOscillator(), lg = ctx.createGain();
            l.frequency.value = o.vib; lg.gain.value = f * (o.vibDepth || 0.03);
            l.connect(lg); lg.connect(s.frequency); l.start(t); l.stop(t + dur + 0.1);
        }
        let node = s;
        if (o.lp) {
            const fl = ctx.createBiquadFilter();
            fl.type = 'lowpass'; fl.frequency.setValueAtTime(o.lp, t); fl.Q.value = o.q || 1;
            if (o.lpTo) fl.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
            s.connect(fl); node = fl;
        }
        const peak = (o.gain || 0.2);
        const a = o.attack || 0.005;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + a);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        node.connect(g); g.connect(master);
        s.start(t); s.stop(t + dur + 0.05);
    }
    function noise(t, dur, o) {
        o = o || {};
        const s = ctx.createBufferSource();
        s.buffer = noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = o.type || 'highpass'; f.frequency.value = o.freq || 6000; f.Q.value = o.q || 0.8;
        const g = ctx.createGain();
        g.gain.setValueAtTime(o.gain || 0.1, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(master);
        s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    function kick(t, v) { osc(t, 120, 0.35, { slide: 0.3, slideTime: 0.12, gain: 0.5 * v }); }

    // ---------- one voice per animal (same order as the game) ----------
    // p: steps in the bar where it plays. play(t, v, s) makes the sound at volume v.
    const VOICES = [
        { n: 'Goats', p: [4, 12], play: (t, v) => osc(t, tone(2, 1), 0.28, { type: 'sawtooth', lp: 1800, vib: 11, vibDepth: 0.04, gain: 0.07 * v }) },
        { n: 'Chickens', p: [2, 3, 10, 11], play: (t, v, s) => osc(t, tone(s % 2 ? 1 : 0, 2), 0.09, { type: 'triangle', gain: 0.08 * v }) },
        { n: 'Sheep', p: [0], play: (t, v) => { [0, 1, 2].forEach(i => osc(t, tone(i), STEP * 15, { type: 'sine', attack: 0.4, gain: 0.05 * v })); } },
        { n: 'Flamingos', p: [0, 6, 8, 14], play: (t, v, s) => osc(t, tone([2, 1, 0, 1][[0, 6, 8, 14].indexOf(s)], 1), STEP * 3, { type: 'sine', vib: 5, vibDepth: 0.01, attack: 0.05, gain: 0.1 * v }) },
        { n: 'Otters', p: [1, 5, 9, 13], play: (t, v, s) => osc(t, tone([0, 2, 1, 3][(s - 1) / 4], 1), 0.25, { type: 'sine', gain: 0.14 * v }) },
        { n: 'Alligators', p: [0, 7, 8], play: (t, v) => osc(t, tone(0, -2), STEP * 2.5, { type: 'sawtooth', lp: 400, gain: 0.16 * v }) },
        { n: 'Zebras', p: [2, 6, 10, 14], play: (t, v) => noise(t, 0.06, { freq: 7000, gain: 0.07 * v }) },
        { n: 'Giraffes', p: [0], play: (t, v) => { if (bar % 2 === 0) osc(t, tone(2, 2), STEP * 12, { type: 'triangle', attack: 0.3, gain: 0.05 * v }); } },
        { n: 'Lions', p: [12, 14], play: (t, v) => { osc(t, 90, 0.4, { slide: 0.6, gain: 0.3 * v }); noise(t, 0.12, { type: 'lowpass', freq: 600, gain: 0.08 * v }); } },
        { n: 'Sloths', p: [0], play: (t, v) => { if (bar % 2 === 1) [0, 2].forEach(i => osc(t, tone(i, -1), STEP * 16, { type: 'sawtooth', lp: 700, attack: 0.8, gain: 0.04 * v })); } },
        { n: 'Macaws', p: [3, 7, 15], play: (t, v) => osc(t, tone(1, 2), 0.12, { type: 'sine', slide: 1.5, slideTime: 0.08, gain: 0.07 * v }) },
        { n: 'Gorillas', p: [0, 8, 10], play: (t, v) => kick(t, v) },
        { n: 'Kangaroos', p: [2, 6, 10, 14], play: (t, v) => osc(t, tone(0, -1) * 0.8, 0.18, { type: 'sine', slide: 1.25, slideTime: 0.1, gain: 0.18 * v }) },
        { n: 'Koalas', p: [4, 12], play: (t, v) => { osc(t, tone(1, 1), 0.9, { type: 'sine', gain: 0.07 * v }); osc(t, tone(1, 1) * 2.76, 0.4, { type: 'sine', gain: 0.02 * v }); } },
        { n: 'Monitor Lizards', p: [1, 3, 5, 7, 9, 11, 13, 15], play: (t, v) => noise(t, 0.025, { freq: 9000, gain: 0.04 * v }) },
        { n: 'Penguins', p: [5, 6, 13], play: (t, v, s) => osc(t, tone(s === 6 ? 2 : 0, 2), 0.07, { type: 'square', lp: 3000, gain: 0.04 * v }) },
        { n: 'Sea Lions', p: [8], play: (t, v) => osc(t, tone(0, 0), STEP * 3, { type: 'sawtooth', lp: 1200, slide: 0.85, gain: 0.07 * v }) },
        { n: 'Polar Bears', p: [0], play: (t, v) => osc(t, tone(0, -2), STEP * 16, { type: 'sine', attack: 0.6, gain: 0.14 * v }) },
        { n: 'Pandas', p: [3, 11], play: (t, v) => osc(t, 820, 0.06, { type: 'triangle', gain: 0.14 * v }) },
        { n: 'Tigers', p: [0], play: (t, v) => { if (bar % 2 === 0) osc(t, tone(0, -1), STEP * 14, { type: 'sawtooth', lp: 200, lpTo: 1400, attack: 0.5, gain: 0.05 * v }); } },
        { n: 'Elephants', p: [0], play: (t, v) => { if (bar % 4 === 3) osc(t, tone(0, 0) * 0.9, STEP * 6, { type: 'sawtooth', lp: 900, lpTo: 2600, slide: 1.12, slideTime: 0.2, attack: 0.04, gain: 0.08 * v }); } },
        { n: 'Sea Turtles', p: [0], play: (t, v) => { if (bar % 2 === 1) { osc(t, tone(2, 0), 2.2, { type: 'sine', gain: 0.07 * v }); osc(t, tone(2, 0) * 3, 1.2, { type: 'sine', gain: 0.015 * v }); } } },
        { n: 'Octopuses', p: [0, 3, 6, 9, 12], play: (t, v, s) => osc(t, tone([3, 2, 4, 1, 3][s / 3], 1), 0.14, { type: 'sine', slide: 0.6, slideTime: 0.1, gain: 0.07 * v }) },
        { n: 'Sharks', p: [0, 2, 4, 6, 8, 10, 12, 14], play: (t, v) => osc(t, tone(0, -2), STEP * 0.9, { type: 'square', lp: 300, gain: 0.07 * v }) },
        // rare animals and the Boo at the Zoo bat
        { n: 'Red Panda', p: [0, 4, 8, 12], play: (t, v, s) => osc(t, tone([4, 3, 5, 2][s / 4], 1), 0.5, { type: 'sine', gain: 0.06 * v }) },
        { n: 'Snow Leopard', p: [0], play: (t, v) => { if (bar % 2 === 0) osc(t, tone(4, 1), STEP * 14, { type: 'sine', attack: 0.6, vib: 4, vibDepth: 0.008, gain: 0.05 * v }); } },
        { n: 'Okapi', p: [6, 14], play: (t, v) => osc(t, tone(1, -1), 0.3, { type: 'triangle', lp: 900, gain: 0.14 * v }) },
        { n: 'Vampire Bat', p: [0, 8], play: (t, v, s) => osc(t, tone(s ? 1 : 2, 1), STEP * 7, { type: 'sine', vib: 6, vibDepth: 0.03, slide: s ? 0.94 : 1.06, slideTime: STEP * 6, attack: 0.15, gain: 0.07 * v }) },
    ];

    // more of an animal = a slightly louder voice
    function loudness(level) { return level > 0 ? Math.min(1, 0.45 + Math.log10(level + 1) * 0.25) : 0; }

    function schedule() {
        const levels = levelsFn();
        while (nextTime < ctx.currentTime + 0.12) {
            VOICES.forEach((voice, i) => {
                const lvl = levels[i] || 0;
                if (lvl > 0 && voice.p.includes(step)) voice.play(nextTime, loudness(lvl), step);
            });
            nextTime += STEP;
            step++;
            if (step >= STEPS) { step = 0; bar++; }
        }
    }

    function startLoop() {
        if (!ctx || timer) return;
        nextTime = ctx.currentTime + 0.05;
        step = 0;
        timer = setInterval(schedule, 25);
    }
    function stopLoop() { clearInterval(timer); timer = null; }

    const Sym = {
        voices: VOICES,
        setLevels(fn) { levelsFn = fn; },
        isOn() { return enabled; },
        setOn(on) {
            enabled = on;
            if (on) {
                init();
                if (!ctx) return;
                ctx.resume();
                startLoop();
            } else {
                stopLoop();
                if (ctx) ctx.suspend();
            }
        },
        setMood(m) {
            if (!MOODS[m] || m === mood) return;
            mood = m;
            STEP = 60 / MOODS[m].bpm / 4;
            CHORDS = MOODS[m].chords;
            if (tone_lp) tone_lp.frequency.setTargetAtTime(MOODS[m].lp, ctx.currentTime, 0.5);
            if (verb) verb.delayTime.setTargetAtTime(STEP * 3, ctx.currentTime, 0.1);
        },
        mood() { return mood; },
        setVolume(v) {
            volume = v;
            if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
        },
        // a short solo when a new animal joins the band
        join(i) {
            if (!enabled || !ctx) return;
            const v = VOICES[i];
            const t = ctx.currentTime + 0.02;
            v.p.slice(0, 4).forEach((s, k) => v.play(t + k * STEP * 1.5, 1.2, s));
            osc(t, hz(24), 0.5, { type: 'sine', gain: 0.05 });
            osc(t + 0.08, hz(31), 0.6, { type: 'sine', gain: 0.05 });
        },
        // tiny chime for buying more of an animal you already have
        blip(i) {
            if (!enabled || !ctx) return;
            osc(ctx.currentTime + 0.01, hz(19 + (i % 5) * 2), 0.15, { type: 'triangle', gain: 0.06 });
        },
        coin() {
            if (!enabled || !ctx) return;
            const t = ctx.currentTime + 0.005;
            osc(t, 1320, 0.08, { type: 'square', lp: 4000, gain: 0.025 });
            osc(t + 0.05, 1760, 0.12, { type: 'square', lp: 4000, gain: 0.025 });
        },
        fanfare() {
            if (!enabled || !ctx) return;
            const t = ctx.currentTime + 0.02;
            [0, 4, 7, 12].forEach((s, k) => osc(t + k * 0.1, hz(s + 12), 0.5, { type: 'triangle', gain: 0.08 }));
        }
    };

    document.addEventListener('visibilitychange', () => {
        if (!ctx || !enabled) return;
        if (document.hidden) { stopLoop(); ctx.suspend(); }
        else { ctx.resume(); startLoop(); }
    });

    window.ZooSymphony = Sym;
})();
