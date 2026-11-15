import * as THREE from 'three'
import { getInputVector, isKey } from './input.js'

const _move = new THREE.Vector3()
const _targetVelocity = new THREE.Vector3()

export class Player {
  constructor() {
    this.group = new THREE.Group()
    this.group.position.set(0, 2, 0)

    // Физика
    this.velocity = new THREE.Vector3()
    this.speed = 7
    this.jumpForce = 11
    this.gravity = 36
    this.grounded = false
    this.height = 1.5
    this.radius = 0.35
  }

  update(dt, collidables, cameraMove) {
    const input = getInputVector()
    const { forward, right } = cameraMove

    // Направление движения зависит от взгляда камеры
    _move.set(0, 0, 0)
    if (input.len > 0) {
      _move.addScaledVector(forward, -input.z)  // W/S
      _move.addScaledVector(right, input.x)     // A/D
      if (_move.lengthSq() > 0) _move.normalize().multiplyScalar(input.len)
    }

    _targetVelocity.set(_move.x * this.speed, this.velocity.y, _move.z * this.speed)
    this.velocity.lerp(_targetVelocity, dt * 10)

    // Гравитация
    if (!this.grounded) {
      this.velocity.y -= this.gravity * dt
    } else {
      this.velocity.y = 0
    }

    // Прыжок
    if (this.grounded && isKey('Space')) {
      this.velocity.y = this.jumpForce
      this.grounded = false
    }

    // Применение перемещения
    this.group.position.x += this.velocity.x * dt
    this.group.position.z += this.velocity.z * dt
    this.group.position.y += this.velocity.y * dt

    // Коллизия снизу (пол / платформы)
    this.grounded = false
    const rayOrigin = this.group.position.clone()
    rayOrigin.y += 0.1
    const raycaster = new THREE.Raycaster(rayOrigin, new THREE.Vector3(0, -1, 0), 0, this.height / 2 + 0.25)
    const hits = raycaster.intersectObjects(collidables)

    if (hits.length > 0) {
      const hit = hits[0]
      const surfaceY = hit.point.y + this.height / 2
      if (this.group.position.y <= surfaceY + 0.05) {
        this.group.position.y = surfaceY
        this.velocity.y = 0
        this.grounded = true
      }
    }

    // Сброс, если упали в бездну
    if (this.group.position.y < -5) {
      this.group.position.set(0, 5, 0)
      this.velocity.set(0, 0, 0)
    }
  }
}