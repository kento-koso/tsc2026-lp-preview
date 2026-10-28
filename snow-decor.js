/* Original MARC meshes, reduced to decorative geometry. No scene or texture download. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var paused = document.body.classList.contains('all-motion-paused') || reduce.matches;
  var models = new Map(),
    scenes = [],
    raf = 0,
    last = 0,
    time = 0;
  var vertex =
    'attribute vec3 position;attribute vec3 normal;attribute vec3 color;uniform vec3 angle;uniform float lift;varying vec3 vNormal;varying vec3 vColor;vec3 turn(vec3 p){float c=cos(angle.y),s=sin(angle.y);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);c=cos(angle.x);s=sin(angle.x);p=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);c=cos(angle.z);s=sin(angle.z);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}void main(){vec3 p=turn(position);vNormal=turn(normal);vColor=color;gl_Position=vec4(p.x,p.y+lift,-p.z*.4,1.0);}';
  var fragment =
    'precision mediump float;varying vec3 vNormal;varying vec3 vColor;uniform float ice;void main(){vec3 n=normalize(vNormal);vec3 light=normalize(vec3(-.5,.8,1.0));float diffuse=max(dot(n,light),0.0);float rim=pow(1.0-abs(n.z),2.0);float shine=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.0),28.0);vec3 c=vColor*(.60+.40*diffuse)+vec3(.10,.17,.23)*rim+vec3(shine)*(.15+ice*.4);gl_FragColor=vec4(c,1.0);}';
  function load(name) {
    if (!models.has(name))
      models.set(
        name,
        fetch('img/models/' + name + '.bin').then(function (r) {
          if (!r.ok) throw Error('Decoration unavailable');
          return r.arrayBuffer();
        })
      );
    return models.get(name);
  }
  function shader(gl, type, source) {
    var s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Decoration shader unavailable');
    return s;
  }
  function setup(el, data) {
    var canvas = el.querySelector('canvas'),
      gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
    if (!gl) return;
    var program = gl.createProgram();
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error('Decoration program unavailable');
    gl.useProgram(program);
    var header = new Uint32Array(data, 0, 2),
      buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(data, 8, header[0] * 16), gl.STATIC_DRAW);
    ['position', 'normal', 'color'].forEach(function (name, i) {
      var a = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 3, i === 2 ? gl.UNSIGNED_BYTE : gl.SHORT, true, 16, i * 6);
    });
    var indices = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data, 8 + header[0] * 16, header[1]),
      gl.STATIC_DRAW
    );
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    var scene = {
      el: el,
      canvas: canvas,
      gl: gl,
      count: header[1],
      angle: gl.getUniformLocation(program, 'angle'),
      lift: gl.getUniformLocation(program, 'lift'),
      snowman: el.dataset.model === 'snowman',
      visible: true,
      lost: false
    };
    gl.uniform1f(gl.getUniformLocation(program, 'ice'), scene.snowman ? 0 : 1);
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      scene.lost = true;
      el.classList.remove('is-ready');
    });
    canvas.addEventListener('webglcontextrestored', function () {
      scenes = scenes.filter(function (s) {
        return s !== scene;
      });
      setup(el, data);
    });
    scenes.push(scene);
    el.classList.add('is-ready');
    el.dataset.render = 'webgl';
    resize(scene);
    draw(scene);
    start();
    var visibility = new IntersectionObserver(
      function (entries) {
        scene.visible = entries[0].isIntersecting;
        el.classList.toggle('decor-visible', scene.visible);
        if (scene.visible) {
          draw(scene);
          start();
        }
      },
      { rootMargin: '80px' }
    );
    visibility.observe(el);
  }
  function resize(s) {
    var size = Math.min(560, Math.round(s.el.clientWidth * Math.min(devicePixelRatio, 1.5)));
    if (s.canvas.width !== size) {
      s.canvas.width = size;
      s.canvas.height = size;
      s.gl.viewport(0, 0, size, size);
    }
  }
  function draw(s) {
    if (s.lost) return;
    var gl = s.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3f(
      s.angle,
      s.snowman ? 0.06 : 0.12 + Math.sin(time * 0.32) * 0.18,
      (s.snowman ? 0.12 : 0.3) + Math.sin(time * 0.45) * 0.18,
      s.snowman ? Math.sin(time * 0.37) * 0.025 : 0.25 + Math.sin(time * 0.23) * 0.14
    );
    gl.uniform1f(s.lift, Math.sin(time * 0.7) * 0.025);
    gl.drawElements(gl.TRIANGLES, s.count, gl.UNSIGNED_SHORT, 0);
  }
  function frame(now) {
    raf = 0;
    if (paused || document.hidden) return;
    if (!last) last = now;
    if (now - last >= 32) {
      time += Math.min((now - last) / 1000, 0.08);
      last = now;
      scenes.forEach(function (s) {
        if (s.visible) draw(s);
      });
    }
    if (
      scenes.some(function (s) {
        return s.visible && !s.lost;
      })
    )
      raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function start() {
    if (!raf && !paused && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener('snow-motion-change', function (e) {
    paused = e.detail.paused;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    start();
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else start();
  });
  addEventListener(
    'resize',
    function () {
      scenes.forEach(function (s) {
        resize(s);
        draw(s);
      });
    },
    { passive: true }
  );
  var lazy = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          lazy.unobserve(e.target);
          load(e.target.dataset.model)
            .then(function (data) {
              setup(e.target, data);
            })
            .catch(function () {
              e.target.classList.add('decor-unavailable');
            });
        }
      });
    },
    { rootMargin: '300px' }
  );
  document.querySelectorAll('.winter-decor').forEach(function (el) {
    lazy.observe(el);
  });
})();
