import * as THREE from 'three';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'gltfexporter';
import Stats from 'stats.js';

let stats, gui, watchStrap;

let settings = {
    wireframe: false,
    showHelpers: false,
    showBallons: true,

    droneSpeed: 2,
    rotorSpeed: 0.2,
    rotorRecallSpeed: 1,
    droneScale: 1,

    maxPitchZDegrees: 30,

    resetDrone: function () {
        droneX = 0;
        droneY = 0;
        droneZ = 0;

        droneAngleY = 0;
        droneAngleZ = 0;

        settings.droneSpeed = 2;
        settings.rotorSpeed = 0.2;
        settings.rotorRecallSpeed = 1;
        settings.droneScale = 1;
        settings.maxPitchZDegrees = 30;

        keys = {};

        if (drone) {
            drone.position.set(0, 0, 0);
            drone.rotation.set(0, 0, 0);
            drone.updateMatrixWorld(true);
        }

        if (watchStrap) {
            watchStrap.scale.set(4, 4, 4); 
            watchStrap.position.set(0, -91.5, 0);
        }

        if (gui) {
            gui.controllersRecursive().forEach(controller => {
                controller.updateDisplay();
            });
        }


    }
};

/* GLOBAL VARIABLES */
let scene, camera, frontCamera, topCamera, sideCamera, fixedPerspectiveCamera, fixedOrthogonalCamera, movingPerspectiveCamera, renderer;
let geometry, material, mesh;
let cameras = [];
let currentCamIndex = 0;
let helpers = [];
let helpersVisible = false;
let wireframeActive = false;
let activeBalloons = [];
let isInputLocked = false;
let maxPitchZ = Math.PI / 6;
const BALLOON_RADIUS = 20;
const ROTOR_RADIUS = 25;


// For animation
let keys = {};
let drone;
let droneX = 0;
let droneY = 0;
let droneZ = 0;
let droneAngleZ = 0;
let droneAngleY = 0;

let rotorBladesSpinObjects = [];
let rotorBladesSpinAngle = 0;

// Recall animation
let recallArmActive = false;
let recallRotatorActive = false;
let recallArmObjects = [];
let recallRotorObjects = [];

let recallDirection = 1;
let recallRotatorAngle = 0;
let recallArmAngle = 0;
let recallArmProgress = 0;
let recallRotatorProgress = 0;

/* CREATE SCENE(S) */
function createScene() {
    'use strict';
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x555555);
}

/* CREATE CAMERA(S) */
function createCamera() {
    'use strict';

    const aspect = window.innerWidth / window.innerHeight;
    const fSize = 1000;

    frontCamera = new THREE.OrthographicCamera(-fSize * aspect / 2, fSize * aspect / 2, fSize / 2, -fSize / 2, 0.1,
    10000);
    frontCamera.position.x = 0;
    frontCamera.position.y = 0;
    frontCamera.position.z = 200;
    frontCamera.lookAt(scene.position);

    topCamera = new THREE.OrthographicCamera(-fSize * aspect / 2, fSize * aspect / 2, fSize / 2, -fSize / 2, 0.1,
    10000);
    topCamera.position.x = 0;
    topCamera.position.y = 200;
    topCamera.position.z = 0;
    topCamera.lookAt(scene.position);

    sideCamera = new THREE.OrthographicCamera(-fSize * aspect / 2, fSize * aspect / 2, fSize / 2, -fSize / 2, 0.1,
    10000);
    sideCamera.position.x = 200;
    sideCamera.position.y = 0;
    sideCamera.position.z = 0;
    sideCamera.lookAt(scene.position);

    fixedPerspectiveCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1,
    10000);
    fixedPerspectiveCamera.position.x = 200;
    fixedPerspectiveCamera.position.y = 200;
    fixedPerspectiveCamera.position.z = 200;
    fixedPerspectiveCamera.lookAt(scene.position);

    fixedOrthogonalCamera = new THREE.OrthographicCamera(-fSize * aspect / 2, fSize * aspect / 2, fSize / 2, -fSize / 2, 0.1,
    10000);
    fixedOrthogonalCamera.position.x = 200;
    fixedOrthogonalCamera.position.y = 200;
    fixedOrthogonalCamera.position.z = 200;
    fixedOrthogonalCamera.lookAt(scene.position);

    movingPerspectiveCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1,
    10000);
    movingPerspectiveCamera.position.set(0, 120, 50);
    movingPerspectiveCamera.lookAt(0, 0, -100);

    cameras = [topCamera, sideCamera, frontCamera, fixedOrthogonalCamera,
        fixedPerspectiveCamera, movingPerspectiveCamera];

    const frontHelper = new THREE.CameraHelper(frontCamera);
    scene.add(frontHelper);

    const topHelper = new THREE.CameraHelper(topCamera);
    scene.add(topHelper);

    const sideHelper = new THREE.CameraHelper(sideCamera);
    scene.add(sideHelper);

    const fixedPerspectiveHelper = new THREE.CameraHelper(fixedPerspectiveCamera);
    scene.add(fixedPerspectiveHelper);

    const fixedOrthogonalHelper = new THREE.CameraHelper(fixedOrthogonalCamera);
    scene.add(fixedOrthogonalHelper);

    const movingPerspectiveHelper = new THREE.CameraHelper(movingPerspectiveCamera);
    scene.add(movingPerspectiveHelper);

    helpers = [frontHelper, topHelper, sideHelper, fixedPerspectiveHelper,
        fixedOrthogonalHelper, movingPerspectiveHelper];
}

/* CREATE LIGHT(S) */
function createLight() {
    'use strict';
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(1, 1, 1);
    scene.add(light);
}

/* CREATE WATCH STRAP */
function loadWatchStrap(droneWatch) {
    const loader = new GLTFLoader();

    loader.load(
        'assets/custom_watch_strap_for_swatch.glb',

        function (gltf) {
            watchStrap = gltf.scene;

            watchStrap.position.set(0, -91.5, 0);
            watchStrap.rotation.set(0, 0, Math.PI);
            watchStrap.scale.set(4, 4, 4);

            droneWatch.add(watchStrap);

            const exporter = new GLTFExporter();

            exporter.parse(droneWatch,
                (result) => {
                const blob = new Blob(
                [JSON.stringify(result, null, 2)],
                { type: "text/plain" }
                )
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "droneWatch.gltf";
                link.click();
                URL.revokeObjectURL(link.href);
                },
                {
                binary: false
                }
            );
        },

        undefined,

        function (error) {
            console.error('Erro ao carregar pulseira:', error);
        }
    );
}


/* CREATE BALLOON*/

function addBalloonBody(obj, material) {
    const geometry = new THREE.SphereGeometry(20, 16, 16);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.y = 1.2;
    obj.add(mesh);

    const axes = new THREE.AxesHelper(30);
    mesh.add(axes);
    helpers.push(axes);
    
}

function addBalloonKnot(obj, material) {
    const geometry = new THREE.ConeGeometry(3, 6, 16);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = -27;

    obj.add(mesh);

}

function addBalloonString(obj, material) {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 30, 8);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.y = -45;

    obj.add(mesh);

    const axes = new THREE.AxesHelper(30);
    mesh.add(axes);
    helpers.push(axes);    

}

function createBalloon(x, y, z) {

    const balloon = new THREE.Object3D();

    const material = new THREE.MeshBasicMaterial({ color: 0xFF0000, wireframe: false });

    addBalloonBody(balloon, material);
    addBalloonKnot(balloon, material);
    addBalloonString(balloon, material);

    scene.add(balloon);

    balloon.position.x = x;
    balloon.position.y = y;
    balloon.position.z = z;

    activeBalloons.push(balloon);
}

/* CREATE DRONEWATCH */

function addBody(drone, material, bodyWidth, bodyHeight, topBodyHeight, bottomBodyHeight, bodyDepth, boddyBeamsbarThickness, borderWidth) {

    addTopBody(drone, material, bodyWidth, bodyHeight, topBodyHeight, bodyDepth)
    addBottomBody(drone, material, bodyWidth, bodyHeight, bottomBodyHeight, bodyDepth)
    addBodyBeams(drone, material, bodyWidth, bodyHeight, topBodyHeight, bottomBodyHeight, bodyDepth, boddyBeamsbarThickness, borderWidth)

}

function addTopBody(drone, material, bodyWidth, bodyHeight, topBodyHeight, bodyDepth) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(bodyWidth, topBodyHeight, bodyDepth);
    mesh.position.set(0, bodyHeight / 2 - (topBodyHeight / 2), 0);

    drone.add(mesh);

    const axes = new THREE.AxesHelper(20);
    mesh.add(axes);
    helpers.push(axes);

}

function addBottomBody(drone, material, bodyWidth, bodyHeight, bottomBodyHeight, bodyDepth) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(bodyWidth, bottomBodyHeight, bodyDepth);
    mesh.position.set(0, -(bodyHeight / 2) + bottomBodyHeight / 2, 0);

    drone.add(mesh);

    const axes = new THREE.AxesHelper(20);
    mesh.add(axes);
    helpers.push(axes);
    

}

function addBodyBeams(drone, material, bodyWidth, bodyHeight, topBodyHeight, bottomBodyHeight, bodyDepth, boddyBeamsbarThickness, borderWidth) {

    let offsetX = bodyWidth / 2 - borderWidth / 2
    let offsetZ = bodyDepth / 2 - borderWidth / 2

    const positions = [
        [offsetX, 0, -offsetZ], // Rigth Top
        [-offsetX, 0, -offsetZ], // Left Top
        [-offsetX, 0, offsetZ], // Left Bottom
        [offsetX, 0, offsetZ], // Right Bottom
    ];

    for (let i = 0; i < 4; i++) {

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry, material);

        mesh.scale.set(boddyBeamsbarThickness / 2, bodyHeight, boddyBeamsbarThickness / 2);
        mesh.position.set(positions[i][0], 0, positions[i][2]);

        drone.add(mesh);

        const axes = new THREE.AxesHelper(20);
        mesh.add(axes);
        helpers.push(axes);

    };

}

function addCamera(obj, bodyWidth, borderWidth, bodyHeight, camHeight, camWidth) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x1a1a2e }));

    mesh.scale.set(camWidth, camHeight, borderWidth);
    mesh.position.set(0, bodyHeight / 2 + camHeight / 2, -bodyWidth / 2 + borderWidth / 2);
    obj.add(mesh);

    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);

}

function addButton(obj, bodyWidth, borderWidth, bodyHeight, bHeight, bWidth) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xe0a020 }));

    mesh.scale.set(bWidth, bHeight, borderWidth);

    mesh.position.set(0, bodyHeight / 2 + bHeight / 2, bodyWidth / 2 - borderWidth / 2);

    obj.add(mesh);
  
    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);
   
}

function addDisplay(obj, bodyHeight, displayHeight, displayWidth) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));

    mesh.scale.set(displayWidth, displayHeight, displayWidth);

    mesh.position.set(0, bodyHeight / 2 + displayHeight / 2, 0);

    obj.add(mesh);

    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);
    
}

function addRotorSystem(drone, offsetX, offsetZ, armHeightStartCenter, size, barThickness, height, armLength, armThickness) {


    const positions = [
        [offsetX, armHeightStartCenter, -offsetZ], // Rigth Top
        [-offsetX, armHeightStartCenter + height, -offsetZ], // Left Top
        [-offsetX, armHeightStartCenter, offsetZ], // Left Bottom
        [offsetX, armHeightStartCenter + height, offsetZ], // Right Bottom
    ];

    const angles = [
        Math.PI / 4 + (Math.PI / 2) * 0, // Right Top
        Math.PI / 4 + (Math.PI / 2) * 1, // Left Top
        Math.PI / 4 + (Math.PI / 2) * 2, // Left Bottom
        Math.PI / 4 + (Math.PI / 2) * 3, // Right Bottom
    ];

    for (let i = 0; i < 4; i++) {

        const arm = new THREE.Object3D();
        
        arm.position.set(positions[i][0], positions[i][1], positions[i][2]);
        arm.rotation.y = angles[i];
        arm.userData.baseAngle = angles[i];

        drone.add(arm);
        recallArmObjects.push(arm);

        addSupport(arm, size, barThickness, height, armLength, armThickness);

    };
}

function addSupport(arm, size, barThickness, height, armLength, armThickness) {

    addArm(arm, armLength, height, armThickness);

    const rotor = new THREE.Object3D();
    rotor.position.set(armLength - (Math.hypot(barThickness, barThickness)), 0,);
    rotor.rotation.y = -(Math.PI / 4) - recallRotatorAngle;
    rotor.userData.baseAngle = -(Math.PI / 4);
    arm.add(rotor);
    recallRotorObjects.push(rotor);

    addRotor(rotor, size, barThickness, height)
}

function addRotor(rotor, size, barThickness, height) {

    const rotorCenter = new THREE.Object3D();
    rotorCenter.position.set(size / 2, 0, -size / 2);
    rotor.add(rotorCenter);

    addRotorFrame(rotorCenter, size, barThickness, height);

    const rotorBladesSpin = new THREE.Object3D();
    rotorCenter.add(rotorBladesSpin);
    rotorBladesSpinObjects.push(rotorBladesSpin);

    addRotorBolinha(rotorBladesSpin, size, barThickness, height);

    addRotorBlades(rotorBladesSpin, size, barThickness, height);
}

function addArm(arm, armLength, height, armThickness) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const barMaterial = new THREE.MeshBasicMaterial({ color: 0xd0d4dc, wireframe: false });
    const mesh = new THREE.Mesh(geometry, barMaterial);

    mesh.scale.set(armLength, height, armThickness);
    mesh.position.set(armLength / 2, 0, 0);

    arm.add(mesh);

    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);
   
}

function addRotorFrame(rotor, size, thick, height) {

    const half = size / 2;
    const offset = half - thick / 2;

    addFrameBar(rotor, -offset, 0, 0, thick, height, size); //left
    addFrameBar(rotor, offset, 0, 0, thick, height, size); //right
    addFrameBar(rotor, 0, 0, -offset, size, height, thick); //cima
    addFrameBar(rotor, 0, 0, offset, size, height, thick); //baixo

    addFrameBar(rotor, 0, 0, 0, thick, height * 0.5, size) 

}

function addFrameBar(rotor, x, y, z, sx, sy, sz) {

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const barMaterial = new THREE.MeshBasicMaterial({ color: 0xd0d4dc, wireframe: false });
    const mesh = new THREE.Mesh(geometry, barMaterial);

    mesh.scale.set(sx, sy, sz);
    mesh.position.set(x, y, z);

    rotor.add(mesh);

    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);
   
}

function addRotorBolinha(rotorBladesSpin, size, frameThickness, frameHeight) {

    const radius = frameThickness * 0.5;
    const height = frameHeight * 1.3;

    const geometry = new THREE.CylinderGeometry(radius, radius, height, 4);

    const bolinhaMaterial = new THREE.MeshBasicMaterial({ color: 0x39ff14 });

    const mesh = new THREE.Mesh(geometry, bolinhaMaterial);

    mesh.position.set(0, 2, 0);

    rotorBladesSpin.add(mesh);

    const axes = new THREE.AxesHelper(10);
    mesh.add(axes);
    helpers.push(axes);

}

function addRotorBlades(rotorBladesSpin, frameSize, frameThickness, frameHeight) {

    const bladeLength = frameSize * 0.8;
    const bladeThickness = frameThickness * 0.8;
    const bladeHeight = frameThickness * 0.5;

    const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });


    const bladeOne = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bladeMaterial);
    bladeOne.scale.set(bladeThickness, bladeHeight, bladeLength);
    bladeOne.position.set(0, frameHeight * 0.5, 0);
    rotorBladesSpin.add(bladeOne);

    const bladeTwo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bladeMaterial);
    bladeTwo.scale.set(bladeLength, bladeHeight, bladeThickness);

    bladeTwo.position.set(0, frameHeight * 0.5, 0);

    rotorBladesSpin.add(bladeTwo);

}

function createDroneWatch(x, y, z) {

    const droneWatch = new THREE.Object3D();

    const material = new THREE.MeshBasicMaterial({ color: 0x3F4458, wireframe: false });

    const bodyWidth = 120;
    const borderWidth = bodyWidth * 0.1;
    const topBodyHeight = 10;
    const midBodyHeight = 10;
    const bottomBodyHeight = 3;
    const bodyHeight = topBodyHeight + midBodyHeight + bottomBodyHeight;
    const boddyBeamsbarThickness = 10;
    const bodyDepth = 120;

    const camHeight = bodyHeight * 0.5;
    const camWidth = bodyWidth * 0.2;

    const bHeight = bodyHeight * 0.25;
    const bWidth = bodyWidth * 0.3;

    const displayHeight = bodyHeight * 0.01;
    const displayWidth = bodyWidth * 0.8;

    const rotorSize = 50;
    const barThickness = rotorSize * 0.1;
    const rotorHeight = midBodyHeight / 2;

    const armHeightStartCenter = -(bodyHeight / 2) + bottomBodyHeight + rotorHeight / 2;
    const armLength = 35;
    const armThickness = Math.hypot(barThickness, barThickness);

    const rotorOffsetX = bodyWidth / 2 - borderWidth / 2;
    const rotorOffsetZ = bodyDepth / 2 - borderWidth / 2;

    drone = new THREE.Object3D();
    droneWatch.add(drone);

    addBody(drone, material, bodyWidth, bodyHeight, topBodyHeight, bottomBodyHeight, bodyDepth, boddyBeamsbarThickness, borderWidth);
    addButton(drone, bodyWidth, borderWidth, bodyHeight, bHeight, bWidth);
    addCamera(drone, bodyWidth, borderWidth, bodyHeight, camHeight, camWidth);
    addDisplay(drone, bodyHeight, displayHeight, displayWidth);

    drone.add(movingPerspectiveCamera);
    movingPerspectiveCamera.position.set(0, bodyHeight / 2 + bodyHeight * 0.2 / 2, -bodyWidth / 2);
    movingPerspectiveCamera.lookAt(0, 0, -100);

    addRotorSystem(drone, rotorOffsetX, rotorOffsetZ, armHeightStartCenter, rotorSize, barThickness, rotorHeight, armLength, armThickness);

    recallArmProgress = 1;
    recallRotatorProgress = 1;

    const maxArmAngle = Math.PI * 3 / 4;
    const maxRotorAngle = Math.PI / 4;

    recallArmAngle = maxArmAngle;
    recallRotatorAngle = maxRotorAngle;

    recallArmObjects.forEach((arm) => {
        arm.rotation.y = arm.userData.baseAngle - recallArmAngle;
    });

    recallRotorObjects.forEach((rotor) => {
        rotor.rotation.y = rotor.userData.baseAngle - recallRotatorAngle;
    });

    // Hide helpers at start
    setHelpersVisible(false);

    scene.add(droneWatch);

    droneWatch.position.set(x, y, z);

    loadWatchStrap(droneWatch);

    

}

/* CHECK COLLISIONS */
function checkCollisions() {

    if (isInputLocked) return;

    activeBalloons.forEach(balloon => {
        if (balloon.userData.isDying) return;

        const balloonPos = new THREE.Vector3();
        balloon.getWorldPosition(balloonPos);

        rotorBladesSpinObjects.forEach(rotor => {
            const rotorPos = new THREE.Vector3();
            rotor.getWorldPosition(rotorPos);

            const distance = balloonPos.distanceTo(rotorPos);

            if (distance <= (BALLOON_RADIUS + ROTOR_RADIUS * settings.droneScale)) {
                balloon.userData.isDying = true;
                isInputLocked = true;
            }
        });
    });
}

/* HANDLE COLLISIONS */
function handleCollisions() {

    for (let i = activeBalloons.length - 1; i >= 0; i--) {
        const balloon = activeBalloons[i];

        if (balloon.userData.isDying) {
            balloon.scale.multiplyScalar(0.75);

            if (balloon.scale.x < 0.01) {
                scene.remove(balloon);
                activeBalloons.splice(i, 1);
                isInputLocked = false;
            }
        }
    }
}

/* UPDATE */
function update() {

    'use strict';

    const isFullyExtended = (recallArmProgress <= 0 && recallRotatorProgress <= 0);

    if (isFullyExtended) {
        rotorBladesSpinAngle += settings.rotorSpeed;
        rotorBladesSpinObjects.forEach(r => {
            r.rotation.y = rotorBladesSpinAngle;
        });
    }

    if (isFullyExtended && !isInputLocked) {
        let direction = new THREE.Vector3(0, 0, 0);

        // Move sideways
        if (keys[65]) { // A 
            direction.x -= 1;
        }
        if (keys[68]) { // D
            direction.x += 1;
        }

        // Move Up and Down
        if (keys[87]) { // W
            direction.y += 1;
        }
        if (keys[83]) { // S
            direction.y -= 1;
        }

        // Move foward and backwards
        if (keys[85]) { // U
            direction.z -= 1;
        }
        if (keys[74]) { // J
            direction.z += 1;
        }

        if (direction.length() > 0) {
            direction.normalize();
            direction.applyEuler(drone.rotation);

            const speed = settings.droneSpeed;

            droneX += direction.x * speed;
            droneY += direction.y * speed;
            droneZ += direction.z * speed;
        }

        // Rotate in Y axis
        if (keys[73]) { // I
            droneAngleY += Math.PI / 250;
        }
        if (keys[75]) { // K
            droneAngleY -= Math.PI / 250;
        }

        // Rotate in Z axis
        if (keys[79]) { // O
            droneAngleZ += Math.PI / 250;
        }
        if (keys[76]) { // L
            droneAngleZ -= Math.PI / 250;
        }

        droneAngleZ = THREE.MathUtils.clamp(
            droneAngleZ,
            -maxPitchZ,
            maxPitchZ
        );

        // Fly drone
        drone.position.set(droneX, droneY, droneZ);
        drone.rotation.y = droneAngleY;
        drone.rotation.z = droneAngleZ;
    }

    const recallSpeed = settings.rotorRecallSpeed;

    // Recall motors
    if (recallRotatorActive) {

        recallRotatorProgress += recallDirection * 0.04 * recallSpeed;

        recallRotatorProgress = THREE.MathUtils.clamp(recallRotatorProgress, 0, 1);

        const maxRotorAngle = Math.PI / 4;

        recallRotatorAngle = recallRotatorProgress * maxRotorAngle;

        // stop automatically at limits
        if (recallRotatorProgress === 0 || recallRotatorProgress === 1) {
            recallRotatorActive = false;
            if (recallDirection == 1) {
                recallArmActive = true;
            }
        }

        // Apply rotation to rotors
        recallRotorObjects.forEach((rotor) => {
            rotor.rotation.y = rotor.userData.baseAngle - recallRotatorAngle;
        });
    }

    // Recall arms
    if (recallArmActive) {

        recallArmProgress += recallDirection * 0.01 * recallSpeed;

        recallArmProgress = THREE.MathUtils.clamp(recallArmProgress, 0, 1);

        const maxArmAngle = Math.PI * 3 / 4;

        recallArmAngle = recallArmProgress * maxArmAngle;

        if (recallArmProgress === 0 || recallArmProgress === 1) {
            recallArmActive = false;
            if (recallDirection == -1) {
                recallRotatorActive = true;
            }
        }

        recallArmObjects.forEach((arm) => {
            arm.rotation.y = arm.userData.baseAngle - recallArmAngle;
        });
    }

    checkCollisions();
    handleCollisions();
}

function updateHUD() {
    for (let i = 1; i <= 6; i++) {
        const key = document.getElementById(`key-${i}`);

        if (!key) continue;

        if (currentCamIndex === i - 1) {
            key.classList.add("pressed");
        } else if (!keys[48 + i]) {
            key.classList.remove("pressed");
        }
    }

    const keyH = document.getElementById("key-H");
    const key7 = document.getElementById("key-7");
    const keyQ = document.getElementById("key-Q");

    if (helpersVisible) {
        keyH.classList.add("pressed");
    } else {
        keyH.classList.remove("pressed");
    }

    if (wireframeActive) {
        key7.classList.add("pressed");
    } else {
        key7.classList.remove("pressed");
    }

    if (recallDirection === 1) {
        keyQ.classList.add("pressed");
    } else {
        keyQ.classList.remove("pressed");
    }
}

/* DISPLAY */
function render() {
    'use strict';
    camera = cameras[currentCamIndex];
    renderer.render(scene, camera);
}

function setHelpersVisible(value) {
    settings.showHelpers = value;
    helpersVisible = value;

    helpers.forEach(helper => {
        helper.visible = value;
    });

    if (gui) {
        gui.controllersRecursive().forEach(controller => {
            controller.updateDisplay();
        });
    }
}

function onKeyDown(e) {
    'use strict';

    keys[e.keyCode] = true;
    setHUDKeyPressed(e.key, true);

    if (e.repeat) return;

    if (isInputLocked) return;

    switch (e.keyCode) {
        case 49: // 1
            currentCamIndex = 0;
            break;

        case 50: // 2
            currentCamIndex = 1;
            break;

        case 51: // 3
            currentCamIndex = 2;
            break;

        case 52: // 4
            currentCamIndex = 3;
            break;

        case 53: // 5
            currentCamIndex = 4;
            break;

        case 54: // 6
            currentCamIndex = 5;
            break;

        case 55: // 7
            wireframeActive = !wireframeActive;
            settings.wireframe = wireframeActive;
            scene.traverse((object) => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.wireframe = wireframeActive);
                    } else {
                        object.material.wireframe = wireframeActive;
                    }
                }
            });
            if (gui) {
                gui.controllersRecursive().forEach(controller => {
                    controller.updateDisplay();
                });
            }
            break;

        case 72: // H
            setHelpersVisible(!settings.showHelpers);
            break;

        case 81: // Q
            if (recallArmAngle <= 0) {
                recallDirection = 1;   // open
                recallRotatorActive = true;
            } else {
                recallDirection = -1;  // close
                recallArmActive = true;
            }
            break;


    }
}

function onKeyUp(e) {

    'use strict';
    keys[e.keyCode] = false;
    setHUDKeyPressed(e.key, false);
}

const keyMap = new Map();

function mapKey(keyDiv) {
    const key = keyDiv.innerText.toUpperCase();

    let keyDivs = keyMap.get(key);

    if (!keyDivs) {
        keyDivs = [];
        keyMap.set(key, keyDivs);
    }

    keyDivs.push(keyDiv);
}

function setHUDKeyPressed(key, pressed) {
    const keyDivs = keyMap.get(key.toUpperCase());

    if (!keyDivs) return;

    keyDivs.forEach((keyDiv) => {
        if (pressed) {
            keyDiv.classList.add("pressed");
        } else {
            keyDiv.classList.remove("pressed");
        }
    });
}


function updateWatchStrapScale(droneScale) {
    const StrapScale = 4 * droneScale;
    const StrapY = -91.5 * droneScale;

    watchStrap.scale.set(StrapScale, StrapScale, StrapScale);
    watchStrap.position.set(0, StrapY, 0);
}

//GUI 
function createGUI() {
    gui = new GUI({
        title: 'Painel de Controlo'
    });

    const visualFolder = gui.addFolder('Visualização');

    visualFolder.add(settings, 'wireframe')
        .name('Wireframe')
        .onChange(value => {
            wireframeActive = value;

            scene.traverse(object => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            material.wireframe = value;
                        });
                    } else {
                        object.material.wireframe = value;
                    }
                }
            });
        });

    visualFolder.add(settings, 'showHelpers')
        .name('Helpers')
        .onChange(value => {
            setHelpersVisible(value);
        });

    visualFolder.add(settings, 'showBallons')
        .name('Balões')
        .onChange(value => {
            activeBalloons.forEach(ballon => {
                ballon.visible = value;
            });
        });

    const droneFolder = gui.addFolder('DroneWatch');

    droneFolder.add(settings, 'droneSpeed', 0.5, 8, 0.1)
        .name('Velocidade Drone');

    droneFolder.add(settings, 'rotorSpeed', 0, 1, 0.01)
        .name('Velocidade Hélices');

    droneFolder.add(settings, 'rotorRecallSpeed', 0.5, 8, 0.1)
        .name('Velocidade Recolher');

    droneFolder.add(settings, 'droneScale', 0.5, 2, 0.1)
        .name('Escala Drone')
        .onChange(value => {
            if (drone) {
                drone.scale.set(value, value, value);
            }

            if (watchStrap) {
                updateWatchStrapScale(value);
            }
        });

    droneFolder.add(settings, 'maxPitchZDegrees', 0, 90, 1)
        .name('Liberdade eixo Z')
        .onChange(value => {
            maxPitchZ = THREE.MathUtils.degToRad(value);

            droneAngleZ = THREE.MathUtils.clamp(
                droneAngleZ,
                -maxPitchZ,
                maxPitchZ
            );

            if (drone) {
                drone.rotation.z = droneAngleZ;
            }
        });

    droneFolder.add(settings, 'resetDrone')
        .name('Reset Drone');

    visualFolder.open();
    droneFolder.open();

}

/* INITIALIZE ANIMATION CYCLE */
function init() {
    'use strict';
    renderer = new THREE.WebGLRenderer({
        antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    createScene();
    createCamera();
    createLight();

    for (let i = 0; i < 5; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() + 0.1) * 200;
        const z = (Math.random() - 0.5) * 400;

        createBalloon(x, y, z);
    }

    createDroneWatch(0, 0, 0);

    // FPS
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    // GUI
    createGUI();

    document.querySelectorAll(".key").forEach(mapKey);

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
}

/* ANIMATION CYCLE */
function animate() {
    'use strict';

    stats.begin();

    update();
    updateHUD();
    render();

    stats.end();

    requestAnimationFrame(animate);
}

/* RESIZE WINDOW CALLBACK */
function onResize() {
    'use strict';
    renderer.setSize(window.innerWidth, window.innerHeight);

    const aspect = window.innerWidth / window.innerHeight;
    const fSize = 500;

    cameras.forEach(cam => {
        if (cam.isPerspectiveCamera) {
            cam.aspect = aspect;
        } else if (cam.isOrthographicCamera) {
            cam.left = -fSize * aspect / 2;
            cam.right = fSize * aspect / 2;
            cam.top = fSize / 2;
            cam.bottom = -fSize / 2;
        }
        cam.updateProjectionMatrix();
    });
}

/* KEY DOWN CALLBACK */
/* KEY UP CALLBACK */

// Executar
init();
animate();
