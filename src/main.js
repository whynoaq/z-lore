import * as THREE from 'three'
import {
  setupInput,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked
} from './input.js'
import { Player } from './player.js'
import { FirstPersonCamera } from './camera.js'
import { createWorld } from './world.js'

let scene, camera, renderer, player, cameraCtrl, collidables, clock
let isLoaded = false

const loadingEl = document.getElementById('loading')
const uiEl = document.getElementById('ui')
const crosshairEl = document.getElementById('crosshair')

function init() {
  // Сцена
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87ceeb)
  scene.fog = new THREE.Fog(0x87ceeb, 1, 60)

  // Камера (first-person)
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)

  // Рендерер
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  document.body.appendChild(renderer.domElement)

  // Игрок (невидимый коллизионный элемент + камера над ним)
  player = new Player()
  scene.add(player.group)

  // Мир
  collidables = createWorld(scene)

  // Камера от первого лица
  cameraCtrl = new FirstPersonCamera(camera, player)

  // Ввод
  setupInput()

  // Часы
  clock = new THREE.Clock()

  // Overlay для входа (браузер требует пользовательское взаимодействие перед pointer lock)
  const overlay = document.createElement('div')
  overlay.id = 'overlay'
  overlay.innerHTML = `
    <div>
      <h2>3D Платформер (от первого лица)</h2>
      <p>Нажмите мышкой, чтобы начать</p>
      <p style="font-size:0.8rem;opacity:0.8;margin-top:8px">WASD — движение • Пробел — прыжок • Мышь — обзор</p>
    </div>
  `
  document.body.appendChild(overlay)

  overlay.addEventListener('click', () => {
    requestPointerLock()
  })

  document.addEventListener('pointerlockchange', () => {
    const locked = isPointerLocked()
    uiEl.style.display = locked ? 'none' : ''
    crosshairEl.style.display = locked ? 'block' : 'none'
    overlay.style.display = locked ? 'none' : ''
    if (locked) cameraCtrl.lock()
    else cameraCtrl.unlock()
  })

  document.addEventListener('pointerlockerror', () => {
    alert('Не удалось захватить указатель мыши. Попробуйте ещё раз.')
  })

  // Escape — выход из захвата мыши
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') exitPointerLock()
  })

  isLoaded = true
  if (loadingEl) loadingEl.style.display = 'none'
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', onResize)

function animate() {
  requestAnimationFrame(animate)

  if (!isLoaded) return

  const dt = Math.min(clock.getDelta(), 0.1)

  const cameraMove = cameraCtrl.update(dt)
  player.update(dt, collidables, cameraMove)

  renderer.render(scene, camera)
}

init()
animate()