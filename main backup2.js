
import * as THREE from 'three';
import { io } from "socket.io-client";
import './style.css';

const mount = document.querySelector('#game');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111a20');
scene.fog = new THREE.FogExp2('#111a20', 0.018);

const camera = new THREE.PerspectiveCamera(
  43, window.innerWidth / window.innerHeight, 0.1, 180
);
camera.position.set(13, 17, 19);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
mount.appendChild(renderer.domElement);

// Lighting
scene.add(new THREE.HemisphereLight('#a8bac1', '#20251f', 2.0));

const moon = new THREE.DirectionalLight('#b4c9d5', 2.5);
moon.position.set(-8, 16, 6);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -25;
moon.shadow.camera.right = 25;
moon.shadow.camera.top = 25;
moon.shadow.camera.bottom = -25;
scene.add(moon);

const amberLight = new THREE.PointLight('#e6a45d', 22, 13, 2);
amberLight.position.set(4, 3, -1);
scene.add(amberLight);

// Reusable materials
const mat = (color, roughness = 0.85, metalness = 0.1) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const groundMat = mat('#343a35');
const concreteMat = mat('#555b55');
const darkMetal = mat('#202a2d', 0.48, 0.65);
const lightMetal = mat('#707a76', 0.5, 0.65);
const rustMat = mat('#74503a');
const hazardMat = mat('#c29a55', 0.8, 0.15);
const blackMat = mat('#101719');
const glassMat = new THREE.MeshStandardMaterial({
  color: '#91aaa8', roughness: 0.2, metalness: 0.5,
  emissive: '#1a3435', emissiveIntensity: 0.8
});
// Orpheus-6 environment materials
const iceGroundMat = mat('#aabac5', 0.92, 0.12);
const iceRockMat = mat('#526574', 0.88, 0.18);
const stationWallMat = mat('#35434d', 0.58, 0.55);
const stationTrimMat = mat('#8296a3', 0.42, 0.72);

const cyanGlowMat = new THREE.MeshStandardMaterial({
  color: '#65dfff',
  emissive: '#16a9ff',
  emissiveIntensity: 2.2,
  metalness: 0.25,
  roughness: 0.3
});

const warningGlowMat = new THREE.MeshStandardMaterial({
  color: '#ff654d',
  emissive: '#ff260e',
  emissiveIntensity: 2.0
});

function box(parent, name, position, size, material, options = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size), material
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, position, radiusTop, radiusBottom, height, material, segments = 12) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Mission environments
const orpheusWorld = new THREE.Group();
orpheusWorld.name = "orpheus-world";
orpheusWorld.visible = false;
scene.add(orpheusWorld);
// Orpheus-6: frozen alien landscape

const orpheusGround = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 140, 100, 100),
  iceGroundMat
);

orpheusGround.rotation.x = -Math.PI / 2;
orpheusGround.position.y = -0.12;
orpheusGround.receiveShadow = true;
orpheusWorld.add(orpheusGround);


orpheusGround.rotation.x = -Math.PI / 2;
orpheusGround.position.y = -0.12;
orpheusGround.receiveShadow = true;
orpheusWorld.add(orpheusGround);

// Layered icy cliffs around the research station
const cliffPositions = [
  [-34, -28, 14, 10, 9],
  [-15, -34, 16, 12, 8],
  [10, -35, 17, 11, 9],
  [34, -25, 14, 15, 9],
  [-38, -5, 15, 13, 10],
  [38, 4, 15, 12, 9],
  [-34, 25, 17, 11, 9],
  [-15, 34, 16, 12, 8],
  [12, 34, 18, 13, 9],
  [35, 27, 15, 12, 9],
  [-43, 14, 10, 9, 8],
  [44, -13, 11, 12, 9]
];

cliffPositions.forEach(([x, z, width, height, depth], index) => {
  const cliff = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 1),
    iceRockMat
  );

  cliff.position.set(x, height * 0.32, z);
  cliff.scale.set(width * 0.65, height, depth * 0.65);
  cliff.rotation.set(
    index * 0.17,
    index * 0.73,
    index * 0.11
  );
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  orpheusWorld.add(cliff);
});

// Scattered ice formations
for (let i = 0; i < 75; i++) {
  const size = 0.2 + Math.random() * 0.65;

  const crystal = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    i % 3 === 0 ? stationTrimMat : iceRockMat
  );

  const angle = Math.random() * Math.PI * 2;
  const radius = 10 + Math.random() * 30;

  crystal.position.set(
    Math.cos(angle) * radius,
    size * 0.22,
    Math.sin(angle) * radius
  );

  crystal.scale.y = 0.25 + Math.random() * 0.8;
  crystal.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );

  crystal.castShadow = true;
  crystal.receiveShadow = true;
  orpheusWorld.add(crystal);
}

// Orpheus-6: abandoned research station


 // Main station structure: separate walls with an open entrance
// Station footprint: x = -6 to 6, z = -8.5 to -1.5

// Back wall
box(
  orpheusWorld,
  "research-station-back-wall",
  [0, 2.2, -8.4],
  [12, 4.4, 0.2],
  stationWallMat
);

// Left wall
box(
  orpheusWorld,
  "research-station-left-wall",
  [-5.9, 2.2, -5],
  [0.2, 4.4, 6.8],
  stationWallMat
);

// Right wall
box(
  orpheusWorld,
  "research-station-right-wall",
  [5.9, 2.2, -5],
  [0.2, 4.4, 6.8],
  stationWallMat
);

// Front wall sections leave a central doorway
box(
  orpheusWorld,
  "research-station-front-left",
  [-4.05, 2.2, -1.6],
  [3.9, 4.4, 0.2],
  stationWallMat
);

box(
  orpheusWorld,
  "research-station-front-right",
  [4.05, 2.2, -1.6],
  [3.9, 4.4, 0.2],
  stationWallMat
);

// Wall above the entrance
box(
  orpheusWorld,
  "research-station-front-header",
  [0, 3.65, -1.6],
  [4.2, 1.5, 0.2],
  stationWallMat
);


 // Interior floor of the research station
const stationFloorMat = mat('#26343a', 0.9, 0.1);

box(
  orpheusWorld,
  "research-station-interior-floor",
  [0, 0.02, -5],
  [11.6, 0.15, 6.5],
  stationFloorMat
);


const stationRoof = box(
  orpheusWorld,
  "research-station-roof",
  [0, 4.55, -5],
  [12.8, 0.35, 7.8],
  darkMetal
);
stationRoof.material = darkMetal.clone();
stationRoof.material.transparent = true;
stationRoof.material.opacity = 0.15;

// Front-facing entrance
box(
  orpheusWorld,
  "station-entrance",
  [0, 1.45, -1.38],
  [2.1, 2.9, 0.18],
  blackMat
);

// Metallic entrance frame
box(
  orpheusWorld,
  "station-door-frame",
  [0, 1.55, -1.25],
  [2.7, 3.2, 0.22],
  stationTrimMat
);

// Recessed doorway
box(
  orpheusWorld,
  "station-door-recess",
  [0, 1.45, -1.12],
  [1.8, 2.7, 0.15],
  blackMat
);

// Glowing doorway indicator
box(
  orpheusWorld,
  "station-door-light",
  [0, 3.1, -1.02],
  [1.2, 0.12, 0.08],
  cyanGlowMat
);

// Front windows
[-4.2, -2.1, 2.1, 4.2].forEach((x, index) => {
  box(
    orpheusWorld,
    `station-window-${index}`,
    [x, 2.55, -1.37],
    [1.25, 1.15, 0.12],
    index % 2 === 0 ? glassMat : cyanGlowMat
  );

  // Window frames
  box(
    orpheusWorld,
    `station-window-frame-${index}`,
    [x, 2.55, -1.29],
    [1.45, 1.35, 0.08],
    stationTrimMat
  );
});

// Roof equipment
box(
  orpheusWorld,
  "station-roof-unit",
  [-3.5, 5.15, -5],
  [2.5, 0.9, 2],
  darkMetal
);

cylinder(
  orpheusWorld,
  [-3.5, 5.8, -5],
  0.55,
  0.7,
  0.35,
  stationTrimMat,
  16
);

// External antenna mast
cylinder(
  orpheusWorld,
  [4.5, 6.1, -5.5],
  0.08,
  0.12,
  3.2,
  lightMetal,
  8
);

// Antenna crossbars
box(
  orpheusWorld,
  "station-antenna-crossbar",
  [4.5, 6.7, -5.5],
  [1.3, 0.08, 0.08],
  stationTrimMat
);

// Warning beacon
const stationBeacon = new THREE.PointLight(
  "#ff654d",
  18,
  9,
  2
);

stationBeacon.position.set(4.5, 7.7, -5.5);
orpheusWorld.add(stationBeacon);

const beaconBulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 12, 12),
  warningGlowMat
);

beaconBulb.position.copy(stationBeacon.position);
orpheusWorld.add(beaconBulb);

// Orpheus-6: communications equipment

// Satellite dish support mast
cylinder(
  orpheusWorld,
  [-5.2, 6.1, -5.5],
  0.1,
  0.14,
  2.8,
  stationTrimMat,
  10
);

// Satellite dish
const satelliteDish = new THREE.Mesh(
  new THREE.SphereGeometry(
    1.25,
    20,
    12,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  ),
  stationTrimMat
);

satelliteDish.position.set(-5.2, 7.3, -5.5);
satelliteDish.rotation.x = Math.PI;
satelliteDish.rotation.z = 0.35;
orpheusWorld.add(satelliteDish);

// Dish receiver
cylinder(
  orpheusWorld,
  [-5.2, 7.9, -5.5],
  0.07,
  0.07,
  1.1,
  darkMetal,
  8
);

// Amber emergency lights beside the entrance
[-1.8, 1.8].forEach((x, index) => {
  const emergencyLight = new THREE.PointLight(
    "#ff654d",
    10,
    5,
    2
  );

  emergencyLight.position.set(x, 2.7, -1);
  orpheusWorld.add(emergencyLight);

  const emergencyBulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.12),
    warningGlowMat
  );

  emergencyBulb.position.copy(emergencyLight.position);
  orpheusWorld.add(emergencyBulb);
});

// Exterior wall-mounted utility boxes
[-4.8, 4.8].forEach((x, index) => {
  box(
    orpheusWorld,
    `station-utility-box-${index}`,
    [x, 1.1, -1.1],
    [0.7, 0.9, 0.45],
    darkMetal
  );

  box(
    orpheusWorld,
    `station-utility-panel-${index}`,
    [x, 1.15, -0.85],
    [0.42, 0.48, 0.06],
    index === 0 ? cyanGlowMat : hazardMat
  );
});

// Orpheus-6: landing platform and walkway

// Main landing platform
box(
  orpheusWorld,
  "orpheus-landing-platform",
  [0, 0.02, 5],
  [15, 0.3, 10],
  stationWallMat
);

// Metal panels across the platform
for (let x = -6; x <= 6; x += 2) {
  box(
    orpheusWorld,
    `landing-panel-${x}`,
    [x, 0.19, 5],
    [1.85, 0.06, 9.5],
    x % 4 === 0 ? stationTrimMat : darkMetal
  );
}

// Yellow safety markings along the edges
for (const x of [-7, 7]) {
  box(
    orpheusWorld,
    `platform-edge-${x}`,
    [x, 0.23, 5],
    [0.12, 0.04, 9.5],
    hazardMat
  );
}

// Walkway connecting platform to the station entrance
box(
  orpheusWorld,
  "station-walkway",
  [0, 0.08, 0.2],
  [3.4, 0.16, 4.8],
  darkMetal
);


// ========================================
// ORPHEUS-6 MAP EXPANSION
// ========================================

// Extended icy paths connecting the new areas
box(
  orpheusWorld,
  "west-research-path",
  [-9, 0.01, 0],
  [8, 0.12, 3],
  darkMetal
);

box(
  orpheusWorld,
  "east-storage-path",
  [9, 0.01, 0],
  [8, 0.12, 3],
  darkMetal
);

box(
  orpheusWorld,
  "north-communications-path",
  [0, 0.01, -12],
  [3, 0.12, 7],
  darkMetal
);

// ----------------------------------------
// WEST: AUXILIARY RESEARCH LAB
// ----------------------------------------

box(
  orpheusWorld,
  "aux-lab-floor",
  [-15, 0.02, 0],
  [9, 0.18, 10],
  stationFloorMat
);

// Lab walls with an open entrance facing east
box(
  orpheusWorld,
  "aux-lab-back-wall",
  [-15, 2, -5],
  [9, 4, 0.25],
  stationWallMat
);

box(
  orpheusWorld,
  "aux-lab-front-wall",
  [-15, 2, 5],
  [9, 4, 0.25],
  stationWallMat
);

box(
  orpheusWorld,
  "aux-lab-west-wall",
  [-19.5, 2, 0],
  [0.25, 4, 10],
  stationWallMat
);

// East wall sections leave a central doorway
box(
  orpheusWorld,
  "aux-lab-east-upper",
  [-10.5, 2, -3.5],
  [0.25, 4, 3],
  stationWallMat
);

box(
  orpheusWorld,
  "aux-lab-east-lower",
  [-10.5, 2, 3.5],
  [0.25, 4, 3],
  stationWallMat
);

// Lab equipment
box(
  orpheusWorld,
  "aux-lab-console",
  [-16.5, 1.1, -3],
  [3, 2, 0.8],
  darkMetal
);

box(
  orpheusWorld,
  "aux-lab-screen",
  [-16.5, 2, -2.55],
  [2.2, 0.9, 0.08],
  cyanGlowMat
);

box(
  orpheusWorld,
  "aux-lab-workbench",
  [-17, 0.9, 2],
  [3, 1.6, 1],
  stationTrimMat
);

// ----------------------------------------
// EAST: EMERGENCY STORAGE SHELTER
// ----------------------------------------

box(
  orpheusWorld,
  "storage-shelter-floor",
  [15, 0.02, 0],
  [9, 0.18, 10],
  stationFloorMat
);

box(
  orpheusWorld,
  "storage-shelter-back-wall",
  [15, 2, -5],
  [9, 4, 0.25],
  stationWallMat
);

box(
  orpheusWorld,
  "storage-shelter-front-wall",
  [15, 2, 5],
  [9, 4, 0.25],
  stationWallMat
);

box(
  orpheusWorld,
  "storage-shelter-east-wall",
  [19.5, 2, 0],
  [0.25, 4, 10],
  stationWallMat
);

// West wall sections leave a doorway
box(
  orpheusWorld,
  "storage-shelter-west-upper",
  [10.5, 2, -3.5],
  [0.25, 4, 3],
  stationWallMat
);

box(
  orpheusWorld,
  "storage-shelter-west-lower",
  [10.5, 2, 3.5],
  [0.25, 4, 3],
  stationWallMat
);

// Storage crates
for (let i = 0; i < 5; i++) {
  const crateX = 12 + (i % 3) * 2.5;
  const crateZ = i < 3 ? -2.8 : 2.5;

  box(
    orpheusWorld,
    `storage-crate-${i}`,
    [crateX, 0.8, crateZ],
    [1.6, 1.6, 1.6],
    i % 2 === 0 ? darkMetal : stationTrimMat
  );
}

// Emergency supply cabinet
box(
  orpheusWorld,
  "emergency-supply-cabinet",
  [18, 1.5, -3.5],
  [1.5, 3, 1.2],
  hazardMat
);

// ----------------------------------------
// NORTH: COMMUNICATIONS OUTPOST
// ----------------------------------------

box(
  orpheusWorld,
  "communications-outpost-floor",
  [0, 0.02, -17],
  [10, 0.18, 7],
  stationFloorMat
);

// Outpost walls with an opening on the south side
box(
  orpheusWorld,
  "communications-back-wall",
  [0, 2, -20.5],
  [10, 4, 0.25],
  stationWallMat
);

box(
  orpheusWorld,
  "communications-west-wall",
  [-5, 2, -17],
  [0.25, 4, 7],
  stationWallMat
);

box(
  orpheusWorld,
  "communications-east-wall",
  [5, 2, -17],
  [0.25, 4, 7],
  stationWallMat
);

// Antenna control console
box(
  orpheusWorld,
  "communications-console",
  [0, 1.1, -19],
  [3.5, 2, 0.8],
  darkMetal
);

box(
  orpheusWorld,
  "communications-screen",
  [0, 2, -18.55],
  [2.7, 0.9, 0.08],
  cyanGlowMat
);

// Antenna outside the outpost
cylinder(
  orpheusWorld,
  [0, 3.5, -22],
  0.08,
  0.12,
  4,
  lightMetal,
  8
);

box(
  orpheusWorld,
  "communications-antenna-crossbar",
  [0, 5.1, -22],
  [1.8, 0.08, 0.08],
  stationTrimMat
);

// ----------------------------------------
// EXTRA COVER AND LANDMARKS
// ----------------------------------------

// ----------------------------------------
// EXTRA COVER AND LANDMARKS
// ----------------------------------------

// Smaller ice formations away from the buildings
const extraIcePositions = [
  [-23, -11],
  [-25, 15],
  [25, -12],
  [26, 16],
  [-8, -27],
  [9, -28],
  [-29, 24],
  [30, 23]
];

extraIcePositions.forEach(([x, z], index) => {
  const size = 0.65 + (index % 3) * 0.2;

  const ice = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 1),
    iceRockMat
  );

  ice.position.set(x, size * 0.45, z);
  ice.scale.set(1.2, 1.5, 0.9);
  ice.rotation.y = index * 0.7;
  ice.castShadow = true;
  ice.receiveShadow = true;

  orpheusWorld.add(ice);
});

// Glowing cyan walkway strips
for (const x of [-1.35, 1.35]) {
  box(
    orpheusWorld,
    `walkway-light-${x}`,
    [x, 0.18, 0.2],
    [0.07, 0.035, 4.5],
    cyanGlowMat
  );
}

// Warning lights around the platform corners
for (const x of [-6.8, 6.8]) {
  for (const z of [1, 9]) {
    const platformLight = new THREE.PointLight(
      "#ff654d",
      7,
      4,
      2
    );

    platformLight.position.set(x, 0.7, z);
    orpheusWorld.add(platformLight);

    const platformBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      warningGlowMat
    );

    platformBulb.position.copy(platformLight.position);
    orpheusWorld.add(platformBulb);
  }
}

// Orpheus-6: abandoned exterior equipment

// Damaged cargo containers
box(
  orpheusWorld,
  "damaged-container-1",
  [-8, 0.9, -2],
  [2.8, 1.8, 1.8],
  rustMat
);

box(
  orpheusWorld,
  "damaged-container-2",
  [8, 0.65, -3],
  [2.2, 1.3, 1.6],
  darkMetal
);

// Container hazard stripes
for (const x of [-8.8, -8.2, -7.6]) {
  box(
    orpheusWorld,
    `container-stripe-${x}`,
    [x, 1.84, -2],
    [0.12, 0.06, 1.7],
    hazardMat
  );
}

// Fallen antenna mast
cylinder(
  orpheusWorld,
  [-6.5, 0.28, 2.5],
  0.09,
  0.12,
  4.5,
  lightMetal,
  8
);

// Broken equipment casing
box(
  orpheusWorld,
  "broken-equipment-casing",
  [6.5, 0.45, 2.5],
  [1.7, 0.9, 1.3],
  stationWallMat
);

// Exposed glowing status panel
box(
  orpheusWorld,
  "broken-equipment-panel",
  [6.5, 0.95, 1.82],
  [0.8, 0.3, 0.08],
  warningGlowMat
);

// Scattered metal debris
for (let i = 0; i < 7; i++) {
  const debris = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.25 + (i % 3) * 0.15,
      0.08,
      0.2 + (i % 2) * 0.12
    ),
    i % 2 === 0 ? lightMetal : rustMat
  );

  debris.position.set(
    -5 + i * 1.6,
    0.22,
    3.5 + (i % 3) * 0.7
  );

  debris.rotation.y = i * 0.7;
  debris.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.12;

  debris.castShadow = true;
  debris.receiveShadow = true;
  orpheusWorld.add(debris);
}

 // Orpheus-6: concealed security data drive
const securityDrive = new THREE.Group();
securityDrive.name = "security-data-drive";

// Tucked behind the damaged equipment, away from the main path
securityDrive.position.set(8.8, 0, -4.2);
securityDrive.rotation.y = -0.65;
orpheusWorld.add(securityDrive);

// Worn, dark casing
const driveBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.38, 0.12, 0.26),
  darkMetal
);
driveBody.position.set(0, 0.12, 0);
driveBody.rotation.z = -0.12;
driveBody.castShadow = true;
securityDrive.add(driveBody);

// Small, dim status light
const driveLightMat = new THREE.MeshStandardMaterial({
  color: "#4b8991",
  emissive: "#173b40",
  emissiveIntensity: 0.45,
  roughness: 0.8
});

const driveLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.025, 8, 8),
  driveLightMat
);
driveLight.position.set(0.1, 0.19, 0.08);
securityDrive.add(driveLight);

// A loose fragment of casing
const driveFragment = new THREE.Mesh(
  new THREE.BoxGeometry(0.16, 0.045, 0.12),
  rustMat
);
driveFragment.position.set(-0.2, 0.09, 0.1);
driveFragment.rotation.y = 0.4;
securityDrive.add(driveFragment);

// Orpheus-6: abandoned research data terminal
const researchTerminal = new THREE.Group();
researchTerminal.name = "research-terminal";
researchTerminal.position.set(4.5, 0, 0.5);
orpheusWorld.add(researchTerminal);

// Heavy terminal pedestal
box(
  researchTerminal,
  "research-terminal-base",
  [0, 0.55, 0],
  [1.1, 1.1, 0.8],
  darkMetal
);

// Angled display screen
const terminalScreen = box(
  researchTerminal,
  "research-terminal-screen",
  [0, 1.35, 0.12],
  [0.85, 0.55, 0.08],
  cyanGlowMat
);

terminalScreen.rotation.x = -0.18;

// Small warning indicator
box(
  researchTerminal,
  "research-terminal-warning",
  [0.38, 0.88, 0.42],
  [0.12, 0.12, 0.05],
  warningGlowMat
);

// Light illuminating the terminal
const terminalLight = new THREE.PointLight(
  "#35cfff",
  5,
  4,
  2
);
terminalLight.position.set(0, 1.7, 0.5);
researchTerminal.add(terminalLight);

// Floating beacon above the first clue
const clueOrbMat = cyanGlowMat.clone();
clueOrbMat.emissiveIntensity = 3.5;

const clueOrb = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 20, 20),
  clueOrbMat
);

clueOrb.position.set(0, 2.3, 0);
researchTerminal.add(clueOrb);

// Soft light around the beacon
const clueOrbLight = new THREE.PointLight("#35cfff", 2, 5);
clueOrbLight.position.set(0, 2.3, 0);
researchTerminal.add(clueOrbLight);

// Orpheus-6: damaged crew recording device
const crewRecording = new THREE.Group();
crewRecording.name = "crew-recording";
crewRecording.position.set(-4.5, 0, 1.5);
orpheusWorld.add(crewRecording);

// Damaged recording unit
const recordingBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.65, 0.4, 0.3),
  darkMetal
);
recordingBody.position.set(0, 0.35, 0);
recordingBody.rotation.z = -0.18;
recordingBody.castShadow = true;
crewRecording.add(recordingBody);

// Glowing recording indicator
const recordingLight = new THREE.Mesh(
  new THREE.SphereGeometry(0.09, 12, 12),
  cyanGlowMat
);
recordingLight.position.set(0.18, 0.58, 0.17);
crewRecording.add(recordingLight);

// Small antenna
const recordingAntenna = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8),
  lightMetal
);
recordingAntenna.position.set(-0.22, 0.62, -0.05);
recordingAntenna.rotation.z = -0.35;
crewRecording.add(recordingAntenna);

/* PROJECT LAST LIGHT: STATION MONSTER */

const monster = new THREE.Group();
monster.name = "station-monster";
monster.position.set(0, 0, -6);
// Monster AI settings
const monsterPatrolPoints = [
  new THREE.Vector3(-3.5, 0, -5.5),
  new THREE.Vector3(3.5, 0, -5.5),
  new THREE.Vector3(3.5, 0, -3),
  new THREE.Vector3(-3.5, 0, -3)
];

let monsterPatrolIndex = 0;
let monsterState = "patrol";
const monsterDetectionRange = 5;
let monsterPausedForClue = false;
const monsterChaseSpeed = 2.2;
const monsterPatrolSpeed = 0.8;
orpheusWorld.add(monster);

// Shadowy creature material
const monsterSkin = new THREE.MeshStandardMaterial({
  color: "#080d12",
  roughness: 0.95,
  metalness: 0.05
});

// Dim red glow for the eyes
const monsterEyeMat = new THREE.MeshStandardMaterial({
  color: "#ff2020",
  emissive: "#ff0000",
  emissiveIntensity: 3
});

// Torso
const monsterTorso = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.46, 1.5, 5, 8),
  monsterSkin
);
monsterTorso.position.y = 1.45;
monsterTorso.castShadow = true;
monster.add(monsterTorso);

// Head
const monsterHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.32, 12, 12),
  monsterSkin
);
monsterHead.scale.set(0.8, 1.2, 0.8);
monsterHead.position.set(0, 2.75, 0.04);
monsterHead.castShadow = true;
monster.add(monsterHead);

// Long arms
const monsterArms = [];

for (const side of [-1, 1]) {
  const arm = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.13, 0.9, 4, 6),
    monsterSkin
  );

  arm.position.set(side * 0.52, 1.35, 0);
  arm.rotation.z = side * -0.18;
  arm.castShadow = true;
  monster.add(arm);
  monsterArms.push({ mesh: arm, side });
}

// Long legs
for (const side of [-1, 1]) {
  const leg = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.16, 0.65, 4, 6),
    monsterSkin
  );

  leg.position.set(side * 0.2, 0.42, 0);
  leg.castShadow = true;
  monster.add(leg);
}
// Glowing eyes facing the station entrance
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 10, 10),
    monsterEyeMat
  );

  eye.position.set(side * 0.115, 2.79, 0.29);
  monster.add(eye);
}
// Very faint red light around its face
const monsterEyeLight = new THREE.PointLight(
  "#ff1010",
  1.5,
  3
);
monsterEyeLight.position.set(0, 2.8, 0.4);
monster.add(monsterEyeLight);

// Terrain
// Vesper-9 mission environment
const vesperWorld = new THREE.Group();
vesperWorld.name = "vesper-world";
scene.add(vesperWorld);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  groundMat
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.12;
ground.receiveShadow = true;
vesperWorld.add(ground);

// Uneven-looking rocky terrain patches
for (let i = 0; i < 150; i++) {
  const x = (Math.random() - 0.5) * 48;
  const z = (Math.random() - 0.5) * 48;
  const size = 0.15 + Math.random() * 0.8;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    i % 3 === 0 ? concreteMat : darkMetal
  );
  rock.position.set(x, -0.04 + Math.random() * 0.04, z);
  rock.scale.y = 0.2 + Math.random() * 0.45;
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  vesperWorld.add(rock);
}

// Cracked-looking industrial landing pad
box(vesperWorld, 'landing pad', [0, -0.01, 0], [13, 0.18, 10], concreteMat);
for (let x = -5.5; x <= 5.5; x += 2.75) {
  box(vesperWorld, 'pad seam', [x, 0.09, 0], [0.035, 0.015, 9.5], darkMetal);
}

for (let z = -4; z <= 4; z += 2) {
  box(vesperWorld, 'pad seam', [0, 0.09, z], [12.5, 0.015, 0.035], darkMetal);
}

// Industrial buildings
function building(x, z, width, height, depth, accent = false) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  vesperWorld.add(group);

  box(group, 'building shell', [0, height / 2, 0],
    [width, height, depth], darkMetal);

  // Roof lip and structural beams
  box(group, 'roof lip', [0, height + 0.08, 0],
    [width + 0.35, 0.18, depth + 0.35], lightMetal);

  for (let side of [-1, 1]) {
    box(group, 'vertical support',
      [side * (width / 2 - 0.12), height / 2, depth / 2 + 0.035],
      [0.22, height, 0.18], lightMetal);
  }

  // Front panels
  const panels = Math.max(2, Math.floor(width / 1.3));
  for (let i = 0; i < panels; i++) {
    const px = -width / 2 + (i + 0.5) * width / panels;
    box(group, 'wall panel', [px, height * 0.56, depth / 2 + 0.025],
      [width / panels - 0.12, height * 0.36, 0.05],
      i % 2 ? darkMetal : concreteMat);
  }

  // Door
  box(group, 'entry recess', [0, height * 0.27, depth / 2 + 0.04],
    [Math.min(1.6, width * 0.3), height * 0.52, 0.08], blackMat);
  box(group, 'door panel', [0, height * 0.27, depth / 2 + 0.09],
    [Math.min(1.35, width * 0.25), height * 0.47, 0.06], darkMetal);

  if (accent) {
    box(group, 'warning stripe', [0, height * 0.77, depth / 2 + 0.08],
      [width * 0.72, 0.13, 0.06], hazardMat);
  }

  // Roof machinery
  box(group, 'roof machinery', [width * 0.2, height + 0.3, 0],
    [width * 0.28, 0.4, depth * 0.35], rustMat);

  return group;
}

building(-8, -7, 7, 4.2, 5, true);
building(8, -8, 6, 3.5, 5, false);
building(-10, 5, 4, 3, 4, false);

// Pipes and support frames
function pipeRun(points, radius = 0.16, material = lightMetal) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    const delta = new THREE.Vector3().subVectors(b, a);
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 10),
      material
    );
    pipe.position.copy(a).add(b).multiplyScalar(0.5);
    pipe.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), delta.normalize()
    );
    pipe.castShadow = true;
    vesperWorld.add(pipe);
  }
}

pipeRun([[-5, 1.7, -7], [-2, 1.7, -7], [-2, 1.7, -2], [2, 1.7, -2]]);
pipeRun([[5, 2.5, -8], [5, 2.5, -4], [8, 2.5, -4]]);
pipeRun([[-9, 1.2, 0], [-6, 1.2, 0], [-6, 1.2, 4]]);

// Fuel tanks
function tank(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  vesperWorld.add(group);

  cylinder(group, [0, 1.2, 0], 0.9, 0.9, 2.2, lightMetal, 16);
  cylinder(group, [0, 2.32, 0], 0.68, 0.9, 0.18, rustMat, 16);
  cylinder(group, [0, 0.1, 0], 0.95, 0.95, 0.2, darkMetal, 16);

  for (let y of [0.45, 1.95]) {
    cylinder(group, [0, y, 0], 0.94, 0.94, 0.1, hazardMat, 16);
  }
  return group;
}
tank(4, -1);
tank(6, 1);

// Floodlight posts
function floodlight(x, z, color = '#d5ae7b') {
  cylinder(vesperWorld, [x, 1.65, z], 0.09, 0.12, 3.3, darkMetal, 8);
  box(vesperWorld, 'light housing', [x, 3.25, z], [0.55, 0.22, 0.4], lightMetal);

  const lamp = new THREE.PointLight(color, 18, 9, 2);
  lamp.position.set(x, 3.05, z);
  vesperWorld.add(lamp);

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.07, 0.25),
    new THREE.MeshBasicMaterial({ color })
  );
  glow.position.set(x, 3.12, z);
  vesperWorld.add(glow);
}
floodlight(-3, -1, '#d5ae7b');
floodlight(10, 0, '#8ba9bd');
floodlight(-12, -4, '#b1c0bf');

// Crates
function crate(x, z, size = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0.48 * size, z);
  vesperWorld.add(group);

  box(group, 'cargo crate', [0, 0, 0],
    [size, size, size], rustMat);
  box(group, 'crate top', [0, size * 0.51, 0],
    [size * 1.03, 0.07 * size, size * 1.03], lightMetal);

  for (let side of [-1, 1]) {
    box(group, 'crate brace', [side * size * 0.34, 0, size * 0.51],
      [size * 0.08, size * 0.95, size * 0.06], hazardMat);
  }
  return group;
}
crate(-3, 3, 1.1);
crate(-4.2, 4.2, 0.75);
crate(9, 3, 1.2);
crate(-13, 7, 1.1);

// A distinctive supply crate objective
const supply = new THREE.Group();
supply.position.set(2.5, 0, 4.2);
vesperWorld.add(supply);

box(supply, 'supply container', [0, 0.55, 0],
  [1.35, 1.1, 1.05], darkMetal);
box(supply, 'container lid', [0, 1.12, 0],
  [1.45, 0.13, 1.15], lightMetal);
box(supply, 'container marking', [0, 0.56, 0.54],
  [0.55, 0.25, 0.025], hazardMat);
box(supply, 'container latch', [0, 0.55, 0.57],
  [0.14, 0.24, 0.06], blackMat);
// Additional fuel cache markers
const fuelCachePositions = [
  [-7, 3],
  [5, -5],
  [12, 5],
  [-13, -3],
  [1, -9],
  [6.67, -2.1],
  [-8, 10]
];

fuelCachePositions.forEach(([x, z], index) => {
  const cache = crate(x, z, 0.85);
  cache.name = `fuel-cache-${index + 1}`;

  const cacheLight = new THREE.PointLight('#e2b36e', 5, 3.5);
  cacheLight.position.set(x, 1.8, z);
  vesperWorld.add(cacheLight);

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshBasicMaterial({ color: '#ffe08a' })
  );
  marker.name = `fuel-marker-${index + 1}`;
  marker.position.set(x, 2.1, z);
  vesperWorld.add(marker);
});

const supplyLight = new THREE.PointLight('#e2b36e', 8, 4);
supplyLight.position.set(2.5, 1.5, 4.2);
vesperWorld.add(supplyLight);

// Objective marker hovering over the crate
const marker = new THREE.Group();
marker.position.set(2.5, 2.1, 4.2);
vesperWorld.add(marker);

const ring = new THREE.Mesh(
  new THREE.TorusGeometry(0.35, 0.035, 8, 28),
  new THREE.MeshBasicMaterial({ color: '#e9bd7e' })
);
ring.rotation.x = Math.PI / 2;
marker.add(ring);

const markerBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6),
  new THREE.MeshBasicMaterial({
    color: '#e9bd7e', transparent: true, opacity: 0.4
  })
);
markerBeam.position.y = 0.65;
marker.add(markerBeam);

// Scattered debris
for (let i = 0; i < 45; i++) {
  const x = (Math.random() - 0.5) * 28;
  const z = (Math.random() - 0.5) * 25;
  if (Math.abs(x) < 7 && Math.abs(z) < 5) continue;

  const debris = box(vesperWorld, 'debris',
    [x, 0.08, z],
    [0.15 + Math.random() * 0.6, 0.1, 0.15 + Math.random() * 0.5],
    i % 2 ? rustMat : darkMetal
  );
  debris.rotation.y = Math.random() * Math.PI;
}

// Player character: armored suit, helmet, backpack, visor and lights
const player = new THREE.Group();
scene.add(player);
player.position.set(0, 0, 1.5);

const suitMat = mat('#89948d', 0.65, 0.35);
const suitDark = mat('#333e40', 0.5, 0.45);
const suitAccent = mat('#c49b64', 0.55, 0.3);

box(player, 'backpack', [0, 1.12, -0.3],
  [0.56, 0.65, 0.32], suitDark);
box(player, 'backpack panel', [0, 1.15, -0.48],
  [0.35, 0.35, 0.05], suitAccent);

const torso = cylinder(player, [0, 1.18, 0], 0.32, 0.4, 0.75, suitMat, 10);
torso.scale.x = 1.05;

cylinder(player, [0, 1.63, 0.02], 0.19, 0.2, 0.13, suitDark, 10);
const helmet = new THREE.Mesh(
  new THREE.SphereGeometry(0.29, 16, 12),
  suitMat
);
helmet.position.set(0, 1.93, 0.02);
helmet.scale.set(0.92, 1, 0.92);
helmet.castShadow = true;
player.add(helmet);

const visor = new THREE.Mesh(
  new THREE.SphereGeometry(0.235, 16, 10, 0, Math.PI * 2, 0.35, 1.05),
  new THREE.MeshStandardMaterial({
    color: '#172c34', metalness: 0.8, roughness: 0.2,
    emissive: '#23404a', emissiveIntensity: 0.7
  })
);
visor.position.set(0, 1.96, 0.16);
visor.scale.set(1, 0.75, 0.65);
player.add(visor);

for (const side of [-1, 1]) {
  const arm = cylinder(player, [side * 0.4, 1.19, 0.02],
    0.12, 0.15, 0.57, suitDark, 8);
  arm.rotation.z = side * -0.16;

  const glove = cylinder(player, [side * 0.43, 0.88, 0.07],
    0.11, 0.11, 0.18, suitAccent, 8);

  const leg = box(player, 'leg',
    [side * 0.17, 0.48, 0], [0.22, 0.52, 0.24], suitDark);
  leg.rotation.z = side * 0.05;

  box(player, 'boot', [side * 0.18, 0.17, 0.06],
    [0.27, 0.2, 0.38], blackMat);
}

// Helmet lamp
const headLamp = new THREE.PointLight('#d5e8d8', 4, 5);
headLamp.position.set(0, 2.05, 0.35);
player.add(headLamp);

// Camera and movement
const keys = new Set();
const clock = new THREE.Clock();
let collected = false;
let walkingTime = 0;
let playerSpeed = 4.2;

let missionActive = false;
let latestGameState = null;
let researchLogFound = false;

let securityDriveFound = false;

function interactWithSecurityDrive() {
  if (!orpheusWorld.visible || !missionActive) return;

  const drivePosition = new THREE.Vector3();
  securityDrive.getWorldPosition(drivePosition);

  if (player.position.distanceTo(drivePosition) >= 2.5) return;

  if (document.getElementById("security-drive-log")) return;

 if (!researchLogFound) {
  document.querySelector("#message").textContent =
    "The drive is encrypted. Recover the research log first.";
  return;
}

  securityDriveFound = true;
  monsterPausedForClue = true;

  const log = document.createElement("div");
  log.id = "security-drive-log";

  log.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10003;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(3, 8, 14, 0.94);
    color: #dcecf2;
    font-family: monospace;
  `;

  log.innerHTML = `
    <div style="
      max-width: 620px;
      padding: 28px;
      border: 1px solid #ff654d;
      background: #10171d;
    ">
      <p style="color: #ff654d;">ORPHEUS-6 // RECOVERED FILE 03</p>
      <h2>SECURITY ARCHIVE</h2>
      <p>ACCESS RECORD: 02:14 STATION TIME</p>
      <p>RESTRICTED LOWER SECTION: UNSEALED</p>
      <p>AUTHORIZATION: COMMAND OVERRIDE</p>
      <p>SECURITY CAMERAS: DISABLED BY MANUAL REQUEST</p>
      <p style="color: #ff654d;">
        WARNING: THE OVERRIDE WAS ISSUED AFTER THE CREW REPORTED THE FIRST INCIDENT.
      </p>
      <p>FILE 03 RECOVERED // ARCHIVE INCOMPLETE</p>
      <button id="close-security-drive">CLOSE</button>
    </div>
  `;

  document.body.appendChild(log);

  document.getElementById("close-security-drive")
    .addEventListener("click", () => {
      log.remove();
      monsterPausedForClue = false;
      document.querySelector("#message").textContent =
        "SECURITY ARCHIVE RECOVERED";
    });
}

function interactWithResearchTerminal() {
  if (!orpheusWorld.visible || !missionActive) return;

  const terminalPosition = new THREE.Vector3();
  researchTerminal.getWorldPosition(terminalPosition);

  if (player.position.distanceTo(terminalPosition) >= 3.5) return;

  if (document.getElementById("research-log")) return;

  researchLogFound = true;

  monsterPausedForClue = true;

  const log = document.createElement("div");
  log.id = "research-log";

  log.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(3, 8, 14, 0.88);
    color: #dcecf2;
    font-family: monospace;
  `;

  log.innerHTML = `
    <div style="
      max-width: 600px;
      padding: 28px;
      border: 1px solid #35cfff;
      background: #101b25;
    ">
      <p style="color: #35cfff;">ORPHEUS-6 // RECOVERED FILE 01</p>
      <h2>RESEARCH LOG</h2>
      <p>Day 184. The station's crew has stopped responding to routine check-ins.</p>
      <p>Three nights in a row, the motion sensors registered movement in sealed sections of the facility.</p>
      <p>The logs show no authorized access. Whatever is moving through the station, it isn't on our crew roster.</p>
      <p style="color: #35cfff;">FILE 01 RECOVERED</p>
      <button id="close-research-log">CLOSE</button>
    </div>
  `;

  document.body.appendChild(log);

 document.getElementById("close-research-log").addEventListener("click", () => {
  log.remove();
  monsterPausedForClue = false;
});

  document.querySelector("#message").textContent =
    "RESEARCH LOG RECOVERED";
}


function interactWithCrewRecording() {
  if (!orpheusWorld.visible || !missionActive) return;

  const recordingPosition = new THREE.Vector3();
  crewRecording.getWorldPosition(recordingPosition);

  if (player.position.distanceTo(recordingPosition) >= 3.5) return;

  if (document.getElementById("crew-recording-log")) return;

  monsterPausedForClue = true;
  const log = document.createElement("div");
  log.id = "crew-recording-log";

  log.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10002;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(3, 8, 14, 0.9);
    color: #dcecf2;
    font-family: monospace;
  `;

  log.innerHTML = `
    <div style="
      max-width: 600px;
      padding: 28px;
      border: 1px solid #35cfff;
      background: #101b25;
    ">
      <p style="color: #35cfff;">ORPHEUS-6 // RECOVERED FILE 02</p>
      <h2>CREW RECORDING</h2>
      <p>“This is Technician Hale. We sealed the lower section after the third sensor alert.”</p>
      <p>“Command says there is no breach. But something keeps appearing on the cameras, even when the corridors are empty.”</p>
      <p>“If anyone finds this, do not restore power to the lower level.”</p>
      <p style="color: #35cfff;">RECORDING RECOVERED</p>
      <button id="close-crew-recording">CLOSE</button>
    </div>
  `;

  document.body.appendChild(log);

  document.getElementById("close-crew-recording").addEventListener("click", () => {
  log.remove();
  monsterPausedForClue = false;
});

  document.querySelector("#message").textContent =
    "CREW RECORDING RECOVERED";
}


window.addEventListener('keydown', (event) => {
  // Let the player type normally in text fields.
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  const key = event.key.toLowerCase();

  if (['w', 'a', 's', 'd', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    event.preventDefault();
  }
  keys.add(key);


if (key === 'e' && missionActive) {
    if (orpheusWorld.visible) {
  const terminalPosition = new THREE.Vector3();
  researchTerminal.getWorldPosition(terminalPosition);

  if (player.position.distanceTo(terminalPosition) < 3.5) {
    interactWithResearchTerminal();
    return;
  }

  const recordingPosition = new THREE.Vector3();
crewRecording.getWorldPosition(recordingPosition);

if (player.position.distanceTo(recordingPosition) < 3.5) {
  interactWithCrewRecording();
  return;
}

const drivePosition = new THREE.Vector3();
securityDrive.getWorldPosition(drivePosition);

if (player.position.distanceTo(drivePosition) < 2.5) {
  interactWithSecurityDrive();
  return;
}

}
  
  const nearbySupply =
    player.position.distanceTo(supply.position) < 4;

  const nearbyFuelCache = fuelCachePositions.some(([x, z]) => {
    const cachePosition = new THREE.Vector3(x, 0.48 * 0.85, z);
    return player.position.distanceTo(cachePosition) < 4;
  });

  if (nearbySupply || nearbyFuelCache) {
  document.querySelector('#message').textContent = 'CHECKING FUEL CACHE...';
  collected = true;

      const nearbyCaches = fuelCachePositions
  .map(([x, z], index) => ({
    index,
    distance: player.position.distanceTo(
      new THREE.Vector3(x, 0.48 * 0.85, z)
    )
  }))
  .filter(cache => cache.distance < 4)
  .sort((a, b) => a.distance - b.distance);

const targetFuelIndex = nearbySupply
  ? 0
  : nearbyCaches.length > 0
    ? nearbyCaches[0].index + 1
    : -1;

  socket.emit("collectFuel", targetFuelIndex, (response) => {
      if (!response?.ok) {
  collected = false;
  console.log("FUEL PICKUP FAILED:", {
    targetFuelIndex,
    response
  });
  document.querySelector('#message').textContent =
    response?.error || "NO FUEL CACHE HERE";
  return;
}

if (targetFuelIndex === 0) {
  supply.visible = false;
  supplyLight.visible = false;
  marker.visible = false;
} else {
  const cache = scene.getObjectByName(
    `fuel-cache-${targetFuelIndex}`
  );

  if (cache) cache.visible = false;
}

      document.querySelector('#message').textContent =
        "FUEL CELL SECURED";
    });
  }
}

});


window.addEventListener('keyup', (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  keys.delete(event.key.toLowerCase());
});

window.addEventListener('blur', () => keys.clear());

const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();

function update(delta, elapsed) {
    clueOrb.position.y = 2.3 + Math.sin(elapsed * 2.5) * 0.12;

  clueOrbMat.emissiveIntensity =
    2.8 + Math.sin(elapsed * 2.5) * 1.2;

  clueOrbLight.intensity =
    1.5 + Math.sin(elapsed * 2.5) * 0.5;
  const move = new THREE.Vector3();
  if (keys.has('w') || keys.has('arrowup')) move.z -= 1;
  if (keys.has('s') || keys.has('arrowdown')) move.z += 1;
  if (keys.has('a') || keys.has('arrowleft')) move.x -= 1;
  if (keys.has('d') || keys.has('arrowright')) move.x += 1;


const moving = move.lengthSq() > 0;

if (missionActive) {
  socket.emit("setInput", {
    up: keys.has("w") || keys.has("arrowup"),
    down: keys.has("s") || keys.has("arrowdown"),
    left: keys.has("a") || keys.has("arrowleft"),
    right: keys.has("d") || keys.has("arrowright")
  });

  if (moving) {
    player.rotation.y = Math.atan2(move.x, move.z);
    walkingTime += delta * 9;
  }
} else if (moving) {
  move.normalize();
  player.position.addScaledVector(move, playerSpeed * delta);
  player.rotation.y = Math.atan2(move.x, move.z);
  walkingTime += delta * 9;
}


  // Keep the character within the playable outpost
  player.position.x = THREE.MathUtils.clamp(player.position.x, -20, 20);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -20, 20);

  // Subtle movement while walking
  player.position.y = moving ? Math.abs(Math.sin(walkingTime)) * 0.045 : 0;

  cameraTarget.set(player.position.x, 0.7, player.position.z);
  desiredCamera.set(
    player.position.x + 13,
    17,
    player.position.z + 19
  );
  camera.position.lerp(desiredCamera, 1 - Math.exp(-3 * delta));
  camera.lookAt(cameraTarget);

  const nearSupply = !collected &&
  vesperWorld.visible &&
  player.position.distanceTo(supply.position) < 4;

document.querySelector('#interaction').classList.toggle(
  'visible',
  nearSupply
);

const terminalPosition = new THREE.Vector3();
researchTerminal.getWorldPosition(terminalPosition);

const nearTerminal =
  orpheusWorld.visible &&
  player.position.distanceTo(terminalPosition) < 3.5;

let terminalPrompt = document.getElementById('terminal-interaction');

if (!terminalPrompt) {
  terminalPrompt = document.createElement('button');
  terminalPrompt.id = 'terminal-interaction';
  terminalPrompt.textContent = 'INTERACT WITH TERMINAL  |  E / TAP';
  terminalPrompt.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 110px;
    transform: translateX(-50%);
    z-index: 1000;
    padding: 16px 22px;
    border: 1px solid #35cfff;
    border-radius: 8px;
    background: rgba(5, 15, 25, 0.95);
    color: #ffffff;
    font: bold 14px monospace;
    cursor: pointer;
    display: none;
  `;

  terminalPrompt.addEventListener('click', () => {
    interactWithResearchTerminal();
  });

  document.body.appendChild(terminalPrompt);
}

terminalPrompt.style.display = nearTerminal ? 'block' : 'none';

const recordingPosition = new THREE.Vector3();
crewRecording.getWorldPosition(recordingPosition);

const nearRecording =
  orpheusWorld.visible &&
  player.position.distanceTo(recordingPosition) < 3.5;

let recordingPrompt = document.getElementById('recording-interaction');

if (!recordingPrompt) {
  recordingPrompt = document.createElement('button');
  recordingPrompt.id = 'recording-interaction';
  recordingPrompt.textContent = 'CREW RECORDING  |  E / TAP';

  recordingPrompt.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 170px;
    transform: translateX(-50%);
    z-index: 1000;
    padding: 16px 22px;
    border: 1px solid #35cfff;
    border-radius: 8px;
    background: rgba(5, 15, 25, 0.95);
    color: #ffffff;
    font: bold 14px monospace;
    cursor: pointer;
    display: none;
  `;

  recordingPrompt.addEventListener('click', () => {
    interactWithCrewRecording();
  });

  document.body.appendChild(recordingPrompt);
}

recordingPrompt.style.display = nearRecording ? 'block' : 'none';

const drivePosition = new THREE.Vector3();
securityDrive.getWorldPosition(drivePosition);

const nearSecurityDrive =
  orpheusWorld.visible &&
  player.position.distanceTo(drivePosition) < 2.5;

let drivePrompt = document.getElementById("security-drive-interaction");

if (!drivePrompt) {
  drivePrompt = document.createElement("button");
  drivePrompt.id = "security-drive-interaction";
  drivePrompt.textContent = "INSPECT DAMAGED EQUIPMENT  |  E / TAP";

  drivePrompt.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: 230px;
    transform: translateX(-50%);
    z-index: 1000;
    padding: 16px 22px;
    border: 1px solid #ff654d;
    border-radius: 8px;
    background: rgba(5, 15, 25, 0.95);
    color: #ffffff;
    font: bold 14px monospace;
    cursor: pointer;
    display: none;
  `;

drivePrompt.addEventListener("click", () => {
  console.log("Security drive popup clicked");
  interactWithSecurityDrive();
});  document.body.appendChild(drivePrompt);
}

drivePrompt.style.display = nearSecurityDrive ? "block" : "none";

  document.querySelector('#coords').textContent =
    `X ${player.position.x >= 0 ? '+' : ''}${player.position.x.toFixed(1)} / Z ${player.position.z >= 0 ? '+' : ''}${player.position.z.toFixed(1)}`;

  marker.position.y = 2.1 + Math.sin(elapsed * 1.8) * 0.12;
marker.rotation.y = elapsed * 0.6;
supplyLight.intensity = 6 + Math.sin(elapsed * 2) * 2;

// Check whether a position is inside a building wall.
function monsterHitsWall(position) {
  const walls = [
    // Main research station
    { x: 0, z: -8.4, w: 12, d: 0.3 },
    { x: -5.9, z: -5, w: 0.3, d: 6.8 },
    { x: 5.9, z: -5, w: 0.3, d: 6.8 },
    { x: -4.05, z: -1.6, w: 3.9, d: 0.3 },
    { x: 4.05, z: -1.6, w: 3.9, d: 0.3 },

    // Auxiliary research lab
    { x: -19.5, z: 0, w: 0.3, d: 10 },
    { x: -15, z: -5, w: 9, d: 0.3 },
    { x: -15, z: 5, w: 9, d: 0.3 },
    { x: -10.5, z: -3.5, w: 0.3, d: 3 },
    { x: -10.5, z: 3.5, w: 0.3, d: 3 },

    // Storage shelter
    { x: 19.5, z: 0, w: 0.3, d: 10 },
    { x: 15, z: -5, w: 9, d: 0.3 },
    { x: 15, z: 5, w: 9, d: 0.3 },
    { x: 10.5, z: -3.5, w: 0.3, d: 3 },
    { x: 10.5, z: 3.5, w: 0.3, d: 3 },

    // Communications outpost
    { x: 0, z: -20.5, w: 10, d: 0.3 },
    { x: -5, z: -17, w: 0.3, d: 7 },
    { x: 5, z: -17, w: 0.3, d: 7 }
  ];

  const radius = 0.55;

  return walls.some(wall =>
    Math.abs(position.x - wall.x) < wall.w / 2 + radius &&
    Math.abs(position.z - wall.z) < wall.d / 2 + radius
  );
}

// STATION MONSTER AI
if (
  orpheusWorld.visible &&
  missionActive &&
  !monsterPausedForClue
) {
  const monsterTarget = new THREE.Vector3(
    player.position.x,
    0,
    player.position.z
  );

  const distanceToPlayer = monster.position.distanceTo(monsterTarget);

  // Detect the player
  if (distanceToPlayer < monsterDetectionRange) {
    monsterState = "chase";
  } else if (monsterState === "chase" && distanceToPlayer > 9) {
    monsterState = "patrol";
  }

  if (monsterState === "chase") {
    // Move toward the player
    const direction = new THREE.Vector3()
      .subVectors(monsterTarget, monster.position);

    direction.y = 0;

    if (direction.length() > 0.01) {
      direction.normalize();
      const movement = direction.clone().multiplyScalar(
  monsterChaseSpeed * delta
);

const nextPosition = monster.position.clone().add(movement);

if (!monsterHitsWall(nextPosition)) {
  monster.position.copy(nextPosition);
} else {
  // Allow the monster to slide along walls instead of getting stuck.
  const nextX = monster.position.clone();
  nextX.x += movement.x;

  if (!monsterHitsWall(nextX)) {
    monster.position.x = nextX.x;
  }

  const nextZ = monster.position.clone();
  nextZ.z += movement.z;

  if (!monsterHitsWall(nextZ)) {
    monster.position.z = nextZ.z;
  }
}

      monster.rotation.y = Math.atan2(
        direction.x,
        direction.z
      );
    }
  } else {
    // Patrol between waypoints
    const target = monsterPatrolPoints[monsterPatrolIndex];
    const direction = new THREE.Vector3()
      .subVectors(target, monster.position);

    direction.y = 0;

    if (direction.length() < 0.35) {
      monsterPatrolIndex =
        (monsterPatrolIndex + 1) % monsterPatrolPoints.length;
    } else {
      direction.normalize();

      const movement = direction.clone().multiplyScalar(
  monsterPatrolSpeed * delta
);

const nextPosition = monster.position.clone().add(movement);

if (!monsterHitsWall(nextPosition)) {
  monster.position.copy(nextPosition);
} else {
  // Allow the monster to slide along walls instead of getting stuck.
  const nextX = monster.position.clone();
  nextX.x += movement.x;

  if (!monsterHitsWall(nextX)) {
    monster.position.x = nextX.x;
  }

  const nextZ = monster.position.clone();
  nextZ.z += movement.z;

  if (!monsterHitsWall(nextZ)) {
    monster.position.z = nextZ.z;
  }
}

      monster.rotation.y = Math.atan2(
        direction.x,
        direction.z
      );
    }
  }

  // Subtle movement while the monster is active
  monsterTorso.position.y =
    1.45 + Math.sin(elapsed * 2.5) * 0.025;

  monsterEyeLight.intensity =
    1.2 + Math.sin(elapsed * 4) * 0.5;
}
}

// Renderer sizing
function resize() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
window.addEventListener('resize', resize);
resize();

// Game loop
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.04);
  update(delta, clock.elapsedTime);
  renderer.render(scene, camera);
}
animate();


const mainMenu = document.getElementById("main-menu");
const setupScreen = document.getElementById("setup-screen");

document.getElementById("play-button").addEventListener("click", () => {
 
  mainMenu.classList.add("hidden");
  setupScreen.classList.remove("hidden");
});

document.getElementById("back-button").addEventListener("click", () => {
  setupScreen.classList.add("hidden");
  mainMenu.classList.remove("hidden");
});



const lobbyScreen = document.getElementById("lobby-screen");
const gameUI = document.getElementById("game-ui");

const playerNameInput = document.getElementById("player-name");
const roomCodeInput = document.getElementById("room-code");
const setupError = document.getElementById("setup-error");
const lobbyError = document.getElementById("lobby-error");

const lobbyRoomCode = document.getElementById("lobby-room-code");
const crewCount = document.getElementById("crew-count");
const crewList = document.getElementById("crew-list");
const lobbyStatus = document.getElementById("lobby-status");
const launchButton = document.getElementById("launch-button");

// Connect to your existing Node.js server.
const socket = io("http://localhost:3000");

let currentRoomCode = null;
let myPlayerId = null;


const remotePlayers = new Map();
const crewColors = [
  "#e87535", // Orange
  "#24b8c7", // Cyan
  "#a77bdb", // Purple
  "#e4c84a"  // Yellow
];

socket.on("connect_error", () => {
  setupError.textContent =
    "Cannot connect to the server. Make sure the server is running.";
});


socket.on("connect", () => {
  setupError.textContent = "";
});


function showLobby(code) {
  currentRoomCode = code;

  document.getElementById("main-menu").classList.add("hidden");
  setupScreen.classList.add("hidden");
  lobbyScreen.classList.remove("hidden");

  lobbyRoomCode.textContent = code;
  lobbyStatus.textContent = "Waiting for crew...";
  lobbyError.textContent = "";
}

function handleRoomResponse(response) {
  if (!response?.ok) {
    setupError.textContent =
      response?.error || "Could not join the room.";
    return;
  }

  setupError.textContent = "";
  myPlayerId = response.playerId;
  showLobby(response.code);
}

// CREATE CREW
document.getElementById("create-button").addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Crewmate";
  setupError.textContent = "";

  if (!socket.connected) {
    setupError.textContent = "Connecting to server. Try again in a moment.";
    socket.connect();
    return;
  }

  socket.emit("createRoom", { name }, handleRoomResponse);
});

// JOIN CREW
document.getElementById("join-button").addEventListener("click", () => {
  const name = playerNameInput.value.trim() || "Crewmate";
  const code = roomCodeInput.value.trim().toUpperCase();

  setupError.textContent = "";

  if (!code) {
    setupError.textContent = "Enter a room code first.";
    return;
  }

  if (!socket.connected) {
    setupError.textContent = "Connecting to server. Try again in a moment.";
    socket.connect();
    return;
  }

  socket.emit("joinRoom", { code, name }, handleRoomResponse);
});

// Refresh the lobby whenever the server broadcasts room state.

socket.on("state", (state) => {
  if (!state || !Array.isArray(state.players)) {
  console.error("Invalid room state received:", state);
  return;
}
  if (!currentRoomCode || state.code !== currentRoomCode) return;
  latestGameState = state;
  const myFuel = state.playerFuel?.find(p => p.id === myPlayerId);
  const fuelCount = myFuel?.fuelCollected ?? 0;

  const objective = document.querySelector('.objective');
  if (objective) {
    objective.textContent = `FUEL RECOVERED: ${fuelCount} / 8`;
  }

  const phaseLabel = document.getElementById("phase-label");
 if (phaseLabel) {
  if (state.phase === "ship") {
    phaseLabel.textContent = "LOCATION: ASTERION";
  } else if (state.phase === "orpheus") {
    phaseLabel.textContent = "LOCATION: ORPHEUS-6";
  } else {
    phaseLabel.textContent = "LOCATION: VESPER-9";
  }
}
  crewCount.textContent = `${state.players.length}/4`;
  crewList.replaceChildren();

  state.players.forEach((crewMember) => {
    const item = document.createElement("li");
    item.textContent = crewMember.name;
    crewList.appendChild(item);
  });

  lobbyStatus.textContent = state.started
    ? "Mission in progress"
    : "Crew assembled. Ready to launch.";

  launchButton.disabled = state.started;
  missionActive = state.started && state.phase !== "story";

  if (!missionActive) return;

  const toSceneX = x => (x / 1200 - 0.5) * 40;
  const toSceneZ = y => (y / 760 - 0.5) * 40;

  const currentIds = new Set();

  state.players.forEach((crewMember) => {
    currentIds.add(crewMember.id);

    if (crewMember.id === myPlayerId) {
      player.position.x = toSceneX(crewMember.x);
      player.position.z = toSceneZ(crewMember.y);
      return;
    }

    let remote = remotePlayers.get(crewMember.id);

    if (!remote) {
  remote = player.clone(true);
  remote.name = `remote-${crewMember.id}`;
 

  // Create a name tag for this player
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(10, 18, 25, 0.85)";
  context.fillRect(16, 16, 480, 96);

  context.font = "bold 42px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.fillText(crewMember.name || "Crewmate", 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });

  const nameTag = new THREE.Sprite(material);
  nameTag.scale.set(3.2, 0.8, 1);
  nameTag.position.set(0, 3.2, 0);
  remote.add(nameTag);

  // Save the name tag so we can update it later
  remote.userData.nameTag = nameTag;

  scene.add(remote);
  remotePlayers.set(crewMember.id, remote);
}

    remote.position.set(
      toSceneX(crewMember.x),
      0,
      toSceneZ(crewMember.y)
    );
  });

  for (const [id, remote] of remotePlayers) {
    if (!currentIds.has(id)) {
      scene.remove(remote);
      remotePlayers.delete(id);
    }
  }
});


// Launch the mission.
launchButton.addEventListener("click", () => {
  lobbyError.textContent = "";

  socket.emit("startMission", {}, (response) => {
    if (!response?.ok) {
      lobbyError.textContent =
        response?.error || "Could not start the mission.";
    }
  });
});

// The server broadcasts this event to everyone in the room.

socket.on("missionStarted", (mission) => {
  missionActive = true;

  lobbyStatus.textContent = `Mission started: ${mission.planet}`;
  lobbyScreen.classList.add("hidden");
  gameUI.classList.remove("hidden");
});



socket.on("missionPhaseChanged", (data) => {
  missionActive = false;

  const storyOverlay = document.getElementById("story-overlay");
  if (storyOverlay) storyOverlay.remove();

  vesperWorld.visible = false;
  orpheusWorld.visible = true;

  const oldTransition = document.getElementById("mission-transition");
  if (oldTransition) oldTransition.remove();

  const transition = document.createElement("div");
  transition.id = "mission-transition";

  transition.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #050912;
    color: #ffffff;
    text-align: center;
  `;

  transition.innerHTML = `
    <div class="story-card">
      <p class="story-label">ASTERION // NAVIGATION SYSTEM</p>
      <h1>${data.title || "TRANSFERRING TO ORPHEUS-6"}</h1>
      <p class="story-message">${data.message || "Preparing landing zone..."}</p>
      <p class="story-label">ARRIVAL IN PROGRESS...</p>
    </div>
  `;

  document.body.appendChild(transition);

  setTimeout(() => {
    const currentTransition =
      document.getElementById("mission-transition");

    if (currentTransition) {
      const label = currentTransition.querySelector(
        ".story-label:last-child"
      );

      if (label) {
        label.textContent = "ARRIVAL COMPLETE // ORPHEUS-6";
      }
    }

    setTimeout(() => {
      const finalTransition =
        document.getElementById("mission-transition");

      if (finalTransition) {
        finalTransition.remove();
      }

      missionActive = true;
    }, 1500);
  }, 3000);
});



socket.on("storyTransition", (story) => {
  missionActive = false;

  const overlay = document.createElement("div");
  overlay.id = "story-overlay";

  overlay.innerHTML = `
    <div class="story-card">
      <p class="story-label">ASTERION // INCOMING TRANSMISSION</p>
      <h1>${story.title}</h1>
      <p class="story-message">${story.message}</p>
      <button id="story-continue">CONTINUE MISSION</button>
    </div>
  `;

  document.body.appendChild(overlay);

  
document.getElementById("story-continue").addEventListener("click", () => {
  const button = document.getElementById("story-continue");
  button.disabled = true;
  button.textContent = "PREPARING TRANSFER...";

  socket.emit("continueStory", (response) => {
    if (!response?.ok) {
      button.disabled = false;
      button.textContent = "CONTINUE MISSION";
      document.querySelector("#message").textContent =
        response?.error || "Unable to continue mission.";
      return;
    }

    overlay.remove();
    missionActive = true;
  });
});

});

document.getElementById("copy-code-button").addEventListener("click", async () => {
  const code = document.getElementById("lobby-room-code").textContent.trim();
  const error = document.getElementById("lobby-error");

  try {
    await navigator.clipboard.writeText(code);
    error.textContent = "Room code copied!";
  } catch {
    error.textContent = "Copy failed. Please copy the code manually.";
  }
});
