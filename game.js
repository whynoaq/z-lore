/* ---------- input ---------- */
const keys = {};
let mouseDelta = { x: 0, y: 0 };
window.addEventListener('keydown', (e) => { if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => { mouseDelta.x = e.movementX; mouseDelta.y = e.movementY; });
function isKey(code) { return !!keys[code]; }
function getInputVector() {
  let x = 0, z = 0;
  if (isKey('KeyW') || isKey('ArrowUp')) z -= 1;
  if (isKey('KeyS') || isKey('ArrowDown')) z += 1;
  if (isKey('KeyA') || isKey('ArrowLeft')) x -= 1;
  if (isKey('KeyD') || isKey('ArrowRight')) x += 1;
  const len = Math.hypot(x, z);
  return len > 0 ? { x: x / len, z: z / len, len: 1 } : { x: 0, z: 0, len: 0 };
}
function getMouseDelta() { const d = { x: mouseDelta.x, y: mouseDelta.y }; mouseDelta.x = 0; mouseDelta.y = 0; return d; }
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
    if (this.locked) {
      const { x: mx, y: my } = getMouseDelta();
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
      _move.normalize();
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
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  collidables.push(floor);
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b });
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
  return collidables;
}
/* ---------- main ---------- */
let scene, camera, renderer, player, cameraCtrl, collidables, clock;
function init() {
  console.log('init started');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 1, 60);
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
  clock = new THREE.Clock();

  document.addEventListener('pointerlockchange', () => {
    cameraCtrl.locked = document.pointerLockElement === document.body;
    if (cameraCtrl.locked) { cameraCtrl.lock(); } else { cameraCtrl.unlock(); }
  });

  window.addEventListener('click', () => {
    if (document.pointerLockElement !== document.body) { document.body.requestPointerLock(); }
  });
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
  const cameraMove = cameraCtrl.update(dt);
  player.update(dt, collidables, cameraMove);
  renderer.render(scene, camera);
}
init();
animate();