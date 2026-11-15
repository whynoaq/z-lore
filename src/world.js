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

  // Кровать у точки спавна (детализированная)
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21 })
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0 })
  const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff })

  // Рама
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 3.2), woodMat)
  frame.position.set(0, 0.1, 0)
  frame.castShadow = true
  frame.receiveShadow = true
  scene.add(frame)

  // Ножки
  const legGeo = new THREE.BoxGeometry(0.15, 0.2, 0.15)
  ;[[-0.95, -1.45], [0.95, -1.45], [-0.95, 1.45], [0.95, 1.45]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, woodMat)
    leg.position.set(x, 0.1, z)
    leg.castShadow = true
    scene.add(leg)
  })

  // Матрас
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 3.0), mattressMat)
  mattress.position.set(0, 0.35, 0)
  mattress.castShadow = true
  mattress.receiveShadow = true
  scene.add(mattress)
  collidables.push(mattress)

  // Подушка
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.6), pillowMat)
  pillow.position.set(0, 0.575, -1.1)
  pillow.castShadow = true
  scene.add(pillow)

  // Изголовье
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 0.15), woodMat)
  headboard.position.set(0, 0.6, -1.675)
  headboard.castShadow = true
  scene.add(headboard)

  return collidables
}