import * as THREE from "three";
import { AnaglyphEffect } from "three/addons/effects/AnaglyphEffect.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let scene, camera, renderer, effect;
let clock;
let ambientLight, directionalLight;

let modelPointLights = [];
let modelSpotLights = [];

let directionalLightOn = true;
let pointLightsOn = true;
let spotLightsOn = true;

let models = [];
let currentModel = 0;
let tesseractModel;
let outer, inner;
let sOut, sIn;
let animalModel;
let artemisModel;

let anaglyph = false;
let currentMaterial = "lambert";

let materials = {};

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    'use strict';
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCamera() {
    'use strict';

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.set(0, 2, 7);
    camera.lookAt(scene.position);

}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////
function createLights() {
    'use strict';

    ambientLight = new THREE.AmbientLight(0xf2f2ff, 0.15);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(4, 6, 3);
    scene.add(directionalLight);
}

function createModelLights(model) {
    'use strict';

    const pointLight1 = new THREE.PointLight(0xffffff, 90, 25);
    pointLight1.position.set(3, 3, 3);
    const pointLight2 = new THREE.PointLight(0xffffff, 90, 25);
    pointLight2.position.set(-3, 3, 3);

    const spotLight1 = new THREE.SpotLight(0xffffff, 90, 30, Math.PI / 5, 0.4);
    spotLight1.position.set(2, 4, 4);
    spotLight1.target.position.set(0, 0, 0);
    const spotLight2 = new THREE.SpotLight(0xffffff, 90, 15, Math.PI / 5, 0.4);
    spotLight2.position.set(2, -4, 4);
    spotLight2.target.position.set(0, 0, 0);

    model.add(pointLight1);
    model.add(pointLight2);

    model.add(spotLight1);
    model.add(spotLight1.target);

    model.add(spotLight2);
    model.add(spotLight2.target);

    const isCurrent = (models[currentModel] === model);

    pointLight1.visible = pointLightsOn && isCurrent;
    pointLight2.visible = pointLightsOn && isCurrent;

    spotLight1.visible = spotLightsOn && isCurrent;
    spotLight2.visible = spotLightsOn && isCurrent;

    modelPointLights.push(pointLight1, pointLight2);
    modelSpotLights.push(spotLight1, spotLight2);
}

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createMaterials() {
    'use strict';

    materials.lambert = new THREE.MeshLambertMaterial({ color: 0xffffff });

    materials.phong = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xaaaaaa, shininess: 80 });

    materials.basic = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // For Tesseract

    const textureLoader = new THREE.TextureLoader();

    const concentricNormalMap = textureLoader.load(
        "textures/NormalMap.png"
    );

    materials.lambert_TesseractIn = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });
    materials.phong_TesseractIn = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xaaaaaa, shininess: 80, transparent: true, opacity: 0.25, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });
    materials.basic_TesseractIn = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });

    materials.lambert_TesseractOut = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });
    materials.phong_TesseractOut = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xaaaaaa, shininess: 80, transparent: true, opacity: 0.5, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });
    materials.basic_TesseractOut = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false, normalMap: concentricNormalMap, normalScale: new THREE.Vector2(1, 1) });

    currentMaterial = "lambert";
}

function createModels() {
    'use strict';

    createBunny();
    createRocket();
    createTesseract();
}

function createManualCubeGeometry() {
    const geometry = new THREE.BufferGeometry();

    const vertices = new Float32Array([
        -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1, // Frente
        -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1, -1, // Trás
        -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,// Cima
        -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, // Baixo
        1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,// Direita
        -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1 // Esquerda
    ]);

    const uvs = new Float32Array([
        0, 0, 1, 0, 1, 1, 0, 1, // Frente
        1, 0, 1, 1, 0, 1, 0, 0, // Trás
        0, 0, 1, 0, 1, 1, 0, 1, // Cima
        0, 1, 1, 1, 1, 0, 0, 0, // Baixo
        0, 0, 1, 0, 1, 1, 0, 1, // Direita
        0, 0, 1, 0, 1, 1, 0, 1  // Esquerda
    ]);

    const indices = [
        0, 1, 2, 2, 3, 0,    // Frente
        4, 5, 6, 6, 7, 4,    // Trás
        8, 9, 10, 10, 11, 8,  // Cima
        12, 13, 14, 14, 15, 12, // Baixo
        16, 17, 18, 18, 19, 16, // Direita
        20, 21, 22, 22, 23, 20  // Esquerda
    ];

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    geometry.computeVertexNormals();

    return geometry;
}

function createTesseract() {
    'use strict';

    const geometry = createManualCubeGeometry();

    sIn = 1;
    sOut = 1;

    // Outer cube
    outer = new THREE.Mesh(geometry, materials[currentMaterial + "_TesseractOut"]);
    outer.scale.set(sOut, sOut, sOut);

    // Inner cube
    inner = new THREE.Mesh(geometry, materials[currentMaterial + "_TesseractIn"]);
    inner.scale.set(sIn, sIn, sIn);

    outer.renderOrder = 1;
    inner.renderOrder = 2;

    tesseractModel = new THREE.Group();
    tesseractModel.name = "Tesseract";

    tesseractModel.add(outer);
    tesseractModel.add(inner);

    tesseractModel.position.set(0, 0, 0);
    tesseractModel.visible = currentModel === 0;

    scene.add(tesseractModel);
    models[0] = tesseractModel;

    createModelLights(tesseractModel);

    // Create edges between cubes
    const vertices = [];

    for (let x of [-1, 1]) {
        for (let y of [-1, 1]) {
            for (let z of [-1, 1]) {
                vertices.push([x, y, z]);
            }
        }
    }

    const positions = [];

    for (let i = 0; i < vertices.length; i++) {
        const [x, y, z] = vertices[i];

        positions.push(x * sOut, y * sOut, z * sOut, x * sIn, y * sIn, z * sIn);
    }

    const geometryLine = new THREE.BufferGeometry();
    geometryLine.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });

    const lines = new THREE.LineSegments(geometryLine, lineMaterial);
    lines.name = "tesseractLines";
    tesseractModel.add(lines);
}

function createBunny() {
    'use strict';

    const loader = new OBJLoader();

    loader.load(
        "models/bunny.obj",

        function (object) {
            animalModel = object;

            animalModel.name = "Animal";

            animalModel.traverse(function (child) {
                if (child.isMesh) {
                    child.material = materials[currentMaterial];
                }
            });

            animalModel.position.set(0, 0, 0);
            animalModel.scale.set(3, 3, 3);

            animalModel.visible = currentModel === 1;

            scene.add(animalModel);

            models[1] = animalModel;
            createModelLights(animalModel);
        },
    );
}

function createRocket() {
    'use strict';

    const loader = new GLTFLoader();

    loader.load(
        "models/rocket.glb",

        function (gltf) {
            const rocketMesh = gltf.scene;
            rocketMesh.position.set(0, -4, 0);
            rocketMesh.scale.set(0.04, 0.04, 0.04);

            rocketMesh.traverse(function (child) {
                if (child.isMesh) {
                    const prevMat = child.material;
                    if (currentMaterial === "basic") {
                        child.material = new THREE.MeshBasicMaterial({ map: prevMat.map });
                    } else if (currentMaterial === "lambert") {
                        child.material = new THREE.MeshLambertMaterial({ map: prevMat.map });
                    } else if (currentMaterial === "phong") {
                        child.material = new THREE.MeshPhongMaterial({
                            map: prevMat.map,
                            specular: 0xaaaaaa,
                            shininess: 80
                        });
                    }
                    child.material.needsUpdate = true;
                }
            });

            artemisModel = new THREE.Group();
            artemisModel.name = "Rocket";
            artemisModel.add(rocketMesh);

            artemisModel.visible = currentModel === 2;

            scene.add(artemisModel);

            models[2] = artemisModel;
            createModelLights(artemisModel);
        },
    );
}

function createObjects() {
    'use strict';

    createMaterials();
    createModels();
}

////////////////
/* CREATE HUD */
////////////////
function createHUD() {
    'use strict';

    document.getElementById("model1").addEventListener("click", () => showModel(0));
    document.getElementById("model2").addEventListener("click", () => showModel(1));
    document.getElementById("model3").addEventListener("click", () => showModel(2));

    document.getElementById("matLambert").addEventListener("click", () => setMaterial("lambert"));
    document.getElementById("matPhong").addEventListener("click", () => setMaterial("phong"));
    document.getElementById("noLigthing").addEventListener("click", () => setMaterial("basic"));

    document.getElementById("dirLight").addEventListener("click", toggleDirectionalLight);
    document.getElementById("pointLights").addEventListener("click", togglePointLights);
    document.getElementById("spotLights").addEventListener("click", toggleSpotLights);

    document.getElementById("anaglyph").addEventListener("click", toggleAnaglyph);

    setActiveModelButton(currentModel);
    setActiveMaterialButton(currentMaterial);

    document.getElementById("dirLight").classList.toggle("active", directionalLightOn);
    document.getElementById("pointLights").classList.toggle("active", pointLightsOn);
    document.getElementById("spotLights").classList.toggle("active", spotLightsOn);
}

function showModel(index) {
    'use strict';

    currentModel = index;

    models.forEach((model, i) => {
        if (model) {
            const isVisible = (i === currentModel);
            model.visible = isVisible;

            model.traverse(child => {
                if (child.isPointLight) {
                    child.visible = pointLightsOn && isVisible;
                }
                if (child.isSpotLight) {
                    child.visible = spotLightsOn && isVisible;
                }
            });
        }
    });

    setActiveModelButton(index);
}

function setMaterial(type) {
    'use strict';

    currentMaterial = type;

    models.forEach(model => {
        if (!model) return;

        model.traverse(child => {
            if (!child.isMesh) return;

            if (model.name === "Rocket") {
                const prevMat = child.material;
                if (type === "basic") {
                    child.material = new THREE.MeshBasicMaterial({
                        map: prevMat.map
                    });
                } else if (type === "lambert") {
                    child.material = new THREE.MeshLambertMaterial({
                        map: prevMat.map
                    });
                } else if (type === "phong") {
                    child.material = new THREE.MeshPhongMaterial({
                        map: prevMat.map,
                        specular: 0xaaaaaa,
                        shininess: 80
                    });
                }
            }
            else if (model.name === "Tesseract") {
                // special case
                if (child === model.children[0]) {
                    child.material = materials[type + "_TesseractOut"];
                } else {
                    child.material = materials[type + "_TesseractIn"];
                }
            } else {
                child.material = materials[type];
            }

            child.material.needsUpdate = true;
        });
    });

    setActiveMaterialButton(type);
}

function toggleAnaglyph() {
    'use strict';
    anaglyph = !anaglyph;
    document.getElementById("anaglyph").classList.toggle("active", anaglyph);
}

function toggleDirectionalLight() {
    'use strict';
    directionalLightOn = !directionalLightOn;
    directionalLight.visible = directionalLightOn;
    document.getElementById("dirLight").classList.toggle("active", directionalLightOn);
}

function togglePointLights() {
    'use strict';
    pointLightsOn = !pointLightsOn;

    if (models[currentModel]) {
        models[currentModel].traverse(child => {
            if (child.isPointLight) {
                child.visible = pointLightsOn;
            }
        });
    }

    document.getElementById("pointLights").classList.toggle("active", pointLightsOn);
}

function toggleSpotLights() {
    'use strict';
    spotLightsOn = !spotLightsOn;

    if (models[currentModel]) {
        models[currentModel].traverse(child => {
            if (child.isSpotLight) {
                child.visible = spotLightsOn;
            }
        });
    }

    document.getElementById("spotLights").classList.toggle("active", spotLightsOn);
}

function setActiveModelButton(index) {
    'use strict';
    document.getElementById("model1").classList.toggle("active", index === 0);
    document.getElementById("model2").classList.toggle("active", index === 1);
    document.getElementById("model3").classList.toggle("active", index === 2);
}

function setActiveMaterialButton(type) {
    'use strict';
    document.getElementById("matLambert").classList.toggle("active", type === "lambert");
    document.getElementById("matPhong").classList.toggle("active", type === "phong");
    document.getElementById("noLigthing").classList.toggle("active", type === "basic");
}


////////////
/* UPDATE */
////////////
function update() {
    'use strict';

    let tesseractRorationSpeed = 0.5;

    let TesseractSizeDif = 0.4;
    let TesseractScalingSpeed = 0.7;

    let animalRorationSpeed = 0.5;

    if (!models[currentModel]) return;

    const delta = clock.getDelta();

    const t = clock.getElapsedTime();

    if (models[currentModel].name === "Tesseract") {
        models[currentModel].rotation.y += delta * tesseractRorationSpeed;
        models[currentModel].rotation.z += delta * tesseractRorationSpeed;

        sIn = 1 + TesseractSizeDif * Math.sin(t * TesseractScalingSpeed);
        inner.scale.set(sIn, sIn, sIn);
        sOut = 1 + TesseractSizeDif * -Math.sin(t * TesseractScalingSpeed);
        outer.scale.set(sOut, sOut, sOut);

        updateTesseractVertices();
    }

    if (models[currentModel].name === "Animal") {
        models[currentModel].rotation.y += delta * animalRorationSpeed;
    }

}

function updateTesseractVertices() {

    const vertices = [];

    for (let x of [-1, 1]) {
        for (let y of [-1, 1]) {
            for (let z of [-1, 1]) {
                vertices.push([x, y, z]);
            }
        }
    }

    const lines = tesseractModel.getObjectByName("tesseractLines");

    const pos = lines.geometry.attributes.position.array;

    let k = 0;

    for (let i = 0; i < vertices.length; i++) {

        const [x, y, z] = vertices[i];

        // outer vertex
        pos[k++] = x * sOut;
        pos[k++] = y * sOut;
        pos[k++] = z * sOut;

        // inner vertex
        pos[k++] = x * sIn;
        pos[k++] = y * sIn;
        pos[k++] = z * sIn;
    }

    lines.geometry.attributes.position.needsUpdate = true;
}

/////////////
/* DISPLAY */
/////////////
function render() {
    'use strict';

    if (anaglyph) {
        effect.render(scene, camera);
    } else {
        renderer.render(scene, camera);
    }
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
    'use strict';

    clock = new THREE.Clock();

    createScene();
    createCamera();

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    document.body.appendChild(renderer.domElement);

    effect = new AnaglyphEffect(renderer);
    effect.setSize(window.innerWidth, window.innerHeight);

    createLights();
    createObjects();
    createHUD();

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
    'use strict';

    requestAnimationFrame(animate);

    update();
    render();
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
    'use strict';

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    effect.setSize(window.innerWidth, window.innerHeight);
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
    'use strict';
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
    'use strict';
}

init();
animate();