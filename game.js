/* ---------- input ---------- */
const keys = {};
let mouseDelta = { x: 0, y: 0 };
let touchMove = { x: 0, z: 0, len: 0 };
let introActive = true;
let flashlightOn = true;
let introStart = null;
const INTRO_DURATION = 5.2;

function isTouchDevice() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
}

window.addEventListener('keydown', (e) => { if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => { if (document.pointerLockElement) { mouseDelta.x = e.movementX; mouseDelta.y = e.movementY; } });

function isKey(code) { return !!keys[code]; }

function setTouchMove(x, z) {
  const len = Math.hypot(x, z);
  if (len > 0) {
    const n = len > 1 ? len : 1;
    touchMove.x = x / n;
    touchMove.z = z / n;
    touchMove.len = Math.min(len, 1);
  } else {
    touchMove.x = 0; touchMove.z = 0; touchMove.len = 0;
  }
}
function clearTouchMove() { touchMove.x = 0; touchMove.z = 0; touchMove.len = 0; }
function addLookDelta(dx, dy) { mouseDelta.x += dx * 4; mouseDelta.y += dy * 4; }
function requestJump() { keys['Space'] = true; setTimeout(() => { keys['Space'] = false; }, 180); }

function getInputVector() {
  let x = 0, z = 0;
  if (isKey('KeyW') || isKey('ArrowUp')) z -= 1;
  if (isKey('KeyS') || isKey('ArrowDown')) z += 1;
  if (isKey('KeyA') || isKey('ArrowLeft')) x -= 1;
  if (isKey('KeyD') || isKey('ArrowRight')) x += 1;
  const klen = Math.hypot(x, z);
  if (klen > 0) { x /= klen; z /= klen; }
  if (touchMove.len > 0) {
    return { x: touchMove.x, z: touchMove.z, len: touchMove.len };
  }
  return klen > 0 ? { x, z, len: 1 } : { x: 0, z: 0, len: 0 };
}
function getMouseDelta() { const d = { x: mouseDelta.x, y: mouseDelta.y }; mouseDelta.x = 0; mouseDelta.y = 0; return d; }
function requestPointerLock() { document.body.requestPointerLock(); }
function exitPointerLock() { document.exitPointerLock(); }
function isPointerLocked() { return !!document.pointerLockElement; }

/* ---------- camera ---------- */
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _forward = new THREE.Vector3(0, 0, -1);
const _right = new THREE.Vector3(1, 0, 0);

class FirstPersonCamera {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.yaw = 0;
    this.pitch = 0;
    this.sensitivity = 0.002;
    this.height = 1.5;
    this.locked = false;
  }
  lock() { this.locked = true; }
  unlock() { this.locked = false; }
  update(dt) {
    const { x: mx, y: my } = getMouseDelta();
    if (mx !== 0 || my !== 0) {
      this.yaw -= mx * this.sensitivity;
      this.pitch -= my * this.sensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
    }
    this.camera.position.set(this.player.group.position.x, this.player.group.position.y + this.height, this.player.group.position.z);
    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    _quat.setFromEuler(_euler);
    this.camera.quaternion.copy(_quat);
    _forward.copy(new THREE.Vector3(0, 0, -1)).applyQuaternion(_quat);
    _forward.y = 0; _forward.normalize();
    _right.copy(new THREE.Vector3(1, 0, 0)).applyQuaternion(_quat);
    _right.y = 0; _right.normalize();
    return { forward: _forward.clone(), right: _right.clone() };
  }
}

/* ---------- player ---------- */
const _move = new THREE.Vector3();
const _targetVelocity = new THREE.Vector3();
class Player {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, 2, 0);
    this.velocity = new THREE.Vector3();
    this.speed = 7;
    this.jumpForce = 11;
    this.gravity = 36;
    this.grounded = false;
    this.height = 1.5;
    this.radius = 0.35;
  }
  update(dt, collidables, cameraMove) {
    const input = getInputVector();
    const { forward, right } = cameraMove;
    _move.set(0, 0, 0);
    if (input.len > 0) {
      _move.addScaledVector(forward, -input.z);
      _move.addScaledVector(right, input.x);
      if (_move.lengthSq() > 0) _move.normalize().multiplyScalar(input.len);
    }
    _targetVelocity.set(_move.x * this.speed, this.velocity.y, _move.z * this.speed);
    this.velocity.lerp(_targetVelocity, dt * 10);
    if (!this.grounded) { this.velocity.y -= this.gravity * dt; } else { this.velocity.y = 0; }
    if (this.grounded && isKey('Space')) { this.velocity.y = this.jumpForce; this.grounded = false; }
    this.group.position.x += this.velocity.x * dt;
    this.group.position.z += this.velocity.z * dt;
    this.group.position.y += this.velocity.y * dt;
    this.grounded = false;
    const rayOrigin = this.group.position.clone();
    rayOrigin.y += 0.1;
    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, this.height / 2 + 0.25);
    const hits = raycaster.intersectObjects(collidables);
    if (hits.length > 0) {
      const hit = hits[0];
      const surfaceY = hit.point.y + this.height / 2;
      if (this.group.position.y <= surfaceY + 0.05) {
        this.group.position.y = surfaceY;
        this.velocity.y = 0;
        this.grounded = true;
      }
    }
    if (this.group.position.y < -5) {
      this.group.position.set(0, 5, 0);
      this.velocity.set(0, 0, 0);
    }
  }
}

/* ---------- world ---------- */
function createWorld(scene) {
  const collidables = [];
  const ambient = new THREE.AmbientLight(0x8899bb, 0.3);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0x8899cc, 0.3);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  scene.add(dirLight);
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  collidables.push(floor);
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const platforms = [
    { size: [6, 1, 6], pos: [0, 2, 6] },
    { size: [5, 1, 5], pos: [-8, 4, 2] },
    { size: [4, 1, 4], pos: [8, 5, -4] },
    { size: [7, 1, 3], pos: [0, 7, -10] },
    { size: [3, 1, 3], pos: [-6, 9, 4] },
    { size: [5, 1, 5], pos: [10, 11, 2] },
  ];
  platforms.forEach(({ size, pos }) => {
    const geo = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geo, platformMat);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    collidables.push(mesh);
  });

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 3.2), woodMat);
  frame.position.set(0, 0.1, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  scene.add(frame);

  const legGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15);
  [[-0.95, -1.45], [0.95, -1.45], [-0.95, 1.45], [0.95, 1.45]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, 0.1, z);
    leg.castShadow = true;
    scene.add(leg);
  });

  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 3.0), mattressMat);
  mattress.position.set(0, 0.35, 0);
  mattress.castShadow = true;
  mattress.receiveShadow = true;
  scene.add(mattress);
  collidables.push(mattress);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.6), pillowMat);
  pillow.position.set(0, 0.575, -1.1);
  pillow.castShadow = true;
  scene.add(pillow);

  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.15), woodMat);
  headboard.position.set(0, 0.6, -1.675);
  headboard.castShadow = true;
  scene.add(headboard);

  const fogGeo = new THREE.BufferGeometry();
  const fogCount = 400;
  const fogPos = new Float32Array(fogCount * 3);
  for (let i = 0; i < fogCount; i++) {
    fogPos[i * 3] = (Math.random() - 0.5) * 70;
    fogPos[i * 3 + 1] = Math.random() * 5 + 0.3;
    fogPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  fogGeo.setAttribute('position', new THREE.BufferAttribute(fogPos, 3));
  const fogMat = new THREE.ShaderMaterial({
    uniforms: {
      uLightPos: { value: new THREE.Vector3() },
      uLightColor: { value: new THREE.Color(0xffaa55) },
      uLightRange: { value: 35.0 },
      uLightIntensity: { value: 1.2 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 18.0 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uLightPos;
      uniform vec3 uLightColor;
      uniform float uLightRange;
      uniform float uLightIntensity;
      varying vec3 vWorldPos;
      void main() {
        float d = distance(vWorldPos, uLightPos);
        float atten = 1.0 - smoothstep(0.0, uLightRange, d);
        atten = pow(atten, 1.6) * uLightIntensity;
        vec3 base = vec3(0.25, 0.25, 0.28);
        vec3 col = mix(base, uLightColor, clamp(atten, 0.0, 1.0) * 0.25);
        gl_FragColor = vec4(col, 0.18);
      }
    `,
    transparent: true,
    depthWrite: false
  });
  const fogClouds = new THREE.Points(fogGeo, fogMat);
  scene.add(fogClouds);
  scene.userData.fogClouds = fogClouds;
  return collidables;
}

/* ---------- mobile controls ---------- */
function createMobileControls() {
  const joystick = document.createElement('div')
  joystick.id = 'joystick'
  const knob = document.createElement('div')
  knob.id = 'joystick-knob'
  joystick.appendChild(knob)
  document.body.appendChild(joystick)

  const jump = document.createElement('button')
  jump.id = 'jump-btn'
  jump.textContent = 'Прыжок'
  document.body.appendChild(jump)

  joystick.style.display = 'none'

  let joyTouchId = null
  let joyCenter = { x: 0, y: 0 }
  const joyRadius = 50

  function updateJoy(cx, cy) {
    const dx = cx - joyCenter.x
    const dy = cy - joyCenter.y
    const dist = Math.hypot(dx, dy)
    const clamped = Math.min(dist, joyRadius)
    const ang = Math.atan2(dy, dx)
    const kx = Math.cos(ang) * clamped
    const ky = Math.sin(ang) * clamped
    knob.style.transform = 'translate(' + kx + 'px, ' + ky + 'px)'
    setTouchMove(kx / joyRadius, ky / joyRadius)
  }

  const lookTouches = {}

  function handleTouchStart(e) {
    let prevent = false
    for (const t of e.changedTouches) {
      const target = t.target
      if (target === jump) {
        requestJump()
        prevent = true
      } else if (t.clientX < window.innerWidth / 2) {
        joyTouchId = t.identifier
        joyCenter = { x: t.clientX, y: t.clientY }
        joystick.style.left = (joyCenter.x - 60) + 'px'
        joystick.style.top = (joyCenter.y - 60) + 'px'
        joystick.style.display = 'block'
        updateJoy(t.clientX, t.clientY)
        prevent = true
      } else {
        lookTouches[t.identifier] = { x: t.clientX, y: t.clientY }
        prevent = true
      }
    }
    if (prevent) e.preventDefault()
  }

  function handleTouchMove(e) {
    let prevent = false
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) {
        updateJoy(t.clientX, t.clientY)
        prevent = true
      } else if (lookTouches[t.identifier]) {
        const prev = lookTouches[t.identifier]
        addLookDelta(t.clientX - prev.x, t.clientY - prev.y)
        lookTouches[t.identifier] = { x: t.clientX, y: t.clientY }
        prevent = true
      }
    }
    if (prevent) e.preventDefault()
  }

  function handleTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joyTouchId) {
        joyTouchId = null
        knob.style.transform = 'translate(0px, 0px)'
        joystick.style.display = 'none'
        clearTouchMove()
      }
      delete lookTouches[t.identifier]
    }
  }

  document.addEventListener('touchstart', handleTouchStart, { passive: false })
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd, { passive: false })
  document.addEventListener('touchcancel', handleTouchEnd, { passive: false })

  jump.addEventListener('touchstart', (e) => {
    e.preventDefault()
    e.stopPropagation()
    requestJump()
  }, { passive: false })
}


/* ---------- main ---------- */
let scene, camera, renderer, player, cameraCtrl, collidables, clock;
function init() {
  console.log('init started');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.04);
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  player = new Player();
  scene.add(player.group);
  collidables = createWorld(scene);
  cameraCtrl = new FirstPersonCamera(camera, player);

  const beamGeo = new THREE.ConeGeometry(2.5, 20, 16, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const flashBeam = new THREE.Mesh(beamGeo, beamMat);
  scene.add(flashBeam);

  window.__flashBeam = flashBeam;

  const versionEl = document.createElement('div');
  versionEl.id = 'version';
  versionEl.textContent = 'v0.1.0';
  document.body.appendChild(versionEl);

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF') {
      flashlightOn = !flashlightOn;
      flashLight.visible = flashlightOn;
      flashBeam.visible = flashlightOn;
    }
  });

  clock = new THREE.Clock();
  player.group.position.set(0, 0.5, -1.0);
  cameraCtrl.intro = true;
  cameraCtrl.pitch = Math.PI / 2;
  cameraCtrl.height = 0.2;

  const introFade = document.createElement('div');
  introFade.id = 'intro-fade';
  document.body.appendChild(introFade);

  const introText = document.createElement('div');
  introText.id = 'intro-text';
  introText.textContent = 'Где я?';
  document.body.appendChild(introText);

  // Мрачные оверлеи (Cry of Fear style)
  ['tint','vignette','grain'].forEach((id) => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  });

  const touch = isTouchDevice();
  const mobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.innerHTML = mobile
    ? '<div><h2>3D Платформер (от первого лица)</h2><p>Коснитесь экрана, чтобы начать</p><p style="font-size:0.8rem;opacity:0.8;margin-top:8px">Джойстик — движение • Свайп справа — обзор • Кнопка — прыжок</p></div>'
    : '<div><h2>3D Платформер (от первого лица)</h2><p>Нажмите мышкой, чтобы начать</p><p style="font-size:0.8rem;opacity:0.8;margin-top:8px">WASD — движение • Пробел — прыжок • Мышь — обзор</p></div>';
  document.body.appendChild(overlay);

  if (mobile) {
    overlay.style.display = 'none';
    cameraCtrl.lock();
    createMobileControls();
  } else {
    overlay.addEventListener('click', () => {
      if (!document.pointerLockElement) document.body.requestPointerLock();
    });
    window.addEventListener('click', () => {
      if (!document.pointerLockElement) document.body.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      cameraCtrl.locked = !!document.pointerLockElement;
      if (cameraCtrl.locked) cameraCtrl.lock(); else cameraCtrl.unlock();
    });
  }

  if (!mobile && touch) {
    createMobileControls();
  }
}
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.1);

  if (window.__flashBeam) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    window.__flashBeam.position.copy(camera.position).add(dir.clone().multiplyScalar(10));
    window.__flashBeam.quaternion.copy(camera.quaternion);
    window.__flashBeam.rotateX(-Math.PI / 2);
  }

  const fogClouds = scene.userData.fogClouds;
  if (fogClouds) {
    const pos = fogClouds.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.array[i * 3] += 0.006 * Math.sin(clock.elapsedTime * 0.2 + i);
      pos.array[i * 3 + 2] += 0.003;
      if (pos.array[i * 3 + 2] > 35) pos.array[i * 3 + 2] = -35;
    }
    pos.needsUpdate = true;
  }

  if (introActive) {
    if (introStart === null) introStart = clock.elapsedTime
    const t = clock.elapsedTime - introStart
    const fadeEl = document.getElementById('intro-fade')
    const smooth = function(x){ return x * x * (3 - 2 * x); }
    if (t < 0.6) {
      // открывает глаза
      if (fadeEl) fadeEl.classList.add('hide')
      cameraCtrl.pitch = Math.PI / 2
      cameraCtrl.height = 0.2
      cameraCtrl.yaw = 0
      player.group.position.set(0, 0.5, -1.0)
    } else if (t < 2.0) {
      // потихоньку поднимается
      const k = smooth((t - 0.6) / 1.4)
      cameraCtrl.pitch = Math.PI / 2 * (1 - k)
      cameraCtrl.height = 0.2 + 0.6 * k
      cameraCtrl.yaw = 0
      player.group.position.set(0, 0.5, -1.0 + 0.8 * k)
    } else if (t < 3.2) {
      // осматривается
      const k = smooth((t - 2.0) / 1.2)
      cameraCtrl.pitch = 0
      cameraCtrl.height = 0.8
      if (k < 0.5) cameraCtrl.yaw = 0.5 * smooth(k / 0.5)
      else cameraCtrl.yaw = 0.5 - 0.8 * smooth((k - 0.5) / 0.5)
      player.group.position.set(0, 0.5, -0.2)
    } else if (t < 4.2) {
      // поворачивается влево
      const k = smooth((t - 3.2) / 1.0)
      cameraCtrl.pitch = 0
      cameraCtrl.height = 0.8
      cameraCtrl.yaw = -0.3 + (Math.PI / 3 + 0.3) * k
      player.group.position.set(0, 0.5, -0.2 + 0.4 * k)
    } else if (t < 5.2) {
      // встает (плавно, на месте поворота)
      const k = smooth((t - 4.2) / 1.0)
      cameraCtrl.pitch = 0
      cameraCtrl.height = 0.8 + 0.7 * k
      cameraCtrl.yaw = Math.PI / 3
      player.group.position.set(0, 0.5 + 0.25 * k, 0.2 + 0.8 * k)
    } else {
      introActive = false
      cameraCtrl.intro = false
      cameraCtrl.pitch = 0
      cameraCtrl.height = 1.5
      cameraCtrl.yaw = Math.PI / 3
      player.group.position.set(0, 0.75, 1.5)
      const el = document.getElementById('intro-text')
      if (el) {
        el.classList.add('show')
        setTimeout(() => el.classList.add('hide'), 2000)
      }
      if (fadeEl) fadeEl.classList.add('hide')
    }
    cameraCtrl.update(dt)
    renderer.render(scene, camera)
    return
  }

  const cameraMove = cameraCtrl.update(dt);
  player.update(dt, collidables, cameraMove);
  renderer.render(scene, camera);
}
init();
animate();