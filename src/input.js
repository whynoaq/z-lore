const keys = {}
let mouseDelta = { x: 0, y: 0 }
let touchMove = { x: 0, z: 0, len: 0 }

export function isTouchDevice() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0
}

export function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
    keys[e.code] = true
  })
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false
  })
  window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      mouseDelta.x = e.movementX
      mouseDelta.y = e.movementY
    }
  })

  // Touch: prevent default scrolling/zooming
  document.addEventListener('touchmove', (e) => {
    // allow joystick/look handlers to manage preventDefault; global guard for safety
  }, { passive: false })
}

export function isKey(code) {
  return !!keys[code]
}

export function setTouchMove(x, z) {
  const len = Math.hypot(x, z)
  if (len > 0) {
    touchMove.x = x / (len > 1 ? len : 1)
    touchMove.z = z / (len > 1 ? len : 1)
    touchMove.len = Math.min(len, 1)
  } else {
    touchMove.x = 0
    touchMove.z = 0
    touchMove.len = 0
  }
}

export function clearTouchMove() {
  touchMove.x = 0
  touchMove.z = 0
  touchMove.len = 0
}

export function addLookDelta(dx, dy) {
  mouseDelta.x += dx
  mouseDelta.y += dy
}

export function requestJump() {
  keys['Space'] = true
  setTimeout(() => { keys['Space'] = false }, 180)
}

export function getInputVector() {
  let x = 0
  let z = 0

  if (isKey('KeyW') || isKey('ArrowUp')) z -= 1
  if (isKey('KeyS') || isKey('ArrowDown')) z += 1
  if (isKey('KeyA') || isKey('ArrowLeft')) x -= 1
  if (isKey('KeyD') || isKey('ArrowRight')) x += 1

  const klen = Math.hypot(x, z)
  if (klen > 0) {
    x /= klen
    z /= klen
  }

  if (touchMove.len > 0) {
    return { x: touchMove.x, z: touchMove.z, len: touchMove.len }
  }

  const len = Math.hypot(x, z)
  return len > 0 ? { x: x / len, z: z / len, len: 1 } : { x: 0, z: 0, len: 0 }
}

export function getMouseDelta() {
  const d = { x: mouseDelta.x, y: mouseDelta.y }
  mouseDelta.x = 0
  mouseDelta.y = 0
  return d
}

export function requestPointerLock() {
  document.body.requestPointerLock()
}

export function exitPointerLock() {
  document.exitPointerLock()
}

export function isPointerLocked() {
  return document.pointerLockElement === document.body
}
