/*
 * motion-engine.js — our own (not Lottie) animation runtime.
 *
 * Pure HTML/CSS/JS. Plays a MotionDoc (see engine/SCHEMA.md).
 * Two layers of API:
 *   - MotionEngine.sample(doc, tSec)  -> pure computed state tree (no DOM; testable in node)
 *   - MotionEngine.create(el, doc, o) -> Player (builds DOM, rAF playback)
 *
 * The math (easing, interpolation, color) is DOM-free so it can be unit-tested.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MotionEngine = api;
})(this, function () {
  'use strict';

  // ----------------------------------------------------------------- color ---
  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }

  function parseColor(c) {
    // accepts {r,g,b,a}, "#RGB"/"#RRGGBB"/"#RRGGBBAA", or "rgb()/rgba()" — animated
    // colors come back from interp() as rgba() strings, so we must handle both forms.
    if (c && typeof c === 'object') return { r: c.r || 0, g: c.g || 0, b: c.b || 0, a: c.a == null ? 1 : c.a };
    if (typeof c !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
    var s = c.trim();
    if (s.charAt(0) === '#') {
      var h = s.slice(1);
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      if (h.length === 6) h += 'ff';
      return {
        r: parseInt(h.slice(0, 2), 16) || 0,
        g: parseInt(h.slice(2, 4), 16) || 0,
        b: parseInt(h.slice(4, 6), 16) || 0,
        a: h.length >= 8 ? (parseInt(h.slice(6, 8), 16) || 0) / 255 : 1,
      };
    }
    var m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      var p = m[1].split(',').map(function (x) { return parseFloat(x); });
      return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] == null || isNaN(p[3]) ? 1 : p[3] };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  function colorToCss(c) {
    return 'rgba(' + Math.round(clamp(c.r, 0, 255)) + ',' + Math.round(clamp(c.g, 0, 255)) +
      ',' + Math.round(clamp(c.b, 0, 255)) + ',' + clamp(c.a, 0, 1) + ')';
  }
  function lerpColor(a, b, e) {
    var ca = parseColor(a), cb = parseColor(b);
    return colorToCss({
      r: ca.r + (cb.r - ca.r) * e,
      g: ca.g + (cb.g - ca.g) * e,
      b: ca.b + (cb.b - ca.b) * e,
      a: ca.a + (cb.a - ca.a) * e
    });
  }

  // ---------------------------------------------------------------- easing ---
  function cubicBezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    function dx(t) { return (3 * ax * t + 2 * bx) * t + cx; }
    function solve(x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x, i, e, d;
      for (i = 0; i < 8; i++) { e = sx(t) - x; if (Math.abs(e) < 1e-6) return t; d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      var lo = 0, hi = 1; t = x;
      for (i = 0; i < 30; i++) { e = sx(t); if (Math.abs(e - x) < 1e-6) break; if (x > e) lo = t; else hi = t; t = (lo + hi) / 2; }
      return t;
    }
    return function (u) { return sy(solve(u)); };
  }

  // Perceptual damped spring. bounce 0 -> no overshoot; 1 -> very wobbly.
  // p(0)=0, settles near p(1)=1. Returns an eased FRACTION (can exceed 1 = overshoot).
  function springFn(bounce) {
    var b = clamp(bounce == null ? 0.3 : bounce, 0, 1);
    var decay = 4 + (1 - b) * 5;       // 4..9 envelope decay
    var freq = b * 6 * Math.PI;        // 0..~18.8 rad -> up to ~3 visible bounces
    return function (u) {
      if (u <= 0) return 0;
      if (u >= 1 && freq === 0) return 1;
      return 1 - Math.exp(-decay * u) * Math.cos(freq * u);
    };
  }

  function makeEasing(easing) {
    if (!easing || easing.type === 'linear') return function (u) { return u; };
    if (easing.type === 'hold') return function () { return 0; };
    if (easing.type === 'cubicBezier') {
      var p = easing.p || [0, 0, 1, 1];
      return cubicBezier(p[0], p[1], p[2], p[3]);
    }
    if (easing.type === 'spring') return springFn(easing.bounce);
    return function (u) { return u; };
  }

  // ------------------------------------------------------- value interpolate ---
  function valueKind(v) {
    if (Array.isArray(v)) return 'vec';
    if (typeof v === 'number') return 'num';
    if (typeof v === 'string' && v.charAt(0) === '#') return 'color';
    return 'step';
  }
  function interp(from, to, e, kind) {
    switch (kind) {
      case 'num': return from + (to - from) * e;
      case 'vec':
        if (!Array.isArray(from) || !Array.isArray(to)) return e >= 1 ? to : from;
        return from.map(function (c, i) { return c + ((to[i] != null ? to[i] : c) - c) * e; });
      case 'color': return lerpColor(from, to, e);
      default: return e >= 1 ? to : from; // step / discrete
    }
  }

  function applyOp(op, base, val) {
    if (op === 'offset') {
      if (Array.isArray(val)) return val.map(function (c, i) { return (Array.isArray(base) ? base[i] : (base || 0)) + c; });
      if (typeof val === 'number') return (typeof base === 'number' ? base : 0) + val;
      return val;
    }
    if (op === 'scale') {
      if (Array.isArray(val)) return val.map(function (c, i) { return (Array.isArray(base) ? base[i] : (base == null ? 1 : base)) * c; });
      if (typeof val === 'number') return (typeof base === 'number' ? base : 1) * val;
      return val;
    }
    return val; // 'set'
  }

  // Interpolate a track's keyframes at absolute time t (no op applied).
  // Convention: a keyframe's easing governs the segment LEAVING it (toward the next).
  function interpKeys(track, t) {
    var ks = track.keys || [];
    if (!ks.length) return undefined;
    if (t <= ks[0].t) return ks[0].v;
    if (t >= ks[ks.length - 1].t) return ks[ks.length - 1].v;
    var i = 0;
    while (i < ks.length - 1 && t >= ks[i + 1].t) i++;
    var k0 = ks[i], k1 = ks[i + 1];
    var dur = k1.t - k0.t;
    var u = dur > 0 ? clamp((t - k0.t) / dur, 0, 1) : 0;
    var e = makeEasing(k0.easing)(u);
    return interp(k0.v, k1.v, e, valueKind(k0.v));
  }

  // Evaluate one isolated track: interpolate + apply its op against its own base.
  function evalTrack(track, t) {
    var raw = interpKeys(track, t);
    if (raw === undefined) return undefined;
    return applyOp(track.op || 'set', track.base, raw);
  }

  // ------------------------------------------------------ compute layer state ---
  // Pure: returns the resolved render state for a single layer at time t.
  function computeLayer(layer, t) {
    var base = layer.base || {};
    var s = {
      x: base.x || 0, y: base.y || 0,
      width: base.width || 0, height: base.height || 0,
      opacity: base.opacity == null ? 1 : base.opacity,
      rotation: base.rotation || 0,
      scaleX: base.scaleX == null ? 1 : base.scaleX,
      scaleY: base.scaleY == null ? 1 : base.scaleY,
      translateX: 0, translateY: 0,
      cornerRadius: (base.cornerRadius || [0, 0, 0, 0]).slice(),
      strokeWeight: base.stroke ? base.stroke.weight : 0,
      fill: base.fill || null,
      fillColorOverride: null,
      polygonCount: (base.shape && base.shape.points) || null,
      trimStart: 0, trimEnd: 1
    };
    // Compose tracks per property IN ORDER (Figma stacks animation styles + manual
    // keyframes as multiple tracks on one property): start from the property base, then
    // apply each track's op (set/offset/scale) against the running value. Last-wins would
    // drop all but one track and is the main reason complex motion diverges.
    var tracks = layer.tracks || [];
    var running = {};
    for (var i = 0; i < tracks.length; i++) {
      var tr = tracks[i];
      var raw = interpKeys(tr, t);
      if (raw == null) continue;
      var prop = tr.property;
      var cur = (prop in running) ? running[prop] : (tr.base != null ? tr.base : null);
      running[prop] = applyOp(tr.op || 'set', cur, raw);
    }
    for (var p in running) {
      var v = running[p];
      if (v == null) continue;
      switch (p) {
        case 'translateX': s.translateX = v; break;
        case 'translateY': s.translateY = v; break;
        case 'translateXY': if (Array.isArray(v)) { s.translateX = v[0]; s.translateY = v[1]; } break;
        case 'rotation': s.rotation = v; break;
        case 'scaleX': s.scaleX = v; break;
        case 'scaleY': s.scaleY = v; break;
        case 'scaleXY': if (Array.isArray(v)) { s.scaleX = v[0]; s.scaleY = v[1]; } break;
        case 'opacity': s.opacity = v; break;
        case 'width': s.width = v; break;
        case 'height': s.height = v; break;
        case 'cornerRadiusTL': s.cornerRadius[0] = v; break;
        case 'cornerRadiusTR': s.cornerRadius[1] = v; break;
        case 'cornerRadiusBR': s.cornerRadius[2] = v; break;
        case 'cornerRadiusBL': s.cornerRadius[3] = v; break;
        case 'strokeWeight': s.strokeWeight = v; break;
        case 'polygonCount': s.polygonCount = v; break;
        case 'fillColor': s.fillColorOverride = v; break;
        case 'trimStart': s.trimStart = v; break;
        case 'trimEnd': s.trimEnd = v; break;
        default: break;
      }
    }
    return s;
  }

  // Pure sample of the whole document at time t -> nested computed tree (for tests / inspection).
  function sample(doc, t) {
    function walk(layer) {
      return {
        id: layer.id, name: layer.name, type: layer.type,
        state: computeLayer(layer, t),
        children: (layer.children || []).map(walk)
      };
    }
    return { duration: doc.duration, layers: (doc.layers || []).map(walk) };
  }

  // ------------------------------------------------------------------ paint ---
  function paintToCss(paint) {
    if (!paint) return 'transparent';
    if (paint.type === 'solid') return colorToCss(parseColor(paint.color));
    if (paint.type === 'linear') {
      var stops = (paint.stops || []).map(function (st) {
        return colorToCss(parseColor(st.color)) + ' ' + (st.pos * 100) + '%';
      }).join(', ');
      return 'linear-gradient(' + ((paint.angle == null ? 180 : paint.angle)) + 'deg, ' + stops + ')';
    }
    if (paint.type === 'image' && paint.src) return 'center/cover no-repeat url(' + paint.src + ')';
    return 'transparent';
  }

  // ------------------------------------------------------------- effects ---
  // Figma effects -> CSS. Drop/inner shadows compose into box-shadow; layer blur into a
  // filter; background blur into backdrop-filter. (We can't reproduce Figma's exact blur
  // kernel, but CSS blur is visually close.)
  function effectsToCss(effects) {
    var shadows = [], filter = '', backdrop = '';
    for (var i = 0; i < (effects || []).length; i++) {
      var e = effects[i];
      if (e.visible === false) continue;
      if (e.type === 'drop' || e.type === 'inner') {
        var col = colorToCss(parseColor(e.color || '#00000040'));
        shadows.push((e.type === 'inner' ? 'inset ' : '') + (e.x || 0) + 'px ' + (e.y || 0) + 'px ' +
          (e.radius || 0) + 'px ' + (e.spread || 0) + 'px ' + col);
      } else if (e.type === 'blur') {
        filter += ' blur(' + (e.radius || 0) / 2 + 'px)';
      } else if (e.type === 'bgblur') {
        backdrop += ' blur(' + (e.radius || 0) / 2 + 'px)';
      }
    }
    return { boxShadow: shadows.join(', '), filter: filter.trim(), backdrop: backdrop.trim() };
  }

  // -------------------------------------------------------------- shapes ---
  // A regular N-gon (or sampled morph for fractional N) as a CSS clip-path polygon().
  // We sample the perimeter at a fixed point count so a fractional `n` (POLYGON_COUNT
  // mid-morph, e.g. 3 -> 11) traces a continuously-deforming outline instead of snapping.
  function ngonVertex(k, n, rot) {
    var ang = (-90 + rot + (k % n) * 360 / n) * Math.PI / 180;
    return [50 + 50 * Math.cos(ang), 50 + 50 * Math.sin(ang)];
  }
  function polygonClip(n, rot, samples) {
    if (!(n >= 3)) n = 3;
    rot = rot || 0;
    var isInt = Math.abs(n - Math.round(n)) < 1e-4;
    var pts = [], i;
    if (isInt) {
      var ni = Math.round(n);
      for (i = 0; i < ni; i++) { var v = ngonVertex(i, ni, rot); pts.push(v[0].toFixed(2) + '% ' + v[1].toFixed(2) + '%'); }
    } else {
      var S = samples || 72;
      for (i = 0; i <= S; i++) {
        var vk = (i / S) * n, k0 = Math.floor(vk), f = vk - k0;
        var a = ngonVertex(k0, n, rot), b = ngonVertex(k0 + 1, n, rot);
        var x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
        pts.push(x.toFixed(2) + '% ' + y.toFixed(2) + '%');
      }
    }
    return 'polygon(' + pts.join(', ') + ')';
  }
  // N-point star clip-path (outer radius 50%, inner = 50%*ratio).
  function starClip(n, ratio, rot) {
    if (!(n >= 3)) n = 3;
    n = Math.round(n); rot = rot || 0;
    var ir = 50 * (ratio == null ? 0.4 : ratio), pts = [];
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 === 0 ? 50 : ir;
      var ang = (-90 + rot + i * 180 / n) * Math.PI / 180;
      pts.push((50 + r * Math.cos(ang)).toFixed(2) + '% ' + (50 + r * Math.sin(ang)).toFixed(2) + '%');
    }
    return 'polygon(' + pts.join(', ') + ')';
  }
  function shapeClip(shape, count) {
    if (!shape) return '';
    if (shape.kind === 'polygon') return polygonClip(count != null ? count : shape.points, shape.rot || 0);
    if (shape.kind === 'star') return starClip(count != null ? count : shape.points, shape.ratio, shape.rot || 0);
    return '';
  }

  // ------------------------------------------------------------- caustics ---
  // Procedural animated water caustics (Figma "Water caustic" shader/effect). Rendered
  // into a canvas that fills the layer box and is clipped to the (morphing/scaling)
  // polygon — so it flows AND fills the shape, instead of a frozen PNG snapshot.
  // Cheap sum-of-sines interference field, sharpened into thin bright veins over a
  // blue base. Internal resolution is fixed; CSS scales it with the layer transform.
  function drawCaustics(ent, t) {
    var ctx = ent.ctx, W = ent.w, H = ent.h;
    var img = ent.img || (ent.img = ctx.createImageData(W, H));
    var d = img.data, i = 0;
    for (var y = 0; y < H; y++) {
      var fy = y / H;
      for (var x = 0; x < W; x++) {
        var fx = x / W;
        // moving interference field (several octaves in different directions); high
        // frequencies -> the fine, dense, interlocking caustic network Figma's water shows.
        var v = Math.sin(fx * 18.0 + t * 0.9)
              + Math.sin(fy * 20.0 - t * 1.05)
              + Math.sin((fx * 13.0 + fy * 15.0) + t * 0.7)
              + Math.sin((fx * 15.0 - fy * 12.0) - t * 0.85)
              + 0.6 * Math.sin(((fx - 0.5) * (fx - 0.5) + (fy - 0.5) * (fy - 0.5)) * 90.0 - t * 1.3);
        // sharpen into thin bright caustic veins
        var c = Math.abs(Math.sin(v * 1.1));
        c = c * c; c = c * c; c = c * c;          // ~pow 8 -> thin lines
        // slow large-scale brightness variation of the (light) water base
        var base = 0.55 + 0.15 * Math.sin(fx * 3.0 + fy * 2.0 + t * 0.3);
        var r = 96 + base * 60 + c * 150;
        var g = 156 + base * 60 + c * 99;
        var b = 216 + base * 36 + c * 39;
        d[i++] = r > 255 ? 255 : r;
        d[i++] = g > 255 ? 255 : g;
        d[i++] = b > 255 ? 255 : b;
        d[i++] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  var _uid = 0;
  // Build an inline SVG for a vector layer. Path coords are in the node's local px space
  // (== user units, no viewBox scaling) so they map 1:1 and overflow visibly — important
  // for zero-height shapes like an arrow/line whose thickness comes entirely from stroke.
  function buildPathSvg(el, b) {
    var shp = b.shape, NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    // Size the SVG to the path's own coordinate space (px == user units, no viewBox
    // scaling) so coords map 1:1. A zero-area SVG viewport paints NOTHING even with
    // overflow:visible, so we floor the dimensions; the path/stroke then overflow freely
    // (critical for a 0-height line/arrow whose thickness is all stroke).
    var vw = shp.vw != null ? shp.vw : (b.width || 1);
    var vh = shp.vh != null ? shp.vh : (b.height || 1);
    svg.style.position = 'absolute';
    svg.style.left = '0'; svg.style.top = '0';
    svg.style.width = Math.max(vw, 1) + 'px';
    svg.style.height = Math.max(vh, 1) + 'px';
    svg.style.overflow = 'visible';
    var paths = shp.paths || [];
    el._svgPaths = [];
    var defs = null;
    for (var i = 0; i < paths.length; i++) {
      var pd = paths[i], p = document.createElementNS(NS, 'path');
      var col = colorToCss(parseColor(pd.stroke || (b.stroke && b.stroke.color) || '#000000ff'));
      p.setAttribute('d', pd.d || '');
      p.setAttribute('fill', pd.fill ? colorToCss(parseColor(pd.fill)) : 'none');
      if (pd.stroke || (b.stroke && b.stroke.color)) {
        p.setAttribute('stroke', col);
        p.setAttribute('stroke-width', pd.strokeWidth != null ? pd.strokeWidth : (b.stroke ? b.stroke.weight : 1));
        p.setAttribute('stroke-linecap', pd.cap || 'butt');
        p.setAttribute('stroke-linejoin', 'round');
      }
      // arrow end/start caps: SVG marker in strokeWidth units so the head scales with the
      // stroke (matches how Figma grows a line's arrowhead with its weight).
      if (pd.markerEnd === 'arrow' || pd.markerStart === 'arrow') {
        if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs); }
        var mid = 'mk' + (_uid++);
        var mk = document.createElementNS(NS, 'marker');
        mk.setAttribute('id', mid);
        mk.setAttribute('viewBox', '0 0 10 10');
        mk.setAttribute('refX', '7'); mk.setAttribute('refY', '5');
        mk.setAttribute('markerUnits', 'strokeWidth');
        mk.setAttribute('markerWidth', '4'); mk.setAttribute('markerHeight', '4');
        mk.setAttribute('orient', 'auto');
        var tri = document.createElementNS(NS, 'path');
        tri.setAttribute('d', 'M0 0 L10 5 L0 10 z');
        tri.setAttribute('fill', col);
        mk.appendChild(tri); defs.appendChild(mk);
        if (pd.markerEnd === 'arrow') p.setAttribute('marker-end', 'url(#' + mid + ')');
        if (pd.markerStart === 'arrow') p.setAttribute('marker-start', 'url(#' + mid + ')');
      }
      svg.appendChild(p);
      el._svgPaths.push(p);
    }
    el.appendChild(svg);
  }

  // -------------------------------------------------------------- DOM mount ---
  function buildLayerDom(layer, doc) {
    var el = document.createElement('div');
    el.setAttribute('data-id', layer.id || '');
    var b = layer.base || {};
    var st = el.style;
    st.position = 'absolute';
    st.left = (b.x || 0) + 'px';
    st.top = (b.y || 0) + 'px';
    st.width = (b.width || 0) + 'px';
    st.height = (b.height || 0) + 'px';
    st.boxSizing = 'border-box';
    var anchor = b.anchor || { x: 0.5, y: 0.5 };
    st.transformOrigin = (anchor.x * 100) + '% ' + (anchor.y * 100) + '%';
    st.willChange = 'transform, opacity';
    if (b.clip) st.overflow = 'hidden';

    // effects (shadows / blur) apply to every painted type
    if (b.effects && b.effects.length) {
      var fx = effectsToCss(b.effects);
      if (fx.boxShadow) st.boxShadow = fx.boxShadow;
      if (fx.filter) st.filter = fx.filter;
      if (fx.backdrop) { st.backdropFilter = fx.backdrop; st.webkitBackdropFilter = fx.backdrop; }
    }
    var isPath = b.shape && b.shape.kind === 'path';
    var isClip = b.shape && (b.shape.kind === 'polygon' || b.shape.kind === 'star');
    var causticHere = null;

    if (layer.type === 'text' && b.text) {
      var tx = b.text;
      st.display = 'flex';
      st.alignItems = 'center';
      st.justifyContent = tx.align === 'center' ? 'center' : tx.align === 'right' ? 'flex-end' : 'flex-start';
      st.fontFamily = (tx.fontFamily || 'Inter') + ', system-ui, sans-serif';
      st.fontSize = (tx.fontSize || 16) + 'px';
      st.fontWeight = tx.fontWeight || 400;
      st.lineHeight = (tx.lineHeight || 1.2);
      st.letterSpacing = (tx.letterSpacing || 0) + 'px';
      st.color = colorToCss(parseColor(tx.color || '#000000FF'));
      st.whiteSpace = 'pre';
      el.textContent = tx.characters || '';
    } else if (isPath) {
      // real vector geometry -> inline SVG: resolution-independent, stroke animates
      buildPathSvg(el, b);
    } else {
      // rect / ellipse / polygon / star — fill is a procedural shader, a raster texture, or a native paint
      var isCaustic = b.shader && b.shader.kind === 'caustics';
      if (isCaustic) {
        // animated water caustics: a canvas filling the box, clipped to the shape and
        // scaled by the layer transform. Replaces the frozen PNG so the water flows and
        // fills the (morphing/scaling) polygon — matching Figma's "Water caustic" effect.
        var cv = document.createElement('canvas');
        var CRES = 360;
        cv.width = CRES; cv.height = CRES;
        cv.style.position = 'absolute'; cv.style.left = '0'; cv.style.top = '0';
        cv.style.width = '100%'; cv.style.height = '100%';
        cv.style.display = 'block';
        el.appendChild(cv);
        causticHere = { canvas: cv, ctx: cv.getContext('2d'), w: CRES, h: CRES };
      } else if (b.image) {
        st.backgroundImage = 'url(' + b.image + ')';
        st.backgroundSize = '100% 100%';
        st.backgroundRepeat = 'no-repeat';
      } else {
        st.background = paintToCss(b.fill);
      }
      if (isClip) {
        var cp = shapeClip(b.shape, b.shape.points);
        st.clipPath = cp; st.webkitClipPath = cp;
      } else if (layer.type === 'ellipse') {
        st.borderRadius = '50%';
      } else if (!b.image && !isCaustic) {
        var cr = b.cornerRadius || [0, 0, 0, 0];
        st.borderRadius = cr[0] + 'px ' + cr[1] + 'px ' + cr[2] + 'px ' + cr[3] + 'px';
      }
    }
    // stroke: SVG paths carry their own stroke; clip-path shapes can't use a CSS border
    // (it isn't clipped), so they fall back to the texture/fill only.
    if (b.stroke && !isPath && !isClip) {
      st.border = (b.stroke.weight || 1) + 'px solid ' + colorToCss(parseColor(b.stroke.color || '#000000FF'));
    }

    var entry = { layer: layer, el: el };
    var entries = [entry];
    var maskEntries = [];
    var caustics = causticHere ? [causticHere] : [];
    var kids = layer.children || [];

    // Figma "Mask group": one child is a mask.
    var maskIdx = -1;
    for (var mi = 0; mi < kids.length; mi++) { if (kids[mi].isMask) { maskIdx = mi; break; } }

    if (maskIdx >= 0 && kids[maskIdx].type === 'text') {
      // TEXT-as-mask reveal: the text IS what shows (don't hide it). The other sibling
      // (a growing bar etc.) drives a left-to-right reveal — clip the text to its rect.
      var tBuilt = buildLayerDom(kids[maskIdx], doc);
      el.appendChild(tBuilt.el);
      entries = entries.concat(tBuilt.entries);
      maskEntries = maskEntries.concat(tBuilt.maskEntries);
      caustics = caustics.concat(tBuilt.caustics);
      var driver = null;
      for (var di = 0; di < kids.length; di++) { if (di !== maskIdx) { driver = kids[di]; break; } }
      if (driver) maskEntries.push({ wrapper: tBuilt.el, mask: driver, w: (b.width || 0), h: (b.height || 0) });
      // the driver/content siblings are the reveal mechanism — not painted on their own
    } else if (maskIdx >= 0) {
      // SHAPE mask: clip the (painted) siblings to the mask's shape; the mask isn't painted.
      var clip = document.createElement('div');
      clip.style.position = 'absolute';
      clip.style.left = '0'; clip.style.top = '0';
      clip.style.width = (b.width || 0) + 'px';
      clip.style.height = (b.height || 0) + 'px';
      el.appendChild(clip);
      for (var ci = 0; ci < kids.length; ci++) {
        if (ci === maskIdx) continue; // the mask itself is not painted
        var builtM = buildLayerDom(kids[ci], doc);
        clip.appendChild(builtM.el);
        entries = entries.concat(builtM.entries);
        maskEntries = maskEntries.concat(builtM.maskEntries);
        caustics = caustics.concat(builtM.caustics);
      }
      maskEntries.push({ wrapper: clip, mask: kids[maskIdx], w: (b.width || 0), h: (b.height || 0) });
    } else {
      for (var i = 0; i < kids.length; i++) {
        var built = buildLayerDom(kids[i], doc);
        el.appendChild(built.el);
        entries = entries.concat(built.entries);
        maskEntries = maskEntries.concat(built.maskEntries);
        caustics = caustics.concat(built.caustics);
      }
    }
    return { el: el, entries: entries, maskEntries: maskEntries, caustics: caustics };
  }

  function applyState(el, layer, s) {
    el.style.transform =
      'translate(' + s.translateX + 'px,' + s.translateY + 'px) ' +
      'rotate(' + s.rotation + 'deg) ' +
      'scale(' + s.scaleX + ',' + s.scaleY + ')';
    el.style.opacity = s.opacity;
    if (layer.base && layer.base.width !== s.width) el.style.width = s.width + 'px';
    if (layer.base && layer.base.height !== s.height) el.style.height = s.height + 'px';
    var b = layer.base || {};
    var shape = b.shape;
    // animated polygon/star: re-derive the clip-path from the (possibly morphing) count
    if (shape && (shape.kind === 'polygon' || shape.kind === 'star')) {
      var cp = shapeClip(shape, s.polygonCount != null ? s.polygonCount : shape.points);
      el.style.clipPath = cp; el.style.webkitClipPath = cp;
    }
    // animated vector stroke width -> update each SVG path
    if (shape && shape.kind === 'path' && el._svgPaths) {
      for (var pi = 0; pi < el._svgPaths.length; pi++) {
        var pd = (shape.paths || [])[pi] || {};
        if (pd.stroke || (b.stroke && b.stroke.color)) el._svgPaths[pi].setAttribute('stroke-width', s.strokeWeight);
        if (s.fillColorOverride != null && pd.fill) el._svgPaths[pi].setAttribute('fill', colorToCss(parseColor(s.fillColorOverride)));
      }
    }
    var isImg = b.image;
    if (layer.type !== 'text' && !isImg && shape == null) {
      if (s.fillColorOverride != null) el.style.background = colorToCss(parseColor(s.fillColorOverride));
      if (layer.type !== 'ellipse') {
        var cr = s.cornerRadius;
        el.style.borderRadius = cr[0] + 'px ' + cr[1] + 'px ' + cr[2] + 'px ' + cr[3] + 'px';
      }
    } else if (layer.type !== 'text' && !isImg && (shape.kind === 'polygon' || shape.kind === 'star')) {
      if (s.fillColorOverride != null) el.style.background = colorToCss(parseColor(s.fillColorOverride));
    } else if (s.fillColorOverride != null && layer.type === 'text') {
      el.style.color = colorToCss(parseColor(s.fillColorOverride));
    }
  }

  function Player(container, doc, opts) {
    opts = opts || {};
    this.doc = doc;
    this.duration = doc.duration || 1;
    this.loop = opts.loop !== false;
    this.onframe = opts.onframe || null;
    this.rate = opts.rate || 1;
    this.time = 0;
    this._raf = null;
    this._playing = false;

    container.innerHTML = '';
    var stage = document.createElement('div');
    stage.style.position = 'relative';
    stage.style.overflow = 'hidden';
    var sz = doc.stage || { width: 300, height: 300 };
    stage.style.width = sz.width + 'px';
    stage.style.height = sz.height + 'px';
    stage.style.background = sz.background ? colorToCss(parseColor(sz.background)) : 'transparent';
    this.stage = stage;
    container.appendChild(stage);

    this.entries = [];
    this.maskEntries = [];
    this.caustics = [];
    var layers = doc.layers || [];
    for (var i = 0; i < layers.length; i++) {
      var built = buildLayerDom(layers[i], doc);
      stage.appendChild(built.el);
      this.entries = this.entries.concat(built.entries);
      this.maskEntries = this.maskEntries.concat(built.maskEntries);
      this.caustics = this.caustics.concat(built.caustics);
    }
    this.renderAt(0, true);
  }

  Player.prototype.renderAt = function (t, silent) {
    this.time = t;
    for (var i = 0; i < this.entries.length; i++) {
      var e = this.entries[i];
      try { applyState(e.el, e.layer, computeLayer(e.layer, t)); } catch (err) { /* one bad layer never breaks the rest */ }
    }
    // Update mask reveals: clip each masked group to its (animated) mask rectangle.
    var masks = this.maskEntries || [];
    for (var m = 0; m < masks.length; m++) {
      try {
        var me = masks[m];
        var ms = computeLayer(me.mask, t);
        var left = ms.x + ms.translateX, top = ms.y + ms.translateY;
        var w = ms.width * ms.scaleX, h = ms.height * ms.scaleY;
        var iTop = Math.max(0, top), iLeft = Math.max(0, left);
        var iRight = Math.max(0, me.w - (left + w)), iBottom = Math.max(0, me.h - (top + h));
        me.wrapper.style.clipPath = 'inset(' + iTop + 'px ' + iRight + 'px ' + iBottom + 'px ' + iLeft + 'px)';
      } catch (err) {}
    }
    // Redraw animated shader fills (water caustics) for the current time.
    var cs = this.caustics || [];
    for (var ci = 0; ci < cs.length; ci++) { try { drawCaustics(cs[ci], t); } catch (err) {} }
    // `silent` skips onframe — used during construction, before the caller has the Player ref.
    if (!silent && this.onframe) { try { this.onframe(t, this.duration ? t / this.duration : 0); } catch (err) {} }
  };

  Player.prototype.seek = function (t) { this.renderAt(clamp(t, 0, this.duration)); };
  Player.prototype.seekFraction = function (f) { this.seek(f * this.duration); };

  function nowMs() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  Player.prototype.play = function () {
    if (this._playing) return;
    this._playing = true;
    var self = this;
    var base = nowMs() - (self.time / self.rate) * 1000;
    function frame(now) {
      if (!self._playing) return;
      var t = ((now - base) / 1000) * self.rate;
      if (t >= self.duration) {
        if (self.loop) { base = now; t = 0; }
        else { self.renderAt(self.duration); self._playing = false; return; }
      }
      self.renderAt(t);
      self._raf = requestAnimationFrame(frame);
    }
    self._raf = requestAnimationFrame(frame);
  };

  Player.prototype.pause = function () {
    this._playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  };
  Player.prototype.stop = function () { this.pause(); this.renderAt(0); };
  Player.prototype.toggle = function () { this._playing ? this.pause() : this.play(); };
  Player.prototype.setRate = function (r) { this.rate = r || 1; if (this._playing) { this.pause(); this.play(); } };

  function create(container, doc, opts) { return new Player(container, doc, opts); }

  return {
    create: create,
    Player: Player,
    sample: sample,
    computeLayer: computeLayer,
    // exposed for tests / reuse:
    _easing: { cubicBezier: cubicBezier, spring: springFn, make: makeEasing },
    _color: { parse: parseColor, toCss: colorToCss, lerp: lerpColor },
    _shapes: { polygonClip: polygonClip, starClip: starClip, shapeClip: shapeClip, effectsToCss: effectsToCss },
    _evalTrack: evalTrack
  };
});
