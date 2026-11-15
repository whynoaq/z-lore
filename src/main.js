import * as THREE from 'three'
import {
  setupInput,
  requestPointerLock,
  exitPointerLock,
  isPointerLocked,
  setTouchMove,
  clearTouchMove,
  requestJump,
  addLookDelta,
  isTouchDevice
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

  // Overlay для входа
  const overlay = document.createElement('div')
  overlay.id = 'overlay'
  const mobile = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  const touch = isTouchDevice()
  overlay.innerHTML = mobile
    ? `<div><h2>3D Платформер (от первого лица)</h2><p>Коснитесь экрана, чтобы начать</p><p style="font-size:0.8rem;opacity:0.8;margin-top:8px">Джойстик — движение • Свайп справа — обзор • Кнопка — прыжок</p></div>`
    : `<div><h2>3D Платформер (от первого лица)</h2><p>Нажмите мышкой, чтобы начать</p><p style="font-size:0.8rem;opacity:0.8;margin-top:8px">WASD — движение • Пробел — прыжок • Мышь — обзор</p></div>`
  document.body.appendChild(overlay)

  if (mobile) {
    overlay.style.display = 'none'
    if (uiEl) uiEl.style.display = 'none'
    if (crosshairEl) crosshairEl.style.display = 'block'
    cameraCtrl.lock()
    createMobileControls()
  } else {
    overlay.addEventListener('click', () => {
      requestPointerLock()
    })
  }

  if (!mobile && touch) {
    createMobileControls()
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = isPointerLocked()
    if (uiEl) uiEl.style.display = locked ? 'none' : ''
    if (crosshairEl) crosshairEl.style.display = locked ? 'block' : 'none'
    overlay.style.display = locked ? 'none' : ''
    if (locked) cameraCtrl.lock()
    else cameraCtrl.unlock()
  })

  document.addEventListener('pointerlockchange', () => {
    const locked = isPointerLocked()
    if (uiEl) uiEl.style.display = locked ? 'none' : ''
    if (crosshairEl) crosshairEl.style.display = locked ? 'block' : 'none'
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

  joystick.classList.add('active')
  jump.classList.add('active')

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
    knob.style.transform = `translate(${kx}px, ${ky}px)`
    setTouchMove(kx / joyRadius, ky / joyRadius)
  }

  const lookTouches = {}

  function handleTouchStart(e) {
    let prevent = false
    for (const t of e.changedTouches) {
      const target = t.target
      if (target === joystick || joystick.contains(target)) {
        joyTouchId = t.identifier
        const rect = joystick.getBoundingClientRect()
        joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        updateJoy(t.clientX, t.clientY)
        prevent = true
      } else if (target === jump) {
        requestJump()
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

init()
animate()