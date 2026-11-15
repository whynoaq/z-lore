const keys = {}
let mouseDelta = { x: 0, y: 0 }

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
}

export function isKey(code) {
  return !!keys[code]
}

export function getInputVector() {
  let x = 0
  let z = 0

  if (isKey('KeyW') || isKey('ArrowUp')) z -= 1
  if (isKey('KeyS') || isKey('ArrowDown')) z += 1
  if (isKey('KeyA') || isKey('ArrowLeft')) x -= 1
  if (isKey('KeyD') || isKey('ArrowRight')) x += 1

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