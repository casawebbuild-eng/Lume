// src/scene.js?v=33
import * as THREE2 from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// src/post.js
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.45,
    // strength
    0.55,
    // radius
    0.88
    // threshold (only the bulb/aperture themselves bloom)
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, bloom };
}

// src/scene.js?v=33
function createScene(canvas2) {
  console.info("[LUME] createScene step 1: WebGLRenderer");
  const renderer = new THREE2.WebGLRenderer({
    canvas: canvas2,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    stencil: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE2.SRGBColorSpace;
  renderer.toneMapping = THREE2.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE2.PCFSoftShadowMap;
  console.info("[LUME] createScene step 2: Scene");
  const scene = new THREE2.Scene();
  scene.background = new THREE2.Color(1841172);
  console.info("[LUME] createScene step 3: environment (PMREM + RoomEnvironment)");
  try {
    const pmrem = new THREE2.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch (envErr) {
    console.warn("[LUME] environment step failed, continuing without env map:", envErr);
  }
  console.info("[LUME] createScene step 4: camera, lights, ground");
  const camera = new THREE2.PerspectiveCamera(38, 1, 0.05, 80);
  camera.position.set(0, 0.4, 2.7);
  camera.lookAt(0, 0.6, 0);
  const ambient = new THREE2.AmbientLight(16777215, 0.04);
  scene.add(ambient);
  const hemi = new THREE2.HemisphereLight(6978192, 1709072, 0.12);
  scene.add(hemi);
  console.info("[LUME] createScene step 5: composer");
  const { composer, bloom } = createComposer(renderer, scene, camera);
  console.info("[LUME] createScene step 6: done");
  function resize(w, h) {
    renderer.setSize(w, h, false);
    const pr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  function setSurfaceColor(hex) {
    scene.background.setHex(hex);
  }
  return { renderer, scene, camera, composer, resize, setSurfaceColor };
}

// src/lamp.js?v=33
import * as THREE3 from "three";

// src/kelvin.js
function kelvinToRgb(kelvin) {
  const temp = Math.max(1e3, Math.min(4e4, kelvin)) / 100;
  let r;
  let g;
  let b;
  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
    }
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    b = 255;
  }
  return {
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255)
  };
}
function clamp01(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// src/lamp.js?v=33
var finishes = {
  alu: {
    color: 13091512,
    metalness: 0.86,
    roughness: 0.36,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5
  },
  brass: {
    // Dark coffee bronze, matching the cascading-ring reference.
    color: 6965804,
    metalness: 0.78,
    roughness: 0.52,
    clearcoat: 0.22,
    clearcoatRoughness: 0.55
  },
  graphite: {
    color: 2894376,
    metalness: 0.68,
    roughness: 0.55,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55
  },
  bone: {
    color: 15394268,
    metalness: 0.08,
    roughness: 0.55,
    clearcoat: 0.32,
    clearcoatRoughness: 0.45
  }
};
var PolygonCurve = class extends THREE3.Curve {
  constructor(verts) {
    super();
    this.verts = verts;
  }
  getPoint(t, target = new THREE3.Vector3()) {
    const n = this.verts.length;
    const f = (t % 1 + 1) % 1 * n;
    const i = Math.floor(f) % n;
    const j = (i + 1) % n;
    const local = f - Math.floor(f);
    const a = this.verts[i];
    const b = this.verts[j];
    return target.set(
      a.x + (b.x - a.x) * local,
      a.y + (b.y - a.y) * local,
      a.z + (b.z - a.z) * local
    );
  }
};
function createLamp() {
  const group = new THREE3.Group();
  const finishMat = new THREE3.MeshPhysicalMaterial({
    color: finishes.brass.color,
    metalness: finishes.brass.metalness,
    roughness: finishes.brass.roughness,
    clearcoat: finishes.brass.clearcoat,
    clearcoatRoughness: finishes.brass.clearcoatRoughness
  });
  const ledMat = new THREE3.MeshStandardMaterial({
    color: 0,
    emissive: 16777215,
    emissiveIntensity: 5,
    roughness: 1,
    metalness: 0
  });
  function buildRing(majorR, tubeR, tiltX, tiltZ, y) {
    const ringGroup = new THREE3.Group();
    const metal = new THREE3.Mesh(
      new THREE3.TorusGeometry(majorR, tubeR, 20, 128),
      finishMat
    );
    metal.rotation.x = Math.PI / 2;
    metal.castShadow = true;
    metal.receiveShadow = true;
    ringGroup.add(metal);
    const led = new THREE3.Mesh(
      new THREE3.TorusGeometry(majorR, tubeR * 0.55, 14, 128),
      ledMat
    );
    led.rotation.x = Math.PI / 2;
    led.position.y = tubeR * 0.72;
    ringGroup.add(led);
    ringGroup.rotation.set(tiltX, 0, tiltZ);
    ringGroup.position.y = y;
    return ringGroup;
  }
  function buildCascade() {
    const g = new THREE3.Group();
    g.add(buildRing(0.4, 0.028, -0.18, 0.08, 0.85));
    g.add(buildRing(0.3, 0.026, 0.2, -0.12, 0.62));
    g.add(buildRing(0.2, 0.024, -0.1, 0.22, 0.43));
    return g;
  }
  function buildHalo() {
    const g = new THREE3.Group();
    const specs = [
      { R: 0.48, t: 0.02, y: 0.92, x: -0.1, z: 0.05 },
      { R: 0.38, t: 0.02, y: 0.73, x: 0.16, z: -0.09 },
      { R: 0.29, t: 0.018, y: 0.56, x: -0.05, z: 0.11 },
      { R: 0.21, t: 0.018, y: 0.41, x: 0.09, z: -0.03 }
    ];
    specs.forEach((s) => {
      const ring = buildRing(s.R, s.t, 0, 0, s.y);
      ring.position.x = s.x;
      ring.position.z = s.z;
      g.add(ring);
    });
    return g;
  }
  function buildStadium() {
    const g = new THREE3.Group();
    const a = 0.26;
    const r = 0.16;
    const tubeR = 0.024;
    const y = 0.64;
    const seg = 26;
    const straightSeg = 10;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const ang = -Math.PI / 2 + Math.PI * (i / seg);
      pts.push(new THREE3.Vector3(a + r * Math.cos(ang), 0, r * Math.sin(ang)));
    }
    for (let i = 1; i < straightSeg; i++) {
      pts.push(new THREE3.Vector3(a - 2 * a * (i / straightSeg), 0, r));
    }
    for (let i = 0; i <= seg; i++) {
      const ang = Math.PI / 2 + Math.PI * (i / seg);
      pts.push(new THREE3.Vector3(-a + r * Math.cos(ang), 0, r * Math.sin(ang)));
    }
    for (let i = 1; i < straightSeg; i++) {
      pts.push(new THREE3.Vector3(-a + 2 * a * (i / straightSeg), 0, -r));
    }
    const curve = new THREE3.CatmullRomCurve3(pts, true);
    const metal = new THREE3.Mesh(
      new THREE3.TubeGeometry(curve, 260, tubeR, 18, true),
      finishMat
    );
    metal.castShadow = true;
    metal.receiveShadow = true;
    metal.position.y = y;
    g.add(metal);
    const led = new THREE3.Mesh(
      new THREE3.TubeGeometry(curve, 260, tubeR * 0.55, 12, true),
      ledMat
    );
    led.position.y = y - tubeR * 0.72;
    g.add(led);
    return g;
  }
  function buildHexRing(radius, tubeR, y, offX, offZ) {
    const ringGroup = new THREE3.Group();
    const verts = [];
    for (let i = 0; i < 6; i++) {
      const ang = i / 6 * Math.PI * 2;
      verts.push(new THREE3.Vector3(radius * Math.cos(ang), 0, radius * Math.sin(ang)));
    }
    const curve = new PolygonCurve(verts);
    const metal = new THREE3.Mesh(
      new THREE3.TubeGeometry(curve, 192, tubeR, 16, true),
      finishMat
    );
    metal.castShadow = true;
    metal.receiveShadow = true;
    ringGroup.add(metal);
    const led = new THREE3.Mesh(
      new THREE3.TubeGeometry(curve, 192, tubeR * 0.55, 12, true),
      ledMat
    );
    led.position.y = -tubeR * 0.72;
    ringGroup.add(led);
    ringGroup.position.set(offX, y, offZ);
    return ringGroup;
  }
  function buildHexagon() {
    const g = new THREE3.Group();
    g.add(buildHexRing(0.44, 0.024, 0.86, 0, -0.06));
    g.add(buildHexRing(0.31, 0.021, 0.58, 0, 0.12));
    return g;
  }
  const modelBuilders = { rings: buildCascade, halo: buildHalo, stadium: buildStadium, hex: buildHexagon };
  const meshGroup = new THREE3.Group();
  group.add(meshGroup);
  function buildModel() {
    for (let i = meshGroup.children.length - 1; i >= 0; i--) {
      const child = meshGroup.children[i];
      child.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      meshGroup.remove(child);
    }
    const m = (modelBuilders[modelKey] || buildCascade)();
    m.updateMatrixWorld(true);
    const center = new THREE3.Box3().setFromObject(m).getCenter(new THREE3.Vector3());
    m.position.sub(center);
    meshGroup.position.copy(center);
    meshGroup.add(m);
    builtModel = modelKey;
  }
  function setOrientation(yaw, pitch) {
    meshGroup.rotation.y = yaw;
    meshGroup.rotation.x = pitch;
  }
  const spot = new THREE3.SpotLight(16777215, 14, 12, Math.PI / 3.6, 0.55, 2);
  spot.position.set(0, 1.05, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -12e-4;
  spot.shadow.normalBias = 0.025;
  spot.shadow.camera.near = 0.2;
  spot.shadow.camera.far = 8;
  group.add(spot);
  const spotTarget = new THREE3.Object3D();
  spotTarget.position.set(0, -3, 0);
  group.add(spotTarget);
  spot.target = spotTarget;
  const pls = [
    new THREE3.PointLight(16777215, 0.4, 1.6, 2),
    new THREE3.PointLight(16777215, 0.3, 1.4, 2),
    new THREE3.PointLight(16777215, 0.2, 1.2, 2)
  ];
  pls[0].position.set(0, 0.85, 0);
  pls[1].position.set(0, 0.62, 0);
  pls[2].position.set(0, 0.43, 0);
  pls.forEach((p) => group.add(p));
  let kelvin = 2700;
  let intensity01 = 0.82;
  let drop01 = 0.45;
  let finishKey = "brass";
  let modelKey = "rings";
  const swapReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let builtModel = "rings";
  let swapFade = 1;
  let ledBaseEmissive = 1.4 + 7 * intensity01;
  let lastT = 0;
  function applyLight() {
    const { r, g, b } = kelvinToRgb(kelvin);
    spot.color.setRGB(r, g, b);
    spot.intensity = 2 + 22 * intensity01;
    const plBases = [0.4, 0.3, 0.2];
    pls.forEach((p, i) => {
      p.color.setRGB(r, g, b);
      p.intensity = plBases[i] * (0.2 + 0.8 * intensity01);
    });
    ledMat.emissive.setRGB(r, g, b);
    ledBaseEmissive = 1.4 + 7 * intensity01;
    ledMat.emissiveIntensity = ledBaseEmissive * swapFade;
  }
  function setTemperature(k) {
    kelvin = k;
    applyLight();
  }
  function setIntensity(i) {
    intensity01 = clamp012(i);
    applyLight();
  }
  function setDrop(d) {
    drop01 = clamp012(d);
    group.position.y = 0.35 - drop01 * 0.7;
  }
  function setFinish(key) {
    const f = finishes[key];
    if (!f) return;
    finishKey = key;
    finishMat.color.setHex(f.color);
    finishMat.metalness = f.metalness;
    finishMat.roughness = f.roughness;
    finishMat.clearcoat = f.clearcoat;
    finishMat.clearcoatRoughness = f.clearcoatRoughness;
  }
  function setModel(key) {
    if (key === modelKey || !modelBuilders[key]) return;
    modelKey = key;
    if (swapReducedMotion) {
      buildModel();
      swapFade = 1;
      applyFade();
    }
  }
  function applyFade() {
    const f = swapFade < 0 ? 0 : swapFade > 1 ? 1 : swapFade;
    const eased = f * f * (3 - 2 * f);
    const wantTransparent = eased < 1;
    [finishMat, ledMat].forEach((mat) => {
      if (mat.transparent !== wantTransparent) {
        mat.transparent = wantTransparent;
        mat.needsUpdate = true;
      }
      mat.opacity = eased;
    });
    ledMat.emissiveIntensity = ledBaseEmissive * eased;
  }
  function update(now) {
    const t = (now || 0) * 1e-3;
    const dt = lastT ? Math.min(0.05, t - lastT) : 0;
    lastT = t;
    if (swapReducedMotion) return;
    if (builtModel !== modelKey) {
      swapFade -= dt / 0.22;
      if (swapFade <= 0) {
        swapFade = 0;
        buildModel();
      }
      applyFade();
    } else if (swapFade < 1) {
      swapFade += dt / 0.34;
      if (swapFade > 1) swapFade = 1;
      applyFade();
    }
  }
  buildModel();
  applyLight();
  setDrop(drop01);
  return {
    group,
    setTemperature,
    setIntensity,
    setDrop,
    setFinish,
    setModel,
    setOrientation,
    update,
    getFinish: () => finishKey,
    getModel: () => modelKey
  };
}
function clamp012(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

// src/configurator.js?v=33
var FINISH_LABELS = {
  alu: "Brushed alu",
  brass: "Aged bronze",
  graphite: "Graphite",
  bone: "Bone white"
};
var MODEL_LABELS = {
  rings: "Cascade",
  halo: "Orbit",
  stadium: "Loop",
  hex: "Hexia"
};
var MODEL_META = {
  rings: { desc: "Three tilted rings", code: "PH-09" },
  halo: { desc: "Four floating rings", code: "OR-04" },
  stadium: { desc: "Single stadium loop", code: "LP-01" },
  hex: { desc: "Two stacked hexagons", code: "HX-02" }
};
function createConfigurator(initial, onChange) {
  const state = { ...initial };
  const tempEl = document.getElementById("ctrl-temp");
  const tempOut = document.getElementById("ctrl-temp-out");
  const intEl = document.getElementById("ctrl-intensity");
  const intOut = document.getElementById("ctrl-intensity-out");
  const finishOut = document.getElementById("ctrl-finish-out");
  const finishBtns = Array.from(document.querySelectorAll(".finish-swatch"));
  const modelOut = document.getElementById("ctrl-model-out");
  const modelDesc = document.getElementById("ctrl-model-desc");
  const modelCode = document.getElementById("ctrl-model-code");
  const modelBtns = Array.from(document.querySelectorAll(".model-swatch"));
  const heroTemp = document.getElementById("hero-temp-readout");
  const heroIntensity = document.getElementById("hero-intensity-readout");
  const tempLabelBinds = Array.from(document.querySelectorAll('[data-bind="temperatureLabel"]'));
  tempEl.value = String(state.temperature);
  intEl.value = String(state.intensity);
  finishBtns.forEach((btn) => {
    const active = btn.dataset.finish === state.finish;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  modelBtns.forEach((btn) => {
    const active = btn.dataset.model === state.model;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  function setRangeFill(el) {
    const v = Number(el.value);
    const min = Number(el.min);
    const max = Number(el.max);
    const pct = (v - min) / (max - min) * 100;
    el.style.setProperty("--fill", `${pct}%`);
  }
  function publish() {
    tempOut.textContent = `${state.temperature}\u2009K`;
    intOut.textContent = `${state.intensity}\u2009%`;
    if (finishOut) finishOut.textContent = FINISH_LABELS[state.finish] ?? "";
    if (modelOut) modelOut.textContent = MODEL_LABELS[state.model] ?? "";
    const meta = MODEL_META[state.model];
    if (modelDesc && meta) modelDesc.textContent = meta.desc;
    if (modelCode && meta) modelCode.textContent = meta.code;
    if (heroTemp) heroTemp.textContent = `${state.temperature}K`;
    if (heroIntensity) heroIntensity.textContent = `${state.intensity}%`;
    tempLabelBinds.forEach((el) => {
      el.textContent = `${state.temperature}K`;
    });
    setRangeFill(tempEl);
    setRangeFill(intEl);
    const t01 = (state.temperature - 2200) / (6500 - 2200);
    document.documentElement.style.setProperty("--temperature", t01.toFixed(3));
    document.documentElement.style.setProperty("--intensity", (state.intensity / 100).toFixed(3));
    onChange(state);
  }
  tempEl.addEventListener("input", () => {
    state.temperature = Number(tempEl.value);
    publish();
  });
  intEl.addEventListener("input", () => {
    state.intensity = Number(intEl.value);
    publish();
  });
  finishBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      finishBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      state.finish = btn.dataset.finish;
      publish();
    });
  });
  function activateModel(key) {
    if (!MODEL_LABELS[key]) return;
    modelBtns.forEach((b) => {
      const active = b.dataset.model === key;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (state.model === key) return;
    state.model = key;
    publish();
  }
  modelBtns.forEach((btn) => {
    btn.addEventListener("click", () => activateModel(btn.dataset.model));
  });
  publish();
  return { state, setModel: activateModel };
}

// src/main.js
var canvas = document.getElementById("stage");
var fallback = document.getElementById("fallback");
var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var api = null;
try {
  api = createScene(canvas);
  console.info("[LUME] Three.js scene initialized.");
} catch (err) {
  console.error("[LUME] WebGL initialization failed:", err);
  canvas.hidden = true;
  if (fallback) fallback.hidden = false;
  document.body.classList.add("is-ready");
}
if (api) {
  let measureConfig = function() {
    const scrollOffset = window.scrollY || window.pageYOffset || 0;
    if (configSection) {
      const rect = configSection.getBoundingClientRect();
      configBounds.top = rect.top + scrollOffset;
      configBounds.height = configSection.offsetHeight;
    }
    for (const key in sectionEls) {
      const el = sectionEls[key];
      if (el) sectionTops[key] = el.getBoundingClientRect().top + scrollOffset;
    }
  }, handleResize = function() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    resize(w, h);
    measureConfig();
  }, isInteractive = function(target) {
    return !!(target && target.closest && target.closest("a, button, input, output, label, .config-panel, .collection-copy, .site-head, .site-foot, .sidebar"));
  }, endDrag = function() {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove("is-grabbing");
  }, tick = function(now) {
    const t = now * 1e-3;
    const dt = lastTick ? Math.min(0.05, t - lastTick) : 0;
    lastTick = t;
    lamp.update(now);
    lamp.setOrientation(userYaw, userPitch);
    const scrollY = window.scrollY || window.pageYOffset || 0;
    eased.x += (pointer.x * 0.12 - eased.x) * 0.05;
    eased.y += (pointer.y * -0.06 - eased.y) * 0.05;
    const vh = Math.max(window.innerHeight, 1);
    const vw = Math.max(window.innerWidth, 1);
    const ramp = vh * 0.55;
    const enterStart = configBounds.top - vh * 0.45;
    const configWeight = easeOut(clamp013((scrollY - enterStart) / ramp));
    const enterAt = (top) => easeOut(clamp013((scrollY - (top - vh * 0.55)) / ramp));
    const wCollection = enterAt(sectionTops.collection);
    const wSpec = enterAt(sectionTops.specifications);
    const wManifesto = enterAt(sectionTops.manifesto);
    const configZoom = Math.max(0, Math.min(0.7, (vw - 800) / 1300));
    const camZAtConfig = baseCam.z - configZoom;
    const SPAN = 0.74 - 0.26;
    const TARGET_X_FRAC = clamp(
      0.26 + SPAN * wCollection - SPAN * wSpec + SPAN * wManifesto,
      0.26,
      0.74
    );
    const TARGET_Y_FRAC = 0.5;
    const ndcXTarget = 2 * TARGET_X_FRAC - 1;
    const ndcYTarget = 1 - 2 * TARGET_Y_FRAC;
    const aspect = vw / vh;
    const shiftXAtConfig = -ndcXTarget * camZAtConfig * aspect * 0.344;
    const lookYAtConfig = 0.64 - ndcYTarget * camZAtConfig * 0.344;
    const camX = baseCam.x + eased.x + shiftXAtConfig * configWeight;
    const camY = baseCam.y + eased.y;
    const camZ = baseCam.z + (camZAtConfig - baseCam.z) * configWeight;
    const lookX = shiftXAtConfig * configWeight;
    const lookY = baseLookY + (lookYAtConfig - baseLookY) * configWeight;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, 0);
    composer.render();
    requestAnimationFrame(tick);
  }, easeOut = function(x) {
    const c = Math.min(1, Math.max(0, x));
    return 1 - Math.pow(1 - c, 3);
  };
  const { scene, camera, composer, resize, setSurfaceColor } = api;
  const lamp = createLamp();
  scene.add(lamp.group);
  const config = createConfigurator(
    { temperature: 2700, intensity: 82, finish: "brass", model: "rings" },
    (state) => {
      lamp.setModel(state.model);
      lamp.setTemperature(state.temperature);
      lamp.setIntensity(state.intensity / 100);
      lamp.setFinish(state.finish);
      setSurfaceColor(surfaceHex(state.temperature));
    }
  );
  const collectionPanels = document.querySelectorAll(".collection-panel");
  if (collectionPanels.length && "IntersectionObserver" in window) {
    const tourIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.dataset.model) {
          config.setModel(entry.target.dataset.model);
        }
      });
    }, { rootMargin: "-48% 0px -48% 0px", threshold: 0 });
    collectionPanels.forEach((panel) => tourIO.observe(panel));
  }
  const configSection = document.getElementById("configurator");
  const configBounds = { top: 0, height: 1 };
  const sectionTops = { collection: 0, specifications: 0, manifesto: 0 };
  const sectionEls = {
    collection: document.getElementById("collection"),
    specifications: document.getElementById("specifications"),
    manifesto: document.getElementById("manifesto")
  };
  window.addEventListener("resize", handleResize, { passive: true });
  window.addEventListener("load", measureConfig);
  handleResize();
  const baseCam = { x: 0, y: 0.4, z: 2.7 };
  const baseLookY = 0.6;
  const pointer = { x: 0, y: 0 };
  const eased = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    const nx = e.clientX / window.innerWidth * 2 - 1;
    const ny = e.clientY / window.innerHeight * 2 - 1;
    pointer.x = nx;
    pointer.y = ny;
  }, { passive: true });
  let userYaw = 0;
  let userPitch = 0;
  let dragging = false;
  let lastPx = 0;
  let lastPy = 0;
  window.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    if (isInteractive(e.target)) return;
    dragging = true;
    lastPx = e.clientX;
    lastPy = e.clientY;
    document.body.classList.add("is-grabbing");
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    userYaw += (e.clientX - lastPx) * 0.01;
    userPitch = clamp(userPitch + (e.clientY - lastPy) * 0.01, -0.6, 0.6);
    lastPx = e.clientX;
    lastPy = e.clientY;
  }, { passive: true });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
  let lastTick = 0;
  requestAnimationFrame(tick);
  requestAnimationFrame(() => {
    canvas.classList.add("is-ready");
    document.body.classList.add("is-ready");
  });
}
var revealTargets = document.querySelectorAll(".section-head, .hero-eyebrow, .hero-lead, .hero-readout, .scroll-cue, .collection-copy, .spec-row, .manifesto-body > *, .contact-body, .contact-link");
revealTargets.forEach((el) => el.setAttribute("data-reveal", ""));
if (!reducedMotion && "IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
  revealTargets.forEach((el) => io.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-revealed"));
}
var navTraveling = false;
var navSettleTimer = 0;
var navNoScrollTimer = 0;
function lampArrive() {
  if (!navTraveling) return;
  navTraveling = false;
  clearTimeout(navSettleTimer);
  clearTimeout(navNoScrollTimer);
  if (canvas) {
    canvas.classList.add("is-arriving");
    canvas.classList.remove("is-traveling");
  }
}
window.addEventListener("scroll", () => {
  if (!navTraveling) return;
  clearTimeout(navNoScrollTimer);
  clearTimeout(navSettleTimer);
  navSettleTimer = setTimeout(lampArrive, 160);
}, { passive: true });
if (canvas) {
  canvas.addEventListener("transitionend", (e) => {
    if (e.propertyName === "opacity") canvas.classList.remove("is-arriving");
  });
}
function beginLampTravel() {
  if (reducedMotion || !canvas) return;
  navTraveling = true;
  canvas.classList.remove("is-arriving");
  canvas.classList.add("is-traveling");
  clearTimeout(navNoScrollTimer);
  navNoScrollTimer = setTimeout(lampArrive, 220);
}
document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    link.classList.remove("is-clicked");
    void link.offsetWidth;
    link.classList.add("is-clicked");
    beginLampTravel();
  });
  link.addEventListener("animationend", () => link.classList.remove("is-clicked"));
});
var wordmark = document.querySelector(".wordmark");
if (wordmark) wordmark.addEventListener("click", beginLampTravel);
(function initSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  const toggle = sidebar.querySelector(".sidebar-toggle");
  const scrim = sidebar.querySelector(".sidebar-scrim");
  const links = Array.from(sidebar.querySelectorAll(".sidebar-list a"));
  const mqMobile = window.matchMedia("(max-width: 900px)");
  let menuAnim = null;
  const lottieEl = sidebar.querySelector(".sidebar-lottie");
  if (lottieEl && window.lottie) {
    try {
      menuAnim = window.lottie.loadAnimation({
        container: lottieEl,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: buildMenuIconData()
      });
      menuAnim.goToAndStop(0, true);
      sidebar.classList.add("has-lottie");
    } catch (err) {
      menuAnim = null;
    }
  }
  function setIcon(isOpen) {
    if (!menuAnim) return;
    if (reducedMotion) {
      menuAnim.goToAndStop(isOpen ? menuAnim.totalFrames - 1 : 0, true);
      return;
    }
    menuAnim.setDirection(isOpen ? 1 : -1);
    menuAnim.play();
  }
  let open = false;
  function setOpen(next) {
    if (next === open) return;
    open = next;
    sidebar.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close section menu" : "Open section menu");
    setIcon(open);
    if (mqMobile.matches) {
      document.body.style.overflow = open ? "hidden" : "";
      if (open && links[0]) links[0].focus({ preventScroll: true });
    }
  }
  toggle.addEventListener("click", () => setOpen(!open));
  if (scrim) scrim.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      setOpen(false);
      toggle.focus();
    }
  });
  mqMobile.addEventListener("change", () => {
    if (!mqMobile.matches) document.body.style.overflow = "";
  });
  function setActive(activeLink) {
    links.forEach((l) => l.removeAttribute("aria-current"));
    if (activeLink) activeLink.setAttribute("aria-current", "true");
  }
  const byId = new Map(links.map((l) => [l.getAttribute("href").slice(1), l]));
  const sections = links.map((l) => document.getElementById(l.getAttribute("href").slice(1))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const link = byId.get(entry.target.id);
          if (link) setActive(link);
        }
      });
    }, { rootMargin: "-38% 0px -62% 0px", threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }
  if (links[0]) setActive(links[0]);
  links.forEach((link) => {
    link.addEventListener("click", () => {
      beginLampTravel();
      setActive(link);
      if (mqMobile.matches) setOpen(false);
    });
  });
})();
function buildMenuIconData() {
  const END = 24;
  const COLOR = [0.96, 0.95, 0.93, 1];
  const easeO = { x: [0.33], y: [0] };
  const easeI = { x: [0.67], y: [1] };
  const easeO2 = { x: [0.33, 0.33], y: [0, 0] };
  const easeI2 = { x: [0.67, 0.67], y: [1, 1] };
  function bar(name, ind, y0, y1, r0, r1, fades) {
    const rot = r0 === r1 ? { a: 0, k: r0 } : { a: 1, k: [{ t: 0, s: [r0], o: easeO, i: easeI }, { t: END, s: [r1] }] };
    const pos = y0 === y1 ? { a: 0, k: [24, y0, 0] } : { a: 1, k: [
      { t: 0, s: [24, y0, 0], to: [0, 0, 0], ti: [0, 0, 0], o: easeO2, i: easeI2 },
      { t: END, s: [24, y1, 0] }
    ] };
    const opacity = fades ? { a: 1, k: [{ t: 0, s: [100], o: easeO, i: easeI }, { t: 12, s: [0] }] } : { a: 0, k: 100 };
    return {
      ddd: 0,
      ind,
      ty: 4,
      nm: name,
      sr: 1,
      ks: { o: opacity, r: rot, p: pos, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      ao: 0,
      shapes: [{
        ty: "gr",
        it: [
          { ty: "rc", d: 1, s: { a: 0, k: [26, 3] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 1.5 } },
          { ty: "fl", c: { a: 0, k: COLOR }, o: { a: 0, k: 100 }, r: 1, bm: 0 },
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }
        ]
      }],
      ip: 0,
      op: END + 1,
      st: 0,
      bm: 0
    };
  }
  return {
    v: "5.7.4",
    fr: 60,
    ip: 0,
    op: END + 1,
    w: 48,
    h: 48,
    nm: "menu",
    ddd: 0,
    assets: [],
    layers: [
      bar("top", 1, 16, 24, 0, 45, false),
      bar("mid", 2, 24, 24, 0, 0, true),
      bar("bottom", 3, 32, 24, 0, -45, false)
    ]
  };
}
function surfaceHex(kelvin) {
  const t = clamp013((kelvin - 2200) / (6500 - 2200));
  const warm = { l: 0.135, c: 0.013, h: 65 };
  const cool = { l: 0.135, c: 8e-3, h: 235 };
  return oklchToHex(
    lerp(warm.l, cool.l, t),
    lerp(warm.c, cool.c, t),
    lerpAngle(warm.h, cool.h, t)
  );
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpAngle(a, b, t) {
  let d = b - a;
  if (Math.abs(d) > 180) d = d - Math.sign(d) * 360;
  return a + d * t;
}
function clamp013(x) {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}
function oklchToHex(L, C, hDeg) {
  const hr = hDeg * Math.PI / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;
  let R = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let G = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let B = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;
  R = toSrgbByte(R);
  G = toSrgbByte(G);
  B = toSrgbByte(B);
  return R << 16 | G << 8 | B;
}
function toSrgbByte(x) {
  if (!isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 255;
  const v = x <= 31308e-7 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}
