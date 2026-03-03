

const CFG = {
  modelPath: './portfolio3d.glb',

  // Meshes del monitor principal (iframe)
  screen1: 'Pantalla01',
  // Pantalla02 la dejamos apagada

  // Meshes de links directos
  links: {
    artstation: 'artstation',
    linkedin:   'linkedin',
    gmail:      'gmail',
  },

  // URLs
  urls: {
    artstation: 'https://www.artstation.com/jdxth',
    linkedin:   'https://www.linkedin.com/in/judith-nav%C3%B3-mart%C3%ADnez-73185b385/',
    gmail:      'mailto:jnavomartinez@gmail.com',
  },

  // Tooltips que aparecen al hacer hover
  tooltips: {
    Pantalla01:  '[ OPEN PORTFOLIO ]',
    artstation:  '[ ARTSTATION ]',
    linkedin:    '[ LINKEDIN ]',
    gmail:       '[ EMAIL ]',
  },

  // Cámara inicial — ajusta si el encuadre no es perfecto
  camStart:  { x: 4,  y: 4, z: 4  },
  camLookAt: { x: -1.3,  y: 1.35, z: -0.4 },

  // Posición de zoom hacia Pantalla01
  // (monitores en aprox x:-1.55, y:1.41, z:-0.47)
  zoomPos:  { x: -1.05, y: 1.46, z: 0.52 },
  zoomLook: { x: -1.55, y: 1.41, z: -0.47 },
};

/* ── DOM ──────────────────────────────────────────── */
const canvasWrap  = document.getElementById('canvas-container');
const loadingEl   = document.getElementById('loading');
const loadBar     = document.getElementById('load-bar');
const loadPct     = document.getElementById('load-pct');
const hintEl      = document.getElementById('hint');
const tooltipEl   = document.getElementById('tooltip');
const monOverlay  = document.getElementById('monitor-overlay');

/* ── Renderer ─────────────────────────────────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputEncoding    = THREE.sRGBEncoding;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
canvasWrap.appendChild(renderer.domElement);

/* ── Scene ────────────────────────────────────────── */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06080a);
scene.fog = new THREE.Fog(0x06080a, 7, 18);

/* ── Camera ───────────────────────────────────────── */
const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.01, 60
);
camera.position.set(CFG.camStart.x, CFG.camStart.y, CFG.camStart.z);
camera.lookAt(CFG.camLookAt.x, CFG.camLookAt.y, CFG.camLookAt.z);

/* ── Lights ───────────────────────────────────────── */
scene.add(new THREE.AmbientLight(0xd0e0ff, 0.55));

const keyLight = new THREE.DirectionalLight(0xfff5e0, 0.9);
keyLight.position.set(-2, 4, 2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa0c0ff, 0.3);
fillLight.position.set(2, 2, -2);
scene.add(fillLight);

// Brillo verde CRT en los monitores
const monitorGlow = new THREE.PointLight(0x00ff41, 0.5, 1.5);
monitorGlow.position.set(-1.55, 1.5, -0.25);
scene.add(monitorGlow);

// Luz cálida escritorio (lámpara)
const deskLight = new THREE.PointLight(0xffcc66, 0.7, 2.2);
deskLight.position.set(-1.2, 1.65, 0.45);
scene.add(deskLight);

/* ── State ────────────────────────────────────────── */
let screen1Mesh  = null;           // Pantalla01
let screen2Mesh  = null;           // Pantalla02 (apagada)
const linkMeshes = {};             // { artstation: mesh, linkedin: mesh, gmail: mesh }
const allInteractable = [];        // todos los meshes con raycasting

let isZoomed    = false;
let isAnimating = false;
let hoveredMesh = null;

const savedCamPos = new THREE.Vector3();
const mouse    = new THREE.Vector2(-999, -999);
const raycaster = new THREE.Raycaster();
const clock    = new THREE.Clock();

/* ════════════════════════════════════════════════════
   LOAD GLB
════════════════════════════════════════════════════ */
function loadModel() {
  const loader = new THREE.GLTFLoader();
  loader.load(CFG.modelPath, onLoaded, onProgress, onError);
}

function onLoaded(gltf) {
  // Debug: todos los meshes
  console.group('📦 Meshes en el modelo:');
  gltf.scene.traverse(c => { if (c.isMesh) console.log(c.name); });
  console.groupEnd();

  gltf.scene.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = child.receiveShadow = true;

    const name = child.name;

    // ── Pantalla01: monitor principal ──
    if (name === CFG.screen1) {
      screen1Mesh = child;
      applyScreenMaterial(child, 0x003a00, 0.6);   // verde encendido
      allInteractable.push(child);
      console.log('✅ Pantalla01:', name);
    }

    // ── Pantalla02: apagada ──
    if (name === 'Pantalla02') {
      screen2Mesh = child;
      applyScreenMaterial(child, 0x000000, 0.0);   // negra / apagada
      // NO se añade a allInteractable
      console.log('📴 Pantalla02 (apagada):', name);
    }

    // ── Meshes de links ──
    const linkKey = Object.entries(CFG.links).find(([, v]) => v === name)?.[0];
    if (linkKey) {
      linkMeshes[linkKey] = child;
      allInteractable.push(child);
      // Pequeño glow para que destaquen
      if (child.material) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0x002200);
        child.material.emissiveIntensity = 0.3;
      }
      console.log(`✅ Link mesh "${linkKey}":`, name);
    }
  });

  scene.add(gltf.scene);
  finishLoading();
}

function applyScreenMaterial(mesh, emissiveHex, intensity) {
  if (!mesh.material) return;
  mesh.material = mesh.material.clone();
  mesh.material.emissive = new THREE.Color(emissiveHex);
  mesh.material.emissiveIntensity = intensity;
  mesh.material.roughness = 0.04;
  mesh.material.metalness = 0.1;
}

function onProgress(xhr) {
  if (xhr.total > 0) setLoadBar(Math.min(Math.round(xhr.loaded / xhr.total * 95), 95));
}
function onError(err) { console.error('GLB error:', err); finishLoading(); }

function setLoadBar(v) { loadBar.style.width = v + '%'; loadPct.textContent = v + '%'; }
function finishLoading() {
  setLoadBar(100);
  setTimeout(() => loadingEl.classList.add('hidden'), 700);
}

/* ════════════════════════════════════════════════════
   INPUT
════════════════════════════════════════════════════ */
window.addEventListener('mousemove', e => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Mueve el tooltip con el cursor
  tooltipEl.style.left = e.clientX + 'px';
  tooltipEl.style.top  = e.clientY + 'px';
});

window.addEventListener('click', onSceneClick);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && isZoomed) closeMonitor();
});

function onSceneClick() {
  if (isAnimating) return;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allInteractable, true);
  if (!hits.length) return;

  const mesh = hits[0].object;
  const name = mesh.name;

  // Pantalla01 → zoom + iframe
  if (name === CFG.screen1 && !isZoomed) {
    zoomToMonitor();
    return;
  }

  // Links → window.open / mailto
  const linkKey = Object.entries(CFG.links).find(([, v]) => v === name)?.[0];
  if (linkKey) {
    const url = CFG.urls[linkKey];
    if (url.startsWith('mailto:')) window.location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/* ── Hover ────────────────────────────────────────── */
function updateHover() {
  if (isZoomed) { clearHover(); return; }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allInteractable, true);

  if (hits.length > 0) {
    const mesh = hits[0].object;
    const name = mesh.name;
    const tip  = CFG.tooltips[name] || '[ OPEN ]';

    if (hoveredMesh !== mesh) {
      hoveredMesh = mesh;
      tooltipEl.textContent = tip;
      tooltipEl.classList.add('show');
      document.body.style.cursor = 'pointer';

      // Highlight sutil
      if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
        gsap.to(mesh.material, { emissiveIntensity: 0.7, duration: 0.2 });
      }
    }
  } else {
    clearHover();
  }
}

function clearHover() {
  if (hoveredMesh) {
    // Restaura emissive
    const mat = hoveredMesh.material;
    if (mat && mat.emissiveIntensity !== undefined) {
      const base = hoveredMesh.name === CFG.screen1 ? 0.6 : 0.3;
      gsap.to(mat, { emissiveIntensity: base, duration: 0.2 });
    }
    hoveredMesh = null;
  }
  tooltipEl.classList.remove('show');
  document.body.style.cursor = 'crosshair';
}

/* ════════════════════════════════════════════════════
   ZOOM AL MONITOR
════════════════════════════════════════════════════ */
function zoomToMonitor() {
  if (isAnimating) return;
  isAnimating = isZoomed = true;
  savedCamPos.copy(camera.position);
  hintEl.style.opacity = '0';
  clearHover();

  const lp = { x: CFG.camLookAt.x, y: CFG.camLookAt.y, z: CFG.camLookAt.z };

  gsap.to(lp, {
    x: CFG.zoomLook.x, y: CFG.zoomLook.y, z: CFG.zoomLook.z,
    duration: 1.5, ease: 'power3.inOut',
    onUpdate() { camera.lookAt(lp.x, lp.y, lp.z); }
  });

  gsap.to(camera.position, {
    x: CFG.zoomPos.x, y: CFG.zoomPos.y, z: CFG.zoomPos.z,
    duration: 1.5, ease: 'power3.inOut',
    onComplete() { isAnimating = false; openMonitor(); }
  });
}

function zoomOut() {
  if (isAnimating) return;
  isAnimating = true;

  const lp = { x: CFG.zoomLook.x, y: CFG.zoomLook.y, z: CFG.zoomLook.z };

  gsap.to(lp, {
    x: CFG.camLookAt.x, y: CFG.camLookAt.y, z: CFG.camLookAt.z,
    duration: 1.3, ease: 'power3.inOut',
    onUpdate() { camera.lookAt(lp.x, lp.y, lp.z); }
  });

  gsap.to(camera.position, {
    x: savedCamPos.x, y: savedCamPos.y, z: savedCamPos.z,
    duration: 1.3, ease: 'power3.inOut',
    onComplete() { isZoomed = isAnimating = false; hintEl.style.opacity = '1'; }
  });
}

/* ── Overlay helpers ──────────────────────────────── */
function openMonitor()  { monOverlay.classList.add('active'); }
window.closeMonitor = function () { monOverlay.classList.remove('active'); zoomOut(); };

/* ════════════════════════════════════════════════════
   RENDER LOOP
════════════════════════════════════════════════════ */
let glowT = 0;

function pulseGlow(dt) {
  glowT += dt;
  monitorGlow.intensity = 0.38 + Math.sin(glowT * 1.8) * 0.14;
}

function idleSway(t) {
  if (isZoomed || isAnimating) return;
  camera.position.set(
    CFG.camStart.x + Math.sin(t * 0.12) * 0.055,
    CFG.camStart.y + Math.sin(t * 0.08) * 0.014,
    CFG.camStart.z + Math.sin(t * 0.07) * 0.028
  );
  camera.lookAt(CFG.camLookAt.x, CFG.camLookAt.y, CFG.camLookAt.z);
}

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t  = clock.getElapsedTime();
  idleSway(t);
  updateHover();
  pulseGlow(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ── Init ─────────────────────────────────────────── */
(function init() {
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  s.onload = () => { loadModel(); animate(); };
  s.onerror = () => console.error('No se pudo cargar GLTFLoader');
  document.head.appendChild(s);
})();