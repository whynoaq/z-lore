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
let introActive = true
let introStart = null
const INTRO_DURATION = 5.2

const loadingEl = document.getElementById('loading')
const uiEl = document.getElementById('ui')
const crosshairEl = document.getElementById('crosshair')

function init() {
  // Сцена
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2a2a3a)
  scene.fog = new THREE.Fog(0x12121a, 1, 45)

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
  player.group.position.set(0, 0.5, -1.0)
  cameraCtrl.intro = true
  cameraCtrl.pitch = Math.PI / 2
  cameraCtrl.height = 0.2

  const introFade = document.createElement('div')
  introFade.id = 'intro-fade'
  document.body.appendChild(introFade)

  const introText = document.createElement('div')
  introText.id = 'intro-text'
  introText.textContent = 'Где я?'
  document.body.appendChild(introText)

  // Ввод
  setupInput()

  // Часы
  clock = new THREE.Clock()

  // Мрачные оверлеи (Cry of Fear style)
  ;['tint','vignette','grain'].forEach((id) => {
    const el = document.createElement('div')
    el.id = id
    document.body.appendChild(el)
  })

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
    window.addEventListener('click', () => {
      if (!isPointerLocked()) requestPointerLock()
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

  if (introActive) {
    if (introStart === null) introStart = clock.elapsedTime
    const t = clock.elapsedTime - introStart
    const fadeEl = document.getElementById('intro-fade')
    const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (6 * x - 15) + 10) }
    if (t < 0.6) {
      if (fadeEl) fadeEl.classList.add('hide')
      cameraCtrl.pitch = Math.PI / 2
      cameraCtrl.height = 0.2
      cameraCtrl.yaw = 0
      player.group.position.set(0, 0.5, -1.0)
    } else if (t < 2.0) {
      const k = sm((t - 0.6) / 1.4)
      cameraCtrl.pitch = Math.PI / 2 * (1 - k) + 0.08 * Math.sin(k * Math.PI)
      cameraCtrl.height = 0.2 + 0.6 * k
      cameraCtrl.yaw = 0
      player.group.position.set(0, 0.5, -1.0 + 0.8 * k)
    } else if (t < 3.2) {
      const k = sm((t - 2.0) / 1.2)
      cameraCtrl.pitch = 0.05 * Math.sin(k * Math.PI * 2)
      cameraCtrl.height = 0.8
      cameraCtrl.yaw = 0.35 * Math.sin(k * Math.PI * 2)
      player.group.position.set(0, 0.5, -0.2)
    } else if (t < 4.2) {
      const k = sm((t - 3.2) / 1.0)
      cameraCtrl.pitch = 0
      cameraCtrl.height = 0.8
      cameraCtrl.yaw = -0.3 + (Math.PI / 3 + 0.3) * k + 0.08 * Math.sin(k * Math.PI)
      player.group.position.set(0, 0.5, -0.2 + 0.4 * k)
    } else if (t < 5.2) {
      const k = sm((t - 4.2) / 1.0)
      cameraCtrl.pitch = -0.12 * (1 - k)
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
    knob.style.transform = `translate(${kx}px, ${ky}px)`
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


init()
animate()