// this idea is mercilessly ripped of jonathan feinberg's wordle applet (with his permission):
// place the words randomly along the x-axis and move them along a spiral in decreasing (count-)order until they
// do not intersect each other.
// at this point, intersection testing goes only down to letter-bounding-box-level. fair enough.
// you might want to play around with this.


var tagmob = (function() {

  var font, fonts = {};

  // YUCK. cufon compatibility hack. needs makeover.
  if (window.Cufon) {
    var cufonRegister = Cufon.registerFont;
    Cufon.registerFont = function(data) {
      font = new Font(data);
      fonts[font.family] = font;
      cufonRegister(data);

    }
  } else {
    window.Cufon = {
      registerFont: function(data) {
        font = new Font(data);
        fonts[font.family] = font;
      }
    }
  }

  var api = {};

  //copied from cufon
  function Font(data) {

    var face = this.face = data.face, wordSeparators = {
      '\u0020': 1,
      '\u00a0': 1,
      '\u3000': 1
    };

    this.glyphs = (function(glyphs) {
      var key, fallbacks = {
        '\u2011': '\u002d',
        '\u00ad': '\u2011'
      };
      for (key in fallbacks) {
        if (!fallbacks.hasOwnProperty(key)) continue;
        if (!glyphs[key]) glyphs[key] = glyphs[fallbacks[key]];
      }
      return glyphs;
    })(data.glyphs);

    this.w = data.w;
    this.baseSize = parseInt(face['units-per-em'], 10);

    this.family = face['font-family'].toLowerCase();
    this.weight = face['font-weight'];
    this.style = face['font-style'] || 'normal';

    this.viewBox = (function () {
      var parts = face.bbox.split(/\s+/);
      var box = {
        minX: parseInt(parts[0], 10),
        minY: parseInt(parts[1], 10),
        maxX: parseInt(parts[2], 10),
        maxY: parseInt(parts[3], 10)
      };
      box.width = box.maxX - box.minX;
      box.height = box.maxY - box.minY;
      box.toString = function() {
        return [ this.minX, this.minY, this.width, this.height ].join(' ');
      };
      return box;
    })();

    this.ascent = -parseInt(face.ascent, 10);
    this.descent = -parseInt(face.descent, 10);

    this.height = -this.ascent + this.descent;

    this.spacing = function(chars, letterSpacing, wordSpacing) {
      var glyphs = this.glyphs, glyph,
        kerning, k,
        jumps = [],
        width = 0, w,
        i = -1, j = -1, chr;
      while (chr = chars[++i]) {
        glyph = glyphs[chr] || this.missingGlyph;
        if (!glyph) continue;
        if (kerning) {
          width -= k = kerning[chr] || 0;
          jumps[j] -= k;
        }
        w = glyph.w;
        if (isNaN(w)) w = +this.w; // may have been a String in old fonts
        if (w > 0) {
          w += letterSpacing;
          if (wordSeparators[chr]) w += wordSpacing;
        }
        width += jumps[++j] = ~~w; // get rid of decimals
        kerning = glyph.k;
      }
      jumps.total = width;
      return jumps;
    };

  }

  var mmin = Math.min,
    mmax = Math.max,
    pow = Math.pow,
    pi_half = Math.PI/2;

  //bezier bbox mercilessly stolen from raphael
  function findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
    var t1 = 1 - t;
    return {
      x: pow(t1, 3) * p1x + pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + pow(t, 3) * p2x,
      y: pow(t1, 3) * p1y + pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + pow(t, 3) * p2y
    };
  }

  // math of this e.g. here: http://pomax.nihongoresources.com/pages/bezier/
  function curveDim(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
    var a = (c2x - 2 * c1x + p1x) - (p2x - 2 * c2x + c1x),
      b = 2 * (c1x - p1x) - 2 * (c2x - c1x),
      c = p1x - c1x,
      t1 = (-b + Math.sqrt(b * b - 4 * a * c)) / 2 / a,
      t2 = (-b - Math.sqrt(b * b - 4 * a * c)) / 2 / a,
      y = [p1y, p2y],
      x = [p1x, p2x],
      dot;
    !isFinite(t1) && (t1 = .5);
    !isFinite(t2) && (t2 = .5);
    if (t1 > 0 && t1 < 1) {
      dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
      x.push(dot.x);
      y.push(dot.y);
    }
    if (t2 > 0 && t2 < 1) {
      dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
      x.push(dot.x);
      y.push(dot.y);
    }
    a = (c2y - 2 * c1y + p1y) - (p2y - 2 * c2y + c1y);
    b = 2 * (c1y - p1y) - 2 * (c2y - c1y);
    c = p1y - c1y;
    t1 = (-b + Math.sqrt(b * b - 4 * a * c)) / 2 / a;
    t2 = (-b - Math.sqrt(b * b - 4 * a * c)) / 2 / a;
    !isFinite(t1) && (t1 = .5);
    !isFinite(t2) && (t2 = .5);
    if (t1 > 0 && t1 < 1) {
      dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
      x.push(dot.x);
      y.push(dot.y);
    }
    if (t2 > 0 && t2 < 1) {
      dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
      x.push(dot.x);
      y.push(dot.y);
    }
    return {
      min_x: mmin.apply(0, x), min_y: mmin.apply(0, y),
      max_x: mmax.apply(0, x), max_y: mmax.apply(0, y)
    };
  }

  function createMergedBbox(box1, box2) {
    return {
      min_x: mmin(box1.min_x, box2.min_x), min_y: mmin(box1.min_y, box2.min_y),
      max_x: mmax(box1.max_x, box2.max_x), max_y: mmax(box1.max_y, box2.max_y)
    };
  }

  function mergeBboxes(box1, box2) {
    box1.min_x = mmin(box1.min_x, box2.min_x);
    box1.min_y = mmin(box1.min_y, box2.min_y);
    box1.max_x = mmax(box1.max_x, box2.max_x);
    box1.max_y = mmax(box1.max_y, box2.max_y);
  }

  function createTranslatedBbox(bbox, x, y) {
    return { min_x: bbox.min_x + x, min_y: bbox.min_y + y, max_x: bbox.max_x + x, max_y: bbox.max_y + y };
  }

  function translateBbox(bbox, x, y) {
    bbox.min_x = bbox.min_x + x;
    bbox.max_x = bbox.max_x + x;
    bbox.min_y = bbox.min_y + y;
    bbox.max_y = bbox.max_y + y;
  }

  function scaleBbox(bbox, scale) {
    bbox.min_x = bbox.min_x * scale;
    bbox.max_x = bbox.max_x * scale;
    bbox.min_y = bbox.min_y * scale;
    bbox.max_y = bbox.max_y * scale;
  }


  function scaleWord(word, scale) {
    word.scale *= scale;
    word.tx *= scale;
    word.ty *= scale;
    scaleBbox(word.bbox, scale);
    for (var i=0; i<word.bboxes.length; i++) {
      scaleBbox(word.bboxes[i], scale);
    }
  }

  function createLeftRotatedBbox(bbox) {
    return {
      min_x: bbox.min_y,
      max_x: bbox.max_y,
      min_y: -bbox.max_x,
      max_y: -bbox.min_x
    };
  }

  function createRightRotatedBbox(bbox) {
    return {
      min_x: -bbox.max_y,
      max_x: -bbox.min_y,
      min_y: bbox.min_x,
      max_y: bbox.max_x
    };
  }

  function doWordsIntersectWithTranslation(words, index, tx, ty) {
    for (var k = 0; k < index; k++) {
      if (intersectsWithTranslation(words[index].bbox, words[k].bbox, tx, ty)) {
        for (var i = words[index].bboxes.length; i--;) {
          for (var j = words[k].bboxes.length; j--;) {
            if (intersectsWithTranslation(words[index].bboxes[i], words[k].bboxes[j], tx, ty)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function intersectsWithTranslation(a, b, tx, ty) {
    return (((a.max_x + tx) > b.min_x) && ((a.min_x + tx) < b.max_x)) && (((a.max_y + ty) > b.min_y) && ((a.min_y + ty) < b.max_y))
  }

  function pointInBbox(x, y, bbox) {
    return bbox.min_y <= y && bbox.max_y >= y && bbox.min_x <= x && bbox.max_x >= x;
  }

  function moveWord(word, tx, ty) {
    translateBbox(word.bbox, tx, ty);
    for (var b = word.bboxes.length; b--;) {
      translateBbox(word.bboxes[b], tx, ty);
    }
    word.tx += tx;
    word.ty += ty;
  }

  // again. thx cufon.
  function interpret(code, context) {
    for (var i = 0, l = code.length; i < l; ++i) {
      var line = code[i];
      context[line.m].apply(context, line.a);
    }
  }

  function generateCodeFromVML(path) {
    var atX = 0, atY = 0, oatX = 0, oatY = 0;
    var code = [], re = /([mrvxe])([^a-z]*)/g, match;
    var bbox = {min_x: 99999, min_y: 99999, max_x: -99999, max_y: -99999};

    generate: for (var i = 0; match = re.exec(path); ++i) {
      var c = match[2].split(',');
      switch (match[1]) {
        case 'v':
          oatX = atX, oatY = atY;
          code[i] = { m: 'bezierCurveTo', a: [ atX + ~~c[0], atY + ~~c[1], atX + ~~c[2], atY + ~~c[3], atX += ~~c[4], atY += ~~c[5] ] };
          bbox = createMergedBbox(bbox, curveDim(oatX, oatY, code[i].a[0], code[i].a[1], code[i].a[2], code[i].a[3], code[i].a[4], code[i].a[5]));
          break;
        case 'r':
          oatX = atX, oatY = atY;
          code[i] = { m: 'lineTo', a: [ atX += ~~c[0], atY += ~~c[1] ] };
          bbox = {
            min_x: mmin(bbox.min_x, mmin(oatX, atX)), min_y: mmin(bbox.min_y, mmin(oatY, atY)),
            max_x: mmax(bbox.max_x, mmax(oatX, atX)), max_y: mmax(bbox.max_y, mmax(oatY, atY))
          };
          break;
        case 'm':
          code[i] = { m: 'moveTo', a: [ atX = ~~c[0], atY = ~~c[1] ] };
          break;
        case 'x':
          code[i] = { m: 'closePath' };
          break;
        case 'e':
          break generate;
      }
    }
    return {code: code, bbox: bbox};
  }

  function initializeWord(chars, scale, rotate, color, insets) {
    var bbox = {min_x: 99999, min_y: 99999, max_x: -99999, max_y: -99999},
      jumps = font.spacing(chars, 0, 0),
      glyphs = font.glyphs, t_bbox, glyph, i = -1, j = -1, chr,
      x = 0, result, bboxes = [];

    while (chr = chars[++i]) {
      glyph = glyphs[chars[i]] || font.missingGlyph;
      if (!glyph) continue;
      if (glyph.d) {
        if (!glyph.code || !glyph.bbox) {
          result = generateCodeFromVML('m' + glyph.d);
          glyph.code = result.code;
          glyph.bbox = result.bbox;
        }
        t_bbox = createTranslatedBbox(glyph.bbox, x, 0);
        bbox = createMergedBbox(bbox, t_bbox);
        bboxes.push(t_bbox);
      }
      x += jumps[++j];
    }
    rotate == 1 && (bbox = createLeftRotatedBbox(bbox));
    rotate == -1 && (bbox = createRightRotatedBbox(bbox));
    scaleBbox(bbox, scale);
    for (var b = bboxes.length; b--;) {
      rotate == 1 && (bboxes[b] = createLeftRotatedBbox(bboxes[b]));
      rotate == -1 && (bboxes[b] = createRightRotatedBbox(bboxes[b]));
      scaleBbox(bboxes[b], scale);
    }

    return {
      text: chars,
      bbox: bbox,
      bboxes: bboxes,
      scale: scale,
      rotate: rotate,
      color: color || '#000000',
      tx: 0,
      ty: 0,
      _tx: 0,
      _ty: 0
    };
  }

  function drawBboxes(word, g) {
    var box;
    g.save();
    g.fill();
    for (var b = word.bboxes.length; b--;) {
      g.save();
      box = word.bboxes[b];
      g.translate(word._tx, word._ty);
      g.rect(box.min_x, box.min_y, box.max_x - box.min_x, box.max_y - box.min_y);
      g.stroke();
      g.restore();
    }
    g.stroke();
    g.restore();
  }

  function renderWord(word, g, color) {
    var chars = word.text,
      jumps = font.spacing(chars, 0, 0),
      glyphs = font.glyphs, glyph, i = -1, j = -1, chr,
      tx = word.tx+.5,
      ty = word.ty+.5;
    g.save();
    g.beginPath();
    if (word.rotate == 1) {
      g.rotate(-pi_half);
      g.translate(-ty, tx);
    } else if (word.rotate == -1) {
      g.rotate(pi_half);
      g.translate(ty, -tx);
    } else {
      g.translate(tx, ty);
    }
    g.scale(word.scale, word.scale);
    while (chr = chars[++i]) {
      glyph = glyphs[chars[i]] || font.missingGlyph;
      if (!glyph) continue;
      if (glyph.d) {
        if (glyph.code) {
          g.beginPath();
          interpret(glyph.code, g);
        }
      }
      g.fillStyle = color || word.color || '#000000';
      g.fill();
      g.translate(jumps[++j], 0);
    }
    g.restore();
  }

  function positionWord(words, index, w, h, opts) {
    var a = opts.a || 1.5, r = 0, phi = 0, x = 0, y = 0;
    var tx = words[index].tx;
    var ty = words[index].ty;
    var phi_delta = opts.phiDelta || 0.5;
    var min_phi_delta = opts.minPhiDelta || 0.15;
    var phi_delta_decr = opts.phiDeltaDecr || 0.006;
    var strokes = 0;
    while (index > 0 && x < w && y < h && doWordsIntersectWithTranslation(words, index, tx + x, ty + y)) {
      phi += phi_delta;
      phi_delta = Math.max(phi_delta - phi_delta_decr, min_phi_delta);
      // a simple linear spiral written as polar
      r = a * phi;
      //r = a * Math.pow(Math.E, b * phi);
      x = r * Math.cos(phi);
      y = r * Math.sin(phi);
      strokes++;
    }
    moveWord(words[index], tx + x, ty + y);
    // console.log("strokes: " + strokes);
  }

  function drawSpiral(w, h, g, opts) {
    g.save()
    g.beginPath();
    var a = opts.a || 1.5, r = 0, phi = 0, x = 0, y = 0;
    var phi_delta = opts.phiDelta || 0.5;
    var min_phi_delta = opts.minPhiDelta || 0.15;
    var phi_delta_decr = opts.phiDeltaDecr || 0.006;
    var strokes = 0;
    while (x < w && y < h) {
      phi += phi_delta;
      phi_delta = Math.max(phi_delta - phi_delta_decr, min_phi_delta);
      // a simple linear spiral written as polar
      r = a * phi;
      //r = a * Math.pow(Math.E, b * phi);
      x = r * Math.cos(phi);
      y = r * Math.sin(phi);
      g.lineTo(x,y);
      g.rect(x-1, y-1, 2, 2);
      strokes++;
    }
    g.stroke();
    // console.log("strokes: " + strokes);
    g.restore();
  }

  function buildScalingFunction(minCount, maxCount, minScale, maxScale) {
    if(maxCount == minCount) maxCount += 1;
    // simple linear distribution
    return function(count) {
      var m = (maxScale - minScale) / (maxCount - minCount);
      return m * count + (minScale - m * minCount);
    };
  }

  api.create = function (words, canvas, opts) {
    if (!words || !canvas) return;

    var options = opts || {},
      defaults = {
        font: "oldsansblack",
        maxCount:  100,
        minCount: 0,
        spiral: {
          a: 1.3,
          phiDelta: 0.7,
          phiDeltaDecr: 0.006,
          minPhiDelta: 0.05
        },

        rotationProbability: 0.5,
        rotationOrientation: 'right',
        color: "#000000",
        insets: {top: 0, left: 0, bottom: 0, right: 0}
      };
    font = fonts[options.font || defaults.font];

    var width = canvas.width,
      height = canvas.height,
      gContext = canvas.getContext('2d'),
      offsetX = width / 2,
      offsetY = height / 2,
      maxHeightPx = options.maxFontHeight || parseInt(mmax(width, height) / 6),
      minHeightPx = options.minFontHeight || 1,
      maxScale = maxHeightPx / font.height,
      minScale = minHeightPx / font.height,
      scale = maxScale,
      rProb = options.rotationProbability || (height / (width + height)),
      rOrient = options.rotationOrientation == 'left' ? 1 : -1,
      minCount = words[0].count || defaults.minCount,
      maxCount = words[words.length - 1].count || defaults.maxCount,
      color = options.color || defaults.color,
      hoverColor = options.hoverColor,
      selectColor = options.selectColor,
      unitToScale = buildScalingFunction(minCount, maxCount, maxScale, minScale),
      onSelect = options.onselect || function() {},
      onUnselect = options.onunselect || function() {},
      onMouseover = options.onmouseover || function() {},
      onMouseout = options.onmouseout || function() {},
      scaleToFit = options.scaleToFit == undefined ? true : options.scaleToFit,
      spiralOptions = options.spiral || defaults.spiral;
      insets = options.insets || defaults.insets,
      paletteLength = options.palette ? options.palette.length : 0;
      globalBbox = {min_x: 1000000, min_y: 1000000, max_x: -1000000, max_y: -1000000};

    w = [];

    gContext.translate(offsetX, offsetY);
    gContext.save();
    for (var i = 0; i < words.length; i++) {
      scale = unitToScale(words[i].count);
      var word_color = words[i].color || (paletteLength > 0 ? options.palette[i % paletteLength] : color);
      w.push(initializeWord(words[i].word, scale, Math.random() < rProb ? rOrient : 0, word_color));
      var xPos = parseInt(i > 0 ? (width / 4.0 - Math.random() * width / 2.0) : (w[i].bbox.min_x - w[i].bbox.max_x) / 2.0);
      moveWord(w[i], xPos, w[i].rotate ? -(w[i].bbox.max_y - w[i].bbox.min_y) / 2.0 : 0);
      if (i > 0) positionWord(w, i, width * 2, height * 2, gContext, spiralOptions);
      mergeBboxes(globalBbox, w[i].bbox);
      if (options.drawBboxes) drawBboxes(w[i], gContext);
    }

    var scaleTo = mmin(width/(globalBbox.max_x - globalBbox.min_x), height/(globalBbox.max_y - globalBbox.min_y));

    for (i = 0; i < words.length; i++) {
      if(scaleToFit) scaleWord(w[i], scaleTo);
      renderWord(w[i], gContext);
    }

    canvas.onclick = function(event) {
      for (var i = 0; i < w.length; i++) {
        if (w[i].over) {
          w[i].selected = true;
          selectHandler(w[i]);
        } else if (w[i].selected) {
          w[i].selected = false;
          unselectHandler(w[i]);
        }
      }
    };

    canvas.onmousemove = function(e) {
      var x, y;
      if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
      } else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
      x -= canvas.offsetLeft+offsetX;
      y -= canvas.offsetTop+offsetY;

      outerLoop:
      for (var i = 0; i < w.length; i++) {
        var over = false;

        if(w[i].over) {
          if(pointInBbox(x, y, w[i].bbox)) {
            for (var j = 0; j < w[i].bboxes.length; j++) {
              if (pointInBbox(x, y, w[i].bboxes[j])) break outerLoop;
            }
          } else {
            mouseOutHandler(w[i]);
            w[i].over = false;
          }
        } else {
          if(pointInBbox(x, y, w[i].bbox)) {
            for (var j = 0; j < w[i].bboxes.length; j++) {
              over = over || pointInBbox(x, y, w[i].bboxes[j]);
            }
          }
          if (over) {
            mouseInHandler(w[i]);
            w[i].over = true;
          }
        }
      }
    };

    function mouseInHandler(word) {
      if(hoverColor && !word.selected) renderWord(word, gContext, hoverColor);
      onMouseover(word);
    }

    function mouseOutHandler(word) {
      if (!word.selected) renderWord(word, gContext);
      onMouseout(word);
    }

    function selectHandler(word) {
      if(selectColor) {

        renderWord(word, gContext, selectColor);
      }
      onSelect(word);
    }

    function unselectHandler(word) {
      renderWord(word, gContext);
      onUnselect(word);
    }

    return canvas;
  },

  api.createFromList = function(element, options) {
    var e, items, numItems, count, wordcolor, words = [], options = options || {};
    if (typeof element == 'string') {
      e = document.getElementById(element);
    } else {
      e = element;
    }

    if(e) {
      items = e.getElementsByTagName('li');
      numItems = items.length;
      for(var i = 0; i<numItems; i++) {
        count = items[i].getAttribute('data-count');
        wordcolor = items[i].getAttribute('data-color');
        count = count || (numItems - i);
        words.push({word: items[i].firstChild.data, count: count, color: wordcolor});
      }
    }

    var canvas = document.createElement("canvas");
    if (options.width) canvas.width = options.width;
    if (options.height) canvas.height = options.height;
    canvas.className = options.className || "tagmob-canvas";

    e.parentNode.insertBefore(canvas, e);
    e.parentNode.removeChild(e);

    api.create(words, canvas, options);

    return function() {
      canvas.width = options.width;
      canvas.height = options.height;
      api.create(words, canvas, options);
    }
  },

  api.showSpiral = function(canvas, options) {
   var width = canvas.width,
      height = canvas.height,
      gContext = canvas.getContext('2d'),
      offsetX = width / 2,
      offsetY = height / 2;
    gContext.save();

    gContext.translate(offsetX, offsetY);
    drawSpiral(2*width, 2*height, gContext, options.spiral || {});

    gContext.restore();
  };



  return api;
})();


