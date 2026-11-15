import * as THREE from 'three'
import { getMouseDelta } from './input.js'

const _euler = new THREE.Euler()
const _quat = new THREE.Quaternion()
const _forward = new THREE.Vector3(0, 0, -1)
const _right = new THREE.Vector3(1, 0, 0)

export class FirstPersonCamera {
  constructor(camera, player) {
    this.camera = camera
    this.player = player
    this.yaw = 0
    this.pitch = 0
    this.sensitivity = 0.002
    this.height = 1.5
    this.locked = false
  }

  lock() { this.locked = true }
  unlock() { this.locked = false }
  isLocked() { return this.locked }

  update(dt) {
    if (this.locked) {
      const { x, y } = getMouseDelta()
      this.yaw -= x * this.sensitivity
      this.pitch -= y * this.sensitivity
      this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch))
    }

    // Камера позиционируется над игроком (уровень глаз)
    this.camera.position.set(
      this.player.group.position.x,
      this.player.group.position.y + this.height,
      this.player.group.position.z
    )

    _euler.set(this.pitch, this.yaw, 0, 'YXZ')
    _quat.setFromEuler(_euler)
    this.camera.quaternion.copy(_quat)

    // Направление вперед и вправо по плоскости XZ (для движения игрока)
    _forward.copy(new THREE.Vector3(0, 0, -1)).applyQuaternion(_quat)
    _forward.y = 0
    _forward.normalize()

    _right.copy(new THREE.Vector3(1, 0, 0)).applyQuaternion(_quat)
    _right.y = 0
    _right.normalize()

    return { forward: _forward.clone(), right: _right.clone() }
  }
}