// Minimal Cubism Core + WebGL renderer for a local model smoke test.
// Core computes mesh vertices; WebGL draws them with simple binary stencil masks.
const core = require('./core.min');

function waitForCore() {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      try { core.Version.csmGetVersion(); resolve(); }
      catch (error) { if (++tries < 100) setTimeout(check, 20); else reject(error); }
    };
    check();
  });
}

function readFile(path, encoding) {
  return new Promise((resolve, reject) => wx.getFileSystemManager().readFile({
    filePath: path,
    ...(encoding ? { encoding } : {}),
    success: result => resolve(result.data),
    fail: reject
  }));
}

function loadImage(canvas, path) {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`texture failed: ${path}`));
    image.src = `/${path}`;
  });
}

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
  return result;
}

function program(gl) {
  const result = gl.createProgram();
  gl.attachShader(result, shader(gl, gl.VERTEX_SHADER,
    'attribute vec2 position; attribute vec2 uv; uniform vec2 scale; uniform vec2 center; varying vec2 texcoord; void main(){gl_Position=vec4((position-center)*scale,0.,1.);texcoord=uv;}'));
  gl.attachShader(result, shader(gl, gl.FRAGMENT_SHADER,
    'precision mediump float; varying vec2 texcoord; uniform sampler2D texture0; uniform float opacity; uniform float maskPass; void main(){vec4 color=texture2D(texture0,texcoord); if(maskPass>0.5 && color.a<0.5) discard; gl_FragColor=vec4(color.rgb,color.a*opacity);}'));
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
  return result;
}

async function start(canvas, width, height, manifestPath, getState) {
  const gl = canvas.getContext('webgl', { alpha: true, stencil: true });
  if (!gl) throw new Error('WebGL context unavailable');
  await waitForCore();
  const base = manifestPath.slice(0, manifestPath.lastIndexOf('/') + 1);
  const settings = JSON.parse(await readFile(manifestPath, 'utf8'));
  const refs = settings.FileReferences;
  if (!refs || !refs.Moc || !refs.Textures || !refs.Textures.length) throw new Error('invalid model3.json');
  const mocData = await readFile(base + refs.Moc, refs.Moc.endsWith('.json') ? 'utf8' : undefined);
  const moc = core.Moc.fromArrayBuffer(refs.Moc.endsWith('.json') ? wx.base64ToArrayBuffer(JSON.parse(mocData).base64) : mocData);
  if (!moc) throw new Error('moc3 not supported by Cubism Core');
  const model = core.Model.fromMoc(moc);
  if (!model) throw new Error('failed to create Cubism model');
  const d = model.drawables;
  const textures = [];
  for (const name of refs.Textures) {
    const image = await loadImage(canvas, base + name);
    if (Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error('texture exceeds GPU limit');
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    textures.push(texture);
  }

  const ratio = wx.getSystemInfoSync().pixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  gl.viewport(0, 0, canvas.width, canvas.height);
  const p = program(gl);
  gl.useProgram(p);
  const pos = gl.getAttribLocation(p, 'position'), uv = gl.getAttribLocation(p, 'uv');
  const posBuffer = gl.createBuffer(), uvBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer();
  gl.enableVertexAttribArray(pos); gl.enableVertexAttribArray(uv);
  gl.uniform1i(gl.getUniformLocation(p, 'texture0'), 0);
  const scaleLoc = gl.getUniformLocation(p, 'scale'), centerLoc = gl.getUniformLocation(p, 'center');
  const opacityLoc = gl.getUniformLocation(p, 'opacity'), maskLoc = gl.getUniformLocation(p, 'maskPass');
  let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
  for (const vertices of d.vertexPositions) for (let j = 0; j < vertices.length; j += 2) {
    left = Math.min(left, vertices[j]); right = Math.max(right, vertices[j]);
    bottom = Math.min(bottom, vertices[j + 1]); top = Math.max(top, vertices[j + 1]);
  }
  const factor = 1.8 / Math.max(right - left, top - bottom);
  gl.uniform2f(scaleLoc, factor * height / width, factor);
  gl.uniform2f(centerLoc, (left + right) / 2, (bottom + top) / 2);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const order = Array.from({ length: d.count }, (_, i) => i).sort((a, b) => d.renderOrders[a] - d.renderOrders[b]);
  const params = model.parameters;
  const param = {};
  params.ids.forEach((id, i) => { param[id] = i; });
  function set(id, value) { if (param[id] !== undefined) params.values[param[id]] = value; }
  function drawMesh(i, maskPass) {
    if (!d.indexCounts[i] || !d.opacities[i]) return;
    const texture = textures[d.textureIndices[i]];
    if (!texture) return;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1f(opacityLoc, d.opacities[i]); gl.uniform1f(maskLoc, maskPass ? 1 : 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer); gl.bufferData(gl.ARRAY_BUFFER, d.vertexPositions[i], gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer); gl.bufferData(gl.ARRAY_BUFFER, d.vertexUvs[i], gl.STATIC_DRAW);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, d.indices[i], gl.STATIC_DRAW);
    gl.drawElements(gl.TRIANGLES, d.indexCounts[i], gl.UNSIGNED_SHORT, 0);
  }

  let stopped = false, frameId;
  function frame() {
    if (stopped) return;
    const t = Date.now() / 1000, state = getState();
    set('ParamBreath', (Math.sin(t * 2) + 1) / 2);
    set('ParamAngleX', Math.sin(t * .8) * 3);
    set('ParamEyeLOpen', t % 5 < .12 ? .1 : 1);
    set('ParamEyeROpen', t % 5 < .12 ? .1 : 1);
    set('ParamMouthOpenY', state === 'speaking' ? .35 + .3 * Math.abs(Math.sin(t * 10)) : 0);
    model.update();
    gl.clearColor(0, 0, 0, 0); gl.clearStencil(0); gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    for (const i of order) {
      if (d.maskCounts[i]) {
        gl.enable(gl.STENCIL_TEST); gl.stencilMask(0xff); gl.clear(gl.STENCIL_BUFFER_BIT);
        gl.colorMask(false, false, false, false); gl.stencilFunc(gl.ALWAYS, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        for (const mask of d.masks[i]) drawMesh(mask, true);
        gl.colorMask(true, true, true, true); gl.stencilMask(0); gl.stencilFunc(gl.EQUAL, 1, 0xff); gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      } else gl.disable(gl.STENCIL_TEST);
      drawMesh(i, false);
    }
    gl.disable(gl.STENCIL_TEST);
    frameId = canvas.requestAnimationFrame(frame);
  }
  frame();
  return { stop() { stopped = true; if (frameId) canvas.cancelAnimationFrame(frameId); model.release(); moc._release(); } };
}

module.exports = { start };
