/* The drum and the string, by ear.
 *
 * The Drum project's claim is that a drum has no pitch because the zeros of
 * J_n are not evenly spaced, while a string's are. That is a claim about
 * hearing, and a figure can only argue it at second hand -- so this panel
 * plays the two sounds.
 *
 * Both are additive syntheses of the modes the report derives. The mallet, the
 * wave speed and the strike position are the same for both instruments; the
 * string is given the length of the drum's diameter and struck the same
 * distance off centre. The two sounds are then transposed to a common
 * fundamental. Everything left to hear is the ladder of overtones: 1, 1.59,
 * 2.14, ... for the circular rim against 1, 2, 3, ... for the two fixed ends.
 *
 * The difference is much easier to name when the two arrive back to back than
 * when they are half a minute apart, so the panel leads with a single button
 * that plays both in one clip and lights up whichever one is currently
 * sounding. Judging a pitch from memory is hard; judging it against the sound
 * that came four seconds ago is not.
 *
 * The partials below are printed by print_audio_table() in the project's
 * code/make_figures.py -- the same calculation that draws the figures. Each
 * amplitude is the mode's acceleration amplitude B_nm * omega_nm, since a
 * source small compared with a wavelength radiates in proportion to its
 * acceleration, and that is what the ear finally receives.
 */
(function () {
  "use strict";

  var MOUNT_ID = "drum-sound";

  var F0 = 150;          // Hz -- the common fundamental for both sounds
  var SECONDS = 7;       // length of each clip
  var GAP = 0.7;         // silence between the two in the back-to-back clip
  var TAU = 2.6;         // s, decay time of the fundamental
  var DAMPING = 0.55;    // higher partials die faster: tau_k = TAU / ratio^DAMPING
  var LOUDNESS = 0.10;   // r.m.s. both clips are matched to
  var PEAK = 0.9;        // ceiling, so neither clips

  // [frequency / fundamental, amplitude relative to the loudest partial]
  var DRUM = [
    [1.0000, 0.3388], [1.5933, 1.0000], [2.1355, 0.8753], [2.2954, 0.1168],
    [2.6531, 0.5815], [2.9173, 0.8708], [3.1555, 0.3198], [3.5001, 0.7917],
    [3.5985, 0.2828], [3.6475, 0.1519], [4.0589, 0.4793], [4.2304, 0.0651],
    [4.6010, 0.2258], [4.8319, 0.1077], [4.9033, 0.0756], [5.1308, 0.0876],
    [5.4121, 0.0969], [5.5404, 0.1008]
  ];
  var STRING = [
    [1.0, 0.5259], [2.0, 1.0000], [3.0, 0.3452], [4.0, 0.5188],
    [5.0, 0.5799], [6.0, 0.1774], [7.0, 0.0621], [8.0, 0.0743],
    [9.0, 0.0363], [10.0, 0.0221], [11.0, 0.0224], [12.0, 0.0245],
    [13.0, 0.0258], [14.0, 0.0266], [15.0, 0.0273], [16.0, 0.0279],
    [17.0, 0.0284], [18.0, 0.0288]
  ];

  var SOUNDS = [
    {
      key: "drum",
      name: "Circular rim",
      sub: "the drumhead of this project",
      ladder: "1 · 1.59 · 2.14 · 2.30 · 2.65 · 2.92 …",
      verdict: "a thud with no note in it",
      partials: DRUM
    },
    {
      key: "string",
      name: "Two fixed ends",
      sub: "the same mallet on a string",
      ladder: "1 · 2 · 3 · 4 · 5 · 6 …",
      verdict: "a note you could sing back",
      partials: STRING
    }
  ];

  function sound(key) {
    return SOUNDS[0].key === key ? SOUNDS[0] : SOUNDS[1];
  }

  /* ---------------------------------------------------------- synthesis -- */

  function render(ctx, partials) {
    var rate = ctx.sampleRate;
    var n = Math.round(SECONDS * rate);
    var buffer = ctx.createBuffer(1, n, rate);
    var data = buffer.getChannelData(0);

    for (var p = 0; p < partials.length; p++) {
      var ratio = partials[p][0];
      var dw = (2 * Math.PI * F0 * ratio) / rate;
      // Decay by repeated multiplication rather than a call to exp() per
      // sample: it is one multiply, and an exponential stepped this way cannot
      // drift the way a recurrence for the sine would.
      var decay = Math.exp(-1 / (rate * (TAU / Math.pow(ratio, DAMPING))));
      var env = partials[p][1];
      for (var i = 0; i < n; i++) {
        // sin, not cos: the mallet leaves the membrane flat but moving, so
        // every mode starts from zero -- which is also why there is no click.
        data[i] += env * Math.sin(dw * i);
        env *= decay;
      }
    }

    // Ease both ends: three milliseconds in, so eighteen partials starting at
    // once cannot click, and a quarter of a second out, so the clip fades
    // rather than stopping dead at seven seconds.
    var attack = Math.round(0.003 * rate);
    var release = Math.round(0.25 * rate);
    for (var k = 0; k < n; k++) {
      if (k < attack) data[k] *= k / attack;
      if (k > n - release) data[k] *= (n - k) / release;
    }

    // Match the two clips by loudness, which follows the mean square and not
    // the peak. The drum spreads its energy across partials that beat against
    // one another, so equalising the peaks leaves it several decibels the
    // quieter of the two -- and a reader asked to compare pitch would hear the
    // loudness difference instead. PEAK is only a ceiling against clipping.
    var peak = 0;
    var mean = 0;
    for (var j = 0; j < n; j++) {
      if (Math.abs(data[j]) > peak) peak = Math.abs(data[j]);
      mean += data[j] * data[j];
    }
    var rms = Math.sqrt(mean / n);
    var gain = Math.min(rms > 0 ? LOUDNESS / rms : 1, peak > 0 ? PEAK / peak : 1);
    for (var q = 0; q < n; q++) data[q] *= gain;
    return buffer;
  }

  /* ---------------------------------------------------------------- UI -- */

  function element(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function init(mount) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    mount.textContent = "";

    if (!AudioCtx) {
      mount.appendChild(element("p", "listen-status",
        "This browser has no Web Audio support, so the two sounds cannot be " +
        "played here. Figure 4 shows the same comparison as a spectrum."));
      return;
    }

    var ctx = null;
    var source = null;
    var buffers = {};
    var clip = null;       // the segments of what is playing, in order
    var lit = null;        // which card is lit right now
    var mode = null;       // "drum", "string" or "both"
    var startedAt = 0;
    var cards = {};

    var panel = element("div", "listen");
    var pair = element("div", "listen-pair");
    var both = element("button", "listen-ab");
    var meter = element("div", "listen-meter");
    var fill = element("div", "listen-meter-fill");
    var status = element("p", "listen-status",
      "Seven seconds each, one after the other. Try to hum each one back: the " +
      "second is a note, the first is not.");

    both.type = "button";
    both.setAttribute("aria-pressed", "false");
    both.appendChild(element("span", "listen-icon"));
    both.appendChild(element("span", null, "Play both, back to back"));
    meter.appendChild(fill);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    function light(key) {
      if (key === lit) return;
      lit = key;
      SOUNDS.forEach(function (s) {
        var on = s.key === key;
        cards[s.key].classList[on ? "add" : "remove"]("is-playing");
        cards[s.key].setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (key && mode === "both") {
        status.textContent = "Now playing: " + sound(key).name.toLowerCase() +
          " — " + sound(key).verdict + ".";
      }
    }

    function clear() {
      mode = null;
      clip = null;
      light(null);
      both.classList.remove("is-playing");
      both.setAttribute("aria-pressed", "false");
      fill.style.width = "0%";
    }

    function paint() {
      if (!source || !clip) return;
      var elapsed = ctx.currentTime - startedAt;
      fill.style.width = Math.min(100, (elapsed / clip.duration) * 100).toFixed(2) + "%";
      var current = null;
      for (var i = 0; i < clip.segments.length; i++) {
        var seg = clip.segments[i];
        if (elapsed >= seg.at && elapsed < seg.until) current = seg.key;
      }
      light(current);
      window.requestAnimationFrame(paint);
    }

    function stop() {
      if (source) {
        source.onended = null;
        source.stop();
        source = null;
      }
      clear();
    }

    /* Render only what is about to be played, and only once. A seven-second
       buffer is a third of a million samples per partial, so the first play
       has a beat of work to do; say so, and let the browser paint the message
       before the synthesis blocks it. */
    function withBuffers(keys, then) {
      if (!ctx) ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      var missing = keys.filter(function (k) { return !buffers[k]; });
      if (!missing.length) {
        then();
        return;
      }
      status.textContent = "Working out the sound…";
      window.setTimeout(function () {
        missing.forEach(function (k) { buffers[k] = render(ctx, sound(k).partials); });
        then();
      }, 0);
    }

    function join() {
      var rate = ctx.sampleRate;
      var one = buffers.drum.length;
      var gap = Math.round(GAP * rate);
      var out = ctx.createBuffer(1, one * 2 + gap, rate);
      var data = out.getChannelData(0);
      data.set(buffers.drum.getChannelData(0), 0);
      data.set(buffers.string.getChannelData(0), one + gap);
      return out;
    }

    function start(buffer, segments, ending) {
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = function () {
        source = null;
        clear();
        status.textContent = ending;
      };
      clip = { duration: buffer.duration, segments: segments };
      startedAt = ctx.currentTime;
      source.start();
      paint();
    }

    function playOne(s) {
      withBuffers([s.key], function () {
        mode = s.key;
        light(s.key);
        status.textContent = "Playing: " + s.name.toLowerCase() + ".";
        start(buffers[s.key], [{ key: s.key, at: 0, until: SECONDS }],
          s.verdict.charAt(0).toUpperCase() + s.verdict.slice(1) +
          ". Now try the other one.");
      });
    }

    function playBoth() {
      withBuffers(["drum", "string"], function () {
        mode = "both";
        both.classList.add("is-playing");
        both.setAttribute("aria-pressed", "true");
        start(join(), [
          { key: "drum", at: 0, until: SECONDS },
          { key: "string", at: SECONDS + GAP, until: 2 * SECONDS + GAP }
        ], "Same mallet, same strike, same fundamental. The only difference " +
           "between what you just heard twice is where the overtones fall.");
      });
    }

    SOUNDS.forEach(function (s) {
      var card = element("button", "listen-button");
      card.type = "button";
      card.setAttribute("aria-pressed", "false");
      card.appendChild(element("span", "listen-icon"));
      var body = element("span", "listen-body");
      body.appendChild(element("strong", null, s.name));
      body.appendChild(element("span", "listen-sub", s.sub));
      body.appendChild(element("span", "listen-ladder", s.ladder));
      body.appendChild(element("span", "listen-verdict", s.verdict));
      card.appendChild(body);
      card.addEventListener("click", function () {
        var again = mode === s.key;
        stop();
        if (again) {
          status.textContent = "Stopped.";
          return;
        }
        playOne(s);
      });
      cards[s.key] = card;
      pair.appendChild(card);
    });

    both.addEventListener("click", function () {
      var again = mode === "both";
      stop();
      if (again) {
        status.textContent = "Stopped.";
        return;
      }
      playBoth();
    });

    panel.appendChild(both);
    panel.appendChild(meter);
    panel.appendChild(status);
    panel.appendChild(pair);
    mount.appendChild(panel);
  }

  if (window.LectureNotes) {
    window.LectureNotes.ready(function () {
      window.LectureNotes.registerInteractiveFigure(MOUNT_ID, init);
    });
  }
})();
