import * as THREE from 'three'

export function createWorld(scene) {
  const collidables = []

  // Освещение
  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  dirLight.shadow.camera.left = -30
  dirLight.shadow.camera.right = 30
  dirLight.shadow.camera.top = 30
  dirLight.shadow.camera.bottom = -30
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  scene.add(dirLight)

  // Пол
  const floorGeo = new THREE.PlaneGeometry(100, 100)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  collidables.push(floor)

  // Платформы
  const platformMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b })

  const platforms = [
    { size: [6, 1, 6], pos: [0, 2, 6] },
    { size: [5, 1, 5], pos: [-8, 4, 2] },
    { size: [4, 1, 4], pos: [8, 5, -4] },
    { size: [7, 1, 3], pos: [0, 7, -10] },
    { size: [3, 1, 3], pos: [-6, 9, 4] },
    { size: [5, 1, 5], pos: [10, 11, 2] },
  ]

  platforms.forEach(({ size, pos }) => {
    const geo = new THREE.BoxGeometry(...size)
    const mesh = new THREE.Mesh(geo, platformMat)
    mesh.position.set(...pos)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    collidables.push(mesh)
  })

  return collidables
}