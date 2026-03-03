/* ════════════════════════════════════════════════════════
   main.js — Judith Navó Portfolio 3D
   Three.js r128 + GSAP 3
════════════════════════════════════════════════════════ */

const CFG = {
  modelPath: './portfolio3d.glb',
  screen1: 'Pantalla01',

  links: {
    artstation: 'artstation',
    linkedin:   'linkedin',
    gmail:      'gmail',
  },

  urls: {
    artstation: 'https://www.artstation.com/jdxth',
    linkedin:   'https://www.linkedin.com/in/judith-nav%C3%B3-mart%C3%ADnez-73185b385/',
    gmail:      'mailto:jnavomartinez@gmail.com',
  },

  tooltips: {
    Pantalla01: { icon: '◈', label: '[ OPEN PORTFOLIO ]',  sub: 'judith-navo.portfolio'       },
    artstation: { icon: '◎', label: '[ OPEN ARTSTATION ]', sub: 'artstation.com/jdxth'        },
    linkedin:   { icon: '▣', label: '[ OPEN LINKEDIN ]',   sub: 'linkedin.com/in/judith-navó' },
    gmail:      { icon: '✉', label: '[ SEND EMAIL ]',      sub: 'jnavomartinez@gmail.com'     },
  },

  camStart:  { x: 4,     y: 4,    z: 4     },
  camLookAt: { x: -1.3,  y: 1.35, z: -0.4  },
  zoomPos:   { x: -1.05, y: 1.46, z: 0.52  },
  zoomLook:  { x: -1.55, y: 1.41, z: -0.47 },
};

/* ── DOM ──────────────────────────────────────────── */
const canvasWrap = document.getElementById('canvas-container');
const loadingEl  = document.getElementById('loading');
const loadBar    = document.getElementById('load-bar');
const loadPct    = document.getElementById('load-pct');
const hintEl     = document.getElementById('hint');
const tooltipEl  = document.getElementById('tooltip');
const monOverlay = document.getElementById('monitor-overlay');
const ttIcon     = document.querySelector('.tt-icon');
const ttText     = document.querySelector('.tt-text');

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

const monitorGlow = new THREE.PointLight(0x00ff41, 0.5, 1.5);
monitorGlow.position.set(-1.55, 1.5, -0.25);
scene.add(monitorGlow);

const deskLight = new THREE.PointLight(0xffcc66, 0.7, 2.2);
deskLight.position.set(-1.2, 1.65, 0.45);
scene.add(deskLight);

/* ── State ────────────────────────────────────────── */
let screen1Mesh    = null;
let screen2Mesh    = null;
const linkMeshes   = {};
const allInteractable = [];

let isZoomed    = false;
let isAnimating = false;
let hoveredMesh = null;
let controls    = null;   // ← declarado aquí antes de todo

const savedCamPos = new THREE.Vector3();
const mouse    = new THREE.Vector2(-999, -999);
const raycaster = new THREE.Raycaster();
const clock    = new THREE.Clock();

/* ════════════════════════════════════════════════════
   ORBIT CONTROLS — se llama después de cargar el script
════════════════════════════════════════════════════ */
function initControls() {
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(CFG.camLookAt.x, CFG.camLookAt.y, CFG.camLookAt.z);

  controls.minDistance    = 0.5;
  controls.maxDistance    = 8;
  controls.minPolarAngle  = 0.2;
  controls.maxPolarAngle  = Math.PI / 2 + 0.15;

  controls.enableDamping  = true;
  controls.dampingFactor  = 0.06;
  controls.rotateSpeed    = 0.6;
  controls.zoomSpeed      = 0.8;
  controls.panSpeed       = 0.4;

  controls.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT:  THREE.MOUSE.PAN,
  };

  controls.update();
  console.log('✅ OrbitControls iniciado');
}

/* ════════════════════════════════════════════════════
   LOAD GLB
════════════════════════════════════════════════════ */
function loadModel() {
  const loader = new THREE.GLTFLoader();
  loader.load(CFG.modelPath, onLoaded, onProgress, onError);
}

function onLoaded(gltf) {
  gltf.scene.traverse(child => {
    child.castShadow    = true;
    child.receiveShadow = true;

    const name = child.name;

    if (name === CFG.screen1) {
      screen1Mesh = child;
      if (child.isMesh) applyScreenMaterial(child, 0x003a00, 0.6);
      allInteractable.push(child);
      console.log('✅ Pantalla01 añadida');
    }

    if (name === 'Pantalla02') {
      screen2Mesh = child;
      if (child.isMesh) applyScreenMaterial(child, 0x000000, 0.0);
      console.log('📴 Pantalla02 apagada');
    }

    const linkKey = Object.entries(CFG.links).find(([, v]) => v === name)?.[0];
    if (linkKey) {
      linkMeshes[linkKey] = child;
      child.traverse(subchild => {
        if (subchild.isMesh) {
          allInteractable.push(subchild);
          subchild.userData.linkKey = linkKey;
          if (subchild.material) {
            subchild.material = subchild.material.clone();
            subchild.material.emissive = new THREE.Color(0x002200);
            subchild.material.emissiveIntensity = 0.3;
          }
        }
      });
      if (child.isMesh) {
        allInteractable.push(child);
        child.userData.linkKey = linkKey;
      }
      console.log('✅ LINK encontrado:', linkKey);
    }
  });

  console.log('🎯 allInteractable total:', allInteractable.length);
  scene.add(gltf.scene);
  finishLoading();
}

function applyScreenMaterial(mesh, emissiveHex, intensity) {
  if (!mesh.material) return;
  mesh.material = mesh.material.clone();
  mesh.material.emissive          = new THREE.Color(emissiveHex);
  mesh.material.emissiveIntensity = intensity;
  mesh.material.roughness         = 0.04;
  mesh.material.metalness         = 0.1;
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

  const mesh    = hits[0].object;
  const name    = mesh.name;
  const linkKey = mesh.userData.linkKey
    || Object.entries(CFG.links).find(([, v]) => v === name)?.[0];

  if (name === CFG.screen1 && !isZoomed) {
    zoomToMonitor();
    return;
  }

  if (linkKey) {
    const url = CFG.urls[linkKey];
    if (url.startsWith('mailto:')) {
      window.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}

/* ── Hover ────────────────────────────────────────── */
function updateHover() {
  if (isZoomed || !allInteractable.length) { clearHover(); return; }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(allInteractable, true);

  if (hits.length > 0) {
    const mesh   = hits[0].object;
    const tipKey = CFG.tooltips[mesh.name] ? mesh.name : (mesh.userData.linkKey || null);
    const tip    = tipKey ? CFG.tooltips[tipKey] : null;

    if (hoveredMesh !== mesh) {
      hoveredMesh = mesh;
      if (tip && ttIcon && ttText) {
        ttIcon.textContent = tip.icon;
        ttText.innerHTML   = `<span class="tt-label">${tip.label}</span><span class="tt-sub">${tip.sub}</span>`;
      }
      tooltipEl.classList.add('show');
      document.body.style.cursor = 'pointer';
      if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
        gsap.to(mesh.material, { emissiveIntensity: 0.75, duration: 0.2 });
      }
    }
  } else {
    clearHover();
  }
}

function clearHover() {
  if (hoveredMesh) {
    const mat  = hoveredMesh.material;
    const base = hoveredMesh.name === CFG.screen1 ? 0.6 : 0.3;
    if (mat && mat.emissiveIntensity !== undefined) {
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
  if (controls) controls.enabled = false;
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
    onComplete() {
      isZoomed = isAnimating = false;
      hintEl.style.opacity = '1';
      if (controls) {
        controls.enabled = true;
        controls.target.set(CFG.camLookAt.x, CFG.camLookAt.y, CFG.camLookAt.z);
        controls.update();
      }
    }
  });
}

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

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // OrbitControls maneja la cámara — NO hay idleSway
  if (controls) controls.update();

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
  const s1 = document.createElement('script');
  s1.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';

  const s2 = document.createElement('script');
  s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  s1.onload = () => {
    document.head.appendChild(s2);
    s2.onload = () => {
      initControls(); // ← primero controls
      loadModel();    // ← luego modelo
      animate();      // ← luego render loop
    };
    s2.onerror = () => console.error('Error cargando OrbitControls');
  };
  s1.onerror = () => console.error('Error cargando GLTFLoader');
  document.head.appendChild(s1);
})();