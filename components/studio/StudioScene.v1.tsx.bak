"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  TransformControls,
  Edges,
  Html,
} from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
import { MM, DEFAULT_LAYER_COLORS, type CityControls } from "../../lib/studio";
import type { ModelFile } from "../../app/studio/actions";

// Typeface JSON URLs for Three.js FontLoader (basic ASCII coverage)
const FONT_URLS: Record<string, string> = {
  "sans-serif":     "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  "sansSerif":      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  "bold":           "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
  "sansSerifBold":  "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
  "italic":         "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  "boldItalic":     "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json",
  "scriptBold":     "https://threejs.org/examples/fonts/optimer_bold.typeface.json",
  "doubleStruck":   "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
  "monospace":      "https://threejs.org/examples/fonts/droid/droid_sans_mono_regular.typeface.json",
  "serif":          "https://threejs.org/examples/fonts/droid/droid_serif_regular.typeface.json",
  "serifBold":      "https://threejs.org/examples/fonts/droid/droid_serif_bold.typeface.json",
  "display":        "https://threejs.org/examples/fonts/optimer_bold.typeface.json",
};

const fontCache = new Map<string, Font>();
const fontLoader = new FontLoader();

function loadFontPromise(fontKey: string): Promise<Font> {
  const url = FONT_URLS[fontKey] || FONT_URLS["sans-serif"];
  if (fontCache.has(url)) {
    return Promise.resolve(fontCache.get(url)!);
  }
  return new Promise((resolve, reject) => {
    fontLoader.load(
      url,
      (loadedFont) => {
        fontCache.set(url, loadedFont);
        resolve(loadedFont);
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/**
 * Apply a visual style transformation to text using Unicode lookalikes.
 * Falls back to original text if the transform fails or the font key
 * doesn't have a corresponding Unicode variant.
 */
function applyFontStyle(text: string, fontKey: string): string {
  // Only apply unicode transform for styles that visually benefit from it
  // and whose characters are partially supported by typeface fonts.
  // For safety we keep it as ASCII — the 3D typeface fonts only support ASCII.
  // This function is a hook for future Unicode-capable font rendering.
  return text;
}

export type GizmoMode = "translate" | "rotate" | "scale";

function Bed({ w, d, light }: { w: number; d: number; light: boolean }) {
  // Grid every 20 mm, plus a brighter outer border.
  const { grid, border } = useMemo(() => {
    const hw = (w * MM) / 2;
    const hd = (d * MM) / 2;
    const step = 20 * MM;

    const gridPts: number[] = [];
    for (let x = -hw; x <= hw + 1e-6; x += step)
      gridPts.push(x, 0, -hd, x, 0, hd);
    for (let z = -hd; z <= hd + 1e-6; z += step)
      gridPts.push(-hw, 0, z, hw, 0, z);
    const grid = new THREE.BufferGeometry();
    grid.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));

    const borderPts = [
      -hw, 0, -hd, hw, 0, -hd,
      hw, 0, -hd, hw, 0, hd,
      hw, 0, hd, -hw, 0, hd,
      -hw, 0, hd, -hw, 0, -hd,
    ];
    const border = new THREE.BufferGeometry();
    border.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(borderPts, 3)
    );

    return { grid, border };
  }, [w, d]);

  const plate = light ? "#d6cdec" : "#1a1340";
  const lineColor = light ? "#2a1f55" : "#e9e1ff";

  return (
    <group>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[w * MM + 0.24, 0.12, d * MM + 0.24]} />
        <meshStandardMaterial color={plate} roughness={0.85} metalness={light ? 0.05 : 0.15} />
      </mesh>
      <lineSegments geometry={grid} position={[0, 0.003, 0]}>
        <lineBasicMaterial color={lineColor} transparent opacity={light ? 0.16 : 0.1} />
      </lineSegments>
      <lineSegments geometry={border} position={[0, 0.005, 0]}>
        <lineBasicMaterial color={lineColor} transparent opacity={light ? 0.4 : 0.3} />
      </lineSegments>
    </group>
  );
}

/**
 * Owns BOTH the transformable group and its TransformControls, so they mount
 * and unmount in the same commit. The gizmo can never outlive (or attach to)
 * an object that has left the scene graph — which is what caused
 * "TransformControls: The attached 3D object must be a part of the scene graph".
 */
function TransformTarget({
  mode,
  position,
  onTarget,
  onTransform,
  children,
}: {
  mode: GizmoMode;
  position: [number, number, number];
  onTarget: (o: THREE.Object3D | null) => void;
  onTransform: (o: THREE.Object3D) => void;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const [obj, setObj] = useState<THREE.Group | null>(null);

  useEffect(() => {
    const g = group.current;
    setObj(g);
    onTarget(g);
    return () => {
      setObj(null);
      onTarget(null);
    };
  }, [onTarget]);

  return (
    <>
      <group ref={group} position={position}>
        {children}
      </group>
      {obj && (
        <TransformControls
          object={obj}
          mode={mode}
          size={0.85}
          onObjectChange={() => onTransform(obj)}
        />
      )}
    </>
  );
}

const TARGET_SIZE = 4;

// A city tile assembled from multiple GLB layers (terrain, roads, buildings,
// trees, …) that share one origin. useGLTF suspends until EVERY layer has
// downloaded, so the tile appears fully assembled — never piece by piece.
type Axis = "x" | "y" | "z";
const AXES: Axis[] = ["x", "y", "z"];

function getLocalBoundingBox(node: THREE.Object3D, container: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  node.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
      }
      if (mesh.geometry.boundingBox) {
        const b = mesh.geometry.boundingBox.clone();
        const localMatrix = new THREE.Matrix4().identity();
        let curr: THREE.Object3D | null = mesh;
        while (curr && curr !== container) {
          localMatrix.premultiply(curr.matrix);
          curr = curr.parent;
        }
        b.applyMatrix4(localMatrix);
        box.union(b);
      }
    }
  });
  return box;
}

function isStlFile(f: ModelFile): boolean {
  if (f.ext && f.ext.toLowerCase() === "stl") return true;
  const lowerName = (f.name || "").toLowerCase();
  const lowerUrl = (f.url || "").toLowerCase();
  return lowerName.endsWith(".stl") || lowerUrl.includes(".stl");
}

function CityAssembly({
  files,
  mode,
  controls,
  country = "United States",
  buildingName = "Building",
  onTarget,
  onTransform,
  onUpdateBaseTextPos,
}: {
  files: ModelFile[];
  mode: GizmoMode;
  controls: CityControls;
  country?: string;
  buildingName?: string;
  onTarget: (o: THREE.Object3D | null) => void;
  onTransform: (o: THREE.Object3D) => void;
  onUpdateBaseTextPos?: (x: number, z: number) => void;
}) {
  const glbFiles = useMemo(() => files.filter((f) => !isStlFile(f)), [files]);
  const stlFiles = useMemo(() => files.filter((f) => isStlFile(f)), [files]);

  const glbUrls = useMemo(() => glbFiles.map((f) => f.url), [glbFiles]);
  const stlUrls = useMemo(() => stlFiles.map((f) => f.url), [stlFiles]);

  const gltfs = useLoader(GLTFLoader, glbUrls, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });
  const stls = useLoader(STLLoader, stlUrls);

  const {
    object,
    scale,
    center,
    halfHeight,
    layerInfo,
    upAxis,
    horizAxes,
    rawModelSize,
    unit1cmInObj,
    terrainBottomAtRest,
    terrainHeightAtRest,
    boxMin,
    boxMax,
  } = useMemo(() => {
    const object = new THREE.Group();

    // Track layer groups
    const layerGroups = new Map<string, THREE.Group>();
    const getOrCreateLayerGroup = (layerName: string) => {
      let g = layerGroups.get(layerName);
      if (!g) {
        g = new THREE.Group();
        g.name = layerName;
        layerGroups.set(layerName, g);
        object.add(g);
      }
      return g;
    };

    // Process GLB layers
    glbFiles.forEach((file, i) => {
      const gltfObj = Array.isArray(gltfs) ? gltfs[i] : gltfs;
      if (gltfObj && gltfObj.scene) {
        const layer = gltfObj.scene.clone(true);
        const layerName = file.layer || file.name;
        layer.name = file.partKey || file.name;
        layer.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.castShadow = true;
            m.receiveShadow = true;
            m.userData.layerName = layerName;
            m.userData.partKey = file.partKey || file.name;
            m.userData.partName = file.partName || file.name;
            m.userData.isSubPart = !!file.isSubPart;
            m.userData.colorHint = file.colorHint;

            // Preview GLBs were converted from Z-up STL files.
            // Apply the same corrections as raw STLs: rotate geometry
            // -90° around X (Z-up → Y-up) and reset to a neutral material
            // so the layer colour system works identically for paid users.
            if (file.isPreview) {
              if (m.geometry && m.geometry.attributes.position) {
                m.geometry = m.geometry.clone();
                m.geometry.rotateX(-Math.PI / 2);
                m.geometry.computeVertexNormals();
                m.geometry.computeBoundingBox();
              }
              m.material = new THREE.MeshStandardMaterial({
                color: "#e9e6df",
                roughness: 0.6,
                metalness: 0.05,
              });
            }

            if (m.geometry && m.geometry.attributes.position) {
              m.userData.origPosition = m.geometry.attributes.position.array.slice();
            }
          }
        });
        const parentGroup = getOrCreateLayerGroup(layerName);
        parentGroup.add(layer);
      }
    });

    // Process STL layers
    stlFiles.forEach((file, i) => {
      const geomObj = Array.isArray(stls) ? stls[i] : stls;
      if (geomObj) {
        const g = (geomObj as THREE.BufferGeometry).clone();
        
        // Blender uses Z as up and Y as forward. 
        // Three.js uses Y as up and -Z as forward.
        // Rotate -90 degrees around X to map Blender's coordinates to Three.js
        g.rotateX(-Math.PI / 2);
        
        g.computeVertexNormals();
        g.computeBoundingBox();

        const mat = new THREE.MeshStandardMaterial({
          color: "#e9e6df",
          roughness: 0.6,
          metalness: 0.05,
        });
        const mesh = new THREE.Mesh(g, mat);
        const layerName = file.layer || file.name;
        mesh.name = file.partKey || file.name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.layerName = layerName;
        mesh.userData.partKey = file.partKey || file.name;
        mesh.userData.partName = file.partName || file.name;
        mesh.userData.isSubPart = !!file.isSubPart;
        mesh.userData.colorHint = file.colorHint;

        if (g.attributes.position) {
          mesh.userData.origPosition = g.attributes.position.array.slice();
        }

        const parentGroup = getOrCreateLayerGroup(layerName);
        parentGroup.add(mesh);
      }
    });

    // Which axis is "up"? Flat layers (roads/terrain/grass) are thinnest
    // along it — robust whether the exports are Y-up or Z-up.
    let upAxis: Axis = "y";
    const flat = ["roads", "terrain", "grass", "water"]
      .map((n) => object.getObjectByName(n))
      .find(Boolean);
    if (flat) {
      const s = new THREE.Vector3();
      new THREE.Box3().setFromObject(flat).getSize(s);
      upAxis = s.x < s.y ? (s.x < s.z ? "x" : "z") : s.y < s.z ? "y" : "z";
    }

    const horizAxes = AXES.filter((a) => a !== upAxis) as [Axis, Axis];

    // Per-layer anchors (at rest): base along up-axis, centre elsewhere.
    const layerInfo = new Map<
      string,
      { min: THREE.Vector3; max: THREE.Vector3; center: THREE.Vector3 }
    >();
    object.children.forEach((layer) => {
      const b = new THREE.Box3().setFromObject(layer);
      const c = new THREE.Vector3();
      b.getCenter(c);
      layerInfo.set(layer.name, {
        min: b.min.clone(),
        max: b.max.clone(),
        center: c,
      });
    });

    // Compute bounding box ONLY for city model layers (excluding revit and boolean_cube)
    const box = new THREE.Box3();
    object.children.forEach((layer) => {
      if (layer.name !== "revit" && !layer.name.startsWith("boolean_cube")) {
        box.expandByObject(layer);
      }
    });
    if (box.isEmpty()) {
      box.setFromObject(object);
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const boxMin = box.min.clone();
    const boxMax = box.max.clone();

    const terrainInfo = layerInfo.get("terrain");
    const terrainBottomAtRest = terrainInfo
      ? terrainInfo.min[upAxis]
      : box.min[upAxis];
    const terrainHeightAtRest = terrainInfo
      ? terrainInfo.max[upAxis] - terrainInfo.min[upAxis]
      : 0;

    const scale = TARGET_SIZE / (Math.max(size.x, size.y, size.z) || 1);

    // Create dynamic Base frame mesh underneath the terrain
    // 1 Three.js world unit = 50 mm = 5 cm (MM = 1 / 50).
    // 1 cm = 10 mm = 10 * MM world units.
    // In object space, 1 cm is (10 * MM) / scale.
    // The user can set thickness up to 5cm, and margin on each side up to 10cm.
    const unit1cmInObj = (10 * MM) / scale;

    const baseGeom = new THREE.BoxGeometry(1, 1, 1);
    const baseMat = new THREE.MeshStandardMaterial({
      color: "#e9e6df",
      roughness: 0.65,
      metalness: 0.05,
    });
    const revitMesh = new THREE.Mesh(baseGeom, baseMat);
    revitMesh.name = "revit";
    revitMesh.castShadow = true;
    revitMesh.receiveShadow = true;
    revitMesh.visible = false;
    object.add(revitMesh);

    // Dynamic 3D text mesh on the base
    const baseTextGroup = new THREE.Group();
    baseTextGroup.name = "base_text_group";
    object.add(baseTextGroup);

    return {
      object,
      scale,
      center,
      halfHeight: (size.y * scale) / 2,
      layerInfo,
      upAxis,
      horizAxes,
      rawModelSize: {
        width: size[horizAxes[0]] || 1,
        depth: size[horizAxes[1]] || 1,
        height: size[upAxis] || 1,
      },
      unit1cmInObj,
      terrainBottomAtRest,
      terrainHeightAtRest,
      boxMin,
      boxMax,
    };
  }, [glbFiles, stlFiles, gltfs, stls]);

  // Compute dynamic Y bounds so the entire model assembly rests above the checkerboard bed plate.
  const { lowestY, totalHeight } = useMemo(() => {
    const sTerrain = controls.terrain / 100;
    const terrainInfo = layerInfo.get("terrain");
    const totalH = terrainInfo ? terrainInfo.max[upAxis] - terrainInfo.min[upAxis] : 0;
    const baseHeight = totalH * 0.35;
    const currentTerrainBottom = terrainBottomAtRest - (sTerrain - 1) * baseHeight;

    const effectiveBottom = currentTerrainBottom;

    const REVIT_OVERLAP = 0.015;
    // controls.revitHeight is in cm (e.g. 0.5 to 5.0 cm)
    const h = (controls.revitHeight || 1) * unit1cmInObj;
    const revitBottom = effectiveBottom + REVIT_OVERLAP - h;
    const lowestPoint = controls.enableRevit
      ? Math.min(effectiveBottom, revitBottom)
      : effectiveBottom;
    const lowestY = Math.min(boxMin[upAxis], lowestPoint);
    const totalHeight = boxMax[upAxis] - lowestY;
    return { lowestY, totalHeight };
  }, [
    controls.enableRevit,
    controls.revitHeight,
    controls.terrain,
    terrainBottomAtRest,
    unit1cmInObj,
    boxMin,
    boxMax,
    upAxis,
    layerInfo,
  ]);


  // Apply the Manipulate City controls, non-destructively.
  // When the revit frame is enabled, we also run a CSG boolean subtraction:
  // every mesh whose name starts with "boolean_cube" is carved out of the
  // revit geometry so the frame disappears in those footprints.
  useEffect(() => {
    const sTerrain = controls.terrain / 100;

    // Non-terrain components stay right at rest positions on the terrain surface.
    const COMPONENT_INSERTION = 0;
    const apply = (name: string, vert: number, all: number) => {
      const layer = object.getObjectByName(name);
      const info = layerInfo.get(name);
      if (!layer || !info || name === "terrain" || name === "water") return;
      AXES.forEach((a) => {
        const s = (a === upAxis ? vert : 1) * all;
        const anchor = a === upAxis ? info.min[a] : info.center[a];
        layer.scale[a] = s;
        let pos = anchor * (1 - s);
        if (a === upAxis) {
          pos -= COMPONENT_INSERTION;
        }
        layer.position[a] = pos;
      });
    };

    apply("small-building", controls.small / 100, 1);
    // Uniform scale first, then extra height on top of it — so a locked-in
    // uniform size can still be stretched vertically.
    apply("main-building", controls.largeHeight / 100, controls.large / 100);
    apply("roads", controls.roads / 100, 1);
    apply("trees", controls.trees / 100, 1);
    apply("grass", 1, 1);

    // Deform terrain base block from bottom up — top surface topography (t=1) stays fixed (0 delta).
    const terrainLayer = object.getObjectByName("terrain");
    const terrainInfo = layerInfo.get("terrain");
    let currentTerrainBottom = terrainBottomAtRest;
    let terrainOffset = 0;
    if (terrainLayer && terrainInfo) {
      const minY = terrainInfo.min[upAxis];
      const maxY = terrainInfo.max[upAxis];
      const totalH = maxY - minY;
      const topThreshold = minY + 0.35 * totalH;
      const baseHeight = topThreshold - minY;
      terrainOffset = (sTerrain - 1) * baseHeight;
      currentTerrainBottom = minY - terrainOffset;

      terrainLayer.position.set(0, 0, 0);
      terrainLayer.scale.set(1, 1, 1);

      terrainLayer.traverse((child) => {
        const m = child as THREE.Mesh;
        if (m.isMesh && m.geometry && m.userData.origPosition) {
          const orig = m.userData.origPosition as Float32Array;
          const posAttr = m.geometry.attributes.position;
          const arr = posAttr.array as Float32Array;

          m.updateMatrix();
          const localMat = m.matrix;
          const invMat = localMat.clone().invert();
          const v = new THREE.Vector3();

          for (let i = 0; i < orig.length; i += 3) {
            v.set(orig[i], orig[i + 1], orig[i + 2]);
            v.applyMatrix4(localMat);

            const yLocal = v[upAxis];
            const t = THREE.MathUtils.clamp((yLocal - minY) / (topThreshold - minY), 0, 1);
            // Bottom vertices (t=0) get the full terrain extension.
            // Top vertices (t=1) stay fixed — no delta.
            const delta = (1 - t) * terrainOffset;
            v[upAxis] = yLocal - delta;

            v.applyMatrix4(invMat);
            arr[i] = v.x;
            arr[i + 1] = v.y;
            arr[i + 2] = v.z;
          }
          posAttr.needsUpdate = true;
          m.geometry.computeVertexNormals();
        }
      });
    }

    // Water layer: bottom-anchored; height controlled by controls.water slider,
    // and follows the bottom of the terrain downwards when terrain height increases
    // without increasing the water's vertical size.
    const waterLayer = object.getObjectByName("water");
    const waterInfo = layerInfo.get("water");
    if (waterLayer && waterInfo) {
      const sWater = controls.water / 100;
      AXES.forEach((a) => {
        const s = a === upAxis ? sWater : 1;
        const anchor = a === upAxis ? waterInfo.min[a] : waterInfo.center[a];
        waterLayer.scale[a] = s;
        let pos = anchor * (1 - s);
        if (a === upAxis) {
          pos -= terrainOffset;
        }
        waterLayer.position[a] = pos;
      });
    }



    // Hide boolean_cube layer (subtraction volume only)
    object.children.forEach((layer) => {
      if (layer.name.startsWith("boolean_cube")) {
        layer.visible = false;
      }
    });
    object.traverse((o) => {
      if (o.name.startsWith("boolean_cube")) {
        o.visible = false;
      }
    });

    // Apply Base frame layer controls — inserted below currentTerrainBottom.
    const revitLayer = object.getObjectByName("revit") as THREE.Mesh | undefined;
    const baseTextGroup = object.getObjectByName("base_text_group") as THREE.Group | undefined;

    // Clear previous base text geometry
    if (baseTextGroup) {
      while (baseTextGroup.children.length > 0) {
        const child = baseTextGroup.children[0] as THREE.Mesh;
        if (child.geometry) child.geometry.dispose();
        baseTextGroup.remove(child);
      }
      baseTextGroup.visible = false;
    }

    if (revitLayer) {
      revitLayer.visible = !!controls.enableRevit;
      if (controls.enableRevit) {
        // controls.revitHeight is in cm (e.g. 0.5 to 5.0 cm)
        const h = (controls.revitHeight || 1) * unit1cmInObj;

        // Extra width and depth on EACH side (e.g. 0 to 10 cm on each side -> 2 * margin in total)
        const extraMarginW = controls.revitUniformScale
          ? (controls.revitUniform ?? 10)
          : (controls.revitWidth ?? 10);
        const extraMarginD = controls.revitUniformScale
          ? (controls.revitUniform ?? 10)
          : (controls.revitBreadth ?? 10);

        const w = rawModelSize.width + 2 * extraMarginW * unit1cmInObj;
        const d = rawModelSize.depth + 2 * extraMarginD * unit1cmInObj;

        object.updateMatrixWorld(true);

        const REVIT_OVERLAP = 0.015;
        const rx = center[horizAxes[0]];
        const ry = currentTerrainBottom + REVIT_OVERLAP - h / 2;
        const rz = center[horizAxes[1]];

        // Store base dimensions for pointer dragging
        object.userData.baseTextDragInfo = {
          rx,
          ry,
          rz,
          halfW: w / 2,
          halfD: d / 2,
          halfH: h / 2,
        };

        // When water is enabled, boolean_cube masking is skipped — revit fills the full footprint.
        // When water is off, boolean_cube volumes carve openings into the revit slab as usual.
        const localBoolMeshes: THREE.Mesh[] = [];
        if (!controls.enableWater) {
          object.children.forEach((layer) => {
            if (layer.name.startsWith("boolean_cube")) {
              layer.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (mesh.isMesh && mesh.geometry) {
                  const localMatrix = new THREE.Matrix4().identity();
                  let curr: THREE.Object3D | null = mesh;
                  while (curr && curr !== object) {
                    localMatrix.premultiply(curr.matrix);
                    curr = curr.parent;
                  }
                  const cloneGeom = mesh.geometry.clone();
                  cloneGeom.applyMatrix4(localMatrix);
                  const localMesh = new THREE.Mesh(
                    cloneGeom,
                    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
                  );
                  localMesh.matrixWorld.identity();
                  localBoolMeshes.push(localMesh);
                }
              });
            }
          });
        }

        // Set up Raycaster along upAxis
        const raycaster = new THREE.Raycaster();
        const rayDir = new THREE.Vector3();
        rayDir[upAxis] = -1;

        const rayHeight = boxMax[upAxis] + 100;
        const rayOrigin = new THREE.Vector3();

        // Build merged base geometry using 2D grid raycasting + greedy box merging.
        const GRID_X = 60;
        const GRID_Z = 60;
        const cellW = w / GRID_X;
        const cellD = d / GRID_Z;

        const mask: boolean[][] = Array.from({ length: GRID_X }, () => Array(GRID_Z).fill(false));

        for (let ix = 0; ix < GRID_X; ix++) {
          for (let iz = 0; iz < GRID_Z; iz++) {
            const cx = rx - w / 2 + (ix + 0.5) * cellW;
            const cz = rz - d / 2 + (iz + 0.5) * cellD;

            let isMasked = false;
            if (localBoolMeshes.length > 0) {
              rayOrigin[upAxis] = rayHeight;
              rayOrigin[horizAxes[0]] = cx;
              rayOrigin[horizAxes[1]] = cz;

              raycaster.set(rayOrigin, rayDir);
              const hits = raycaster.intersectObjects(localBoolMeshes, false);
              if (hits.length > 0) {
                isMasked = true;
              }
            }
            mask[ix][iz] = !isMasked;
          }
        }

        const visited: boolean[][] = Array.from({ length: GRID_X }, () => Array(GRID_Z).fill(false));
        const mergedGeoms: THREE.BufferGeometry[] = [];

        for (let ix = 0; ix < GRID_X; ix++) {
          for (let iz = 0; iz < GRID_Z; iz++) {
            if (mask[ix][iz] && !visited[ix][iz]) {
              let runW = 1;
              while (ix + runW < GRID_X && mask[ix + runW][iz] && !visited[ix + runW][iz]) {
                runW++;
              }

              let runD = 1;
              let canExpandZ = true;
              while (iz + runD < GRID_Z && canExpandZ) {
                for (let k = 0; k < runW; k++) {
                  if (!mask[ix + k][iz + runD] || visited[ix + k][iz + runD]) {
                    canExpandZ = false;
                    break;
                  }
                }
                if (canExpandZ) runD++;
              }

              for (let kx = 0; kx < runW; kx++) {
                for (let kz = 0; kz < runD; kz++) {
                  visited[ix + kx][iz + kz] = true;
                }
              }

              const boxW = runW * cellW;
              const boxD = runD * cellD;
              const boxCx = rx - w / 2 + (ix + runW / 2) * cellW;
              const boxCz = rz - d / 2 + (iz + runD / 2) * cellD;

              const geom = new THREE.BoxGeometry(1, 1, 1);
              const s = new THREE.Vector3();
              s[upAxis] = h;
              s[horizAxes[0]] = boxW;
              s[horizAxes[1]] = boxD;
              geom.scale(s.x, s.y, s.z);

              const p = new THREE.Vector3();
              p[upAxis] = ry;
              p[horizAxes[0]] = boxCx;
              p[horizAxes[1]] = boxCz;
              geom.translate(p.x, p.y, p.z);

              mergedGeoms.push(geom);
            }
          }
        }

        // Merge all cell geometries into one base mesh geometry
        if (mergedGeoms.length > 0) {
          const merged = mergeGeometries(mergedGeoms);
          if (merged) {
            merged.computeVertexNormals();
            if (revitLayer.geometry) revitLayer.geometry.dispose();
            revitLayer.geometry = merged;
          }
          mergedGeoms.forEach((g) => g.dispose());
        } else {
          if (revitLayer.geometry) revitLayer.geometry.dispose();
          revitLayer.geometry = new THREE.BufferGeometry();
        }

        localBoolMeshes.forEach((m) => m.geometry.dispose());

        // Geometry is already in world-local coords — reset mesh transform
        revitLayer.position.set(0, 0, 0);
        revitLayer.scale.set(1, 1, 1);

        // Generate 3D Text on Base if enabled
        if (controls.enableBaseText && baseTextGroup) {
          const rawText = controls.baseTextCustom || `Country: ${country}\nBuilding: ${buildingName}`;
          const fontKey = controls.baseTextFont || "sans-serif";
          // Apply unicode-style transform if applicable (currently keeps ASCII for 3D font compat)
          const textToRender = applyFontStyle(rawText, fontKey);

          loadFontPromise(fontKey)
            .then((loadedFont) => {
              if (!baseTextGroup) return;
              while (baseTextGroup.children.length > 0) {
                const c = baseTextGroup.children[0] as THREE.Mesh;
                if (c.geometry) c.geometry.dispose();
                baseTextGroup.remove(c);
              }

              const fontSizeMm = controls.baseTextSize || 12;
              const textScale = ((fontSizeMm / 10) * unit1cmInObj) * 0.15;
              const extrudeDepth = (controls.baseTextDepth || 1.0) * unit1cmInObj * 0.1;

              const lines = textToRender.split("\n");
              const lineGeometries: THREE.BufferGeometry[] = [];

              const isItalic = fontKey === "italic" || fontKey === "boldItalic" || fontKey === "scriptBold";
              // 16 degrees distinct forward slant for authentic 3D italic
              const shearAngle = (16 * Math.PI) / 180;
              const shearMatrix = new THREE.Matrix4().set(
                1, Math.tan(shearAngle), 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
              );

              lines.forEach((lineStr, lineIdx) => {
                if (!lineStr.trim()) return;
                const lineGeom = new TextGeometry(lineStr, {
                  font: loadedFont,
                  size: textScale,
                  depth: extrudeDepth,
                  curveSegments: 4,
                  bevelEnabled: false,
                });
                if (isItalic) {
                  lineGeom.applyMatrix4(shearMatrix);
                  lineGeom.computeVertexNormals();
                }
                lineGeom.computeBoundingBox();
                const lineBbox = lineGeom.boundingBox;
                const lineW = lineBbox ? lineBbox.max.x - lineBbox.min.x : 0;
                // Center line horizontally and offset vertically by line number
                const lineOffset = -(lineIdx * (textScale * 1.5));
                lineGeom.translate(-lineW / 2, lineOffset, 0);
                lineGeometries.push(lineGeom);
              });

              if (lineGeometries.length === 0) return;

              let textGeom = mergeGeometries(lineGeometries);
              lineGeometries.forEach((g) => g.dispose());
              if (!textGeom) return;

              textGeom.computeBoundingBox();
              const tb = textGeom.boundingBox;
              const totalTextH = tb ? tb.max.y - tb.min.y : 0;

              // Center total height vertically around (0,0,0)
              textGeom.translate(0, totalTextH / 2, 0);

              const textColor = controls.baseTextColor || "#FFFFFF";
              const textMat = new THREE.MeshStandardMaterial({
                color: textColor,
                roughness: 0.5,
                metalness: 0.1,
              });
              const textMesh = new THREE.Mesh(textGeom, textMat);
              textMesh.name = "base_3d_text";
              textMesh.castShadow = true;

              const halfW = w / 2;
              const halfD = d / 2;
              const halfH = h / 2;
              // Offset = half the extrusion depth so text sits on surface (not half-embedded)
              const surfaceOffset = extrudeDepth / 2;

              // Top face position: baseTextPosX (-100 to 100), baseTextPosZ (-100 to 100)
              const posXNorm = (controls.baseTextPosX ?? 0) / 100;
              const posZNorm = (controls.baseTextPosZ ?? 75) / 100;
              const usableHalfW = halfW * 0.90;
              const usableHalfD = halfD * 0.90;

              const targetX = rx + posXNorm * usableHalfW;
              const targetZ = rz + posZNorm * usableHalfD;
              const targetY = ry + halfH + surfaceOffset;

              // Lay flat on top face — centered, text extrudes upward (+Y)
              textMesh.rotation.set(-Math.PI / 2, 0, 0);
              textMesh.position.set(targetX, targetY, targetZ);

              baseTextGroup.add(textMesh);
              baseTextGroup.visible = true;
            })
            .catch((err) => {
              console.warn("Could not load 3D typeface font:", err);
            });
        }
      }
    }

    // Determine which layers have subparts
    const layerSubpartsMap = new Map<string, boolean>();
    files.forEach((f) => {
      if (f.isSubPart) {
        layerSubpartsMap.set(f.layer, true);
      }
    });

    // Apply visibility of subparts vs monolithic
    object.children.forEach((layerGroup) => {
      const layerName = layerGroup.name;
      if (layerName === "revit" || layerName === "base_text_group" || layerName.startsWith("boolean_cube")) return;
      const hasSubParts = !!layerSubpartsMap.get(layerName);

      layerGroup.traverse((child) => {
        if (child === layerGroup) return;
        const isSubPart = !!child.userData.isSubPart;
        if (hasSubParts) {
          if (isSubPart) {
            child.visible = !!controls.enableColors;
          } else {
            child.visible = !controls.enableColors;
          }
        } else {
          child.visible = true;
        }
      });
    });

    const setVisible = (name: string, hidden: boolean) => {
      const layer = object.getObjectByName(name);
      if (layer) layer.visible = !hidden;
    };
    setVisible("roads", controls.hideRoads);
    setVisible("trees", controls.hideTrees);
    setVisible("grass", controls.hideGrass);
    setVisible("water", !controls.enableWater);

    // Apply layer and sub-part colors dynamically
    object.children.forEach((layer) => {
      if (layer.name.startsWith("boolean_cube") || layer.name === "base_text_group") return;

      if (layer.name === "revit") {
        const targetHex = controls.enableColors
          ? controls.layerColors.terrain || DEFAULT_LAYER_COLORS.terrain || "#545454"
          : "#e9e6df";
        const revitMesh = layer as THREE.Mesh;
        if (revitMesh.isMesh && revitMesh.material) {
          if (!revitMesh.userData.clonedMat) {
            revitMesh.material = (revitMesh.material as THREE.Material).clone();
            revitMesh.userData.clonedMat = true;
          }
          (revitMesh.material as THREE.MeshStandardMaterial).color?.set(targetHex);
        }
        return;
      }

      layer.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          if (!m.userData.clonedMat) {
            m.material = (m.material as THREE.Material).clone();
            m.userData.clonedMat = true;
          }
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.color) {
            let targetHex = "#e9e6df";
            if (controls.enableColors) {
              const layerName = m.userData.layerName || layer.name;
              const colorHint = m.userData.colorHint;

              // If user explicitly customized the color for this entire layer (e.g. main-building), use it
              // Otherwise, default to the part's own filename hex colorHint or default layer color
              if (controls.layerColors && controls.layerColors[layerName]) {
                targetHex = controls.layerColors[layerName];
              } else if (colorHint) {
                targetHex = colorHint;
              } else {
                targetHex = DEFAULT_LAYER_COLORS[layerName] || "#FFFFFF";
              }
            }
            mat.color.set(targetHex);
          }
        }
      });
    });
  }, [
    object,
    layerInfo,
    upAxis,
    horizAxes,
    rawModelSize,
    unit1cmInObj,
    terrainBottomAtRest,
    terrainHeightAtRest,
    center,
    controls,
    country,
    buildingName,
  ]);

  return (
    <>
      <TransformTarget
        mode={mode}
        position={[0, 0, 0]}
        onTarget={onTarget}
        onTransform={onTransform}
      >
        <group
          scale={scale}
          position={[-center.x * scale, -lowestY * scale, -center.z * scale]}
        >
          <primitive object={object} />
        </group>
      </TransformTarget>
      <BaseTextDragHandler
        object={object}
        controls={controls}
        scale={scale}
        lowestY={lowestY}
        center={center}
        onUpdateBaseTextPos={onUpdateBaseTextPos}
      />
    </>
  );
}

function BaseTextDragHandler({
  object,
  controls,
  scale,
  lowestY,
  center,
  onUpdateBaseTextPos,
}: {
  object: THREE.Object3D;
  controls: CityControls;
  scale: number;
  lowestY: number;
  center: THREE.Vector3;
  onUpdateBaseTextPos?: (x: number, z: number) => void;
}) {
  const { camera, gl, scene } = useThree();
  const orbitControls = useThree((state) => (state as any).controls);

  useEffect(() => {
    if (!controls.enableBaseText || !controls.enableRevit || !onUpdateBaseTextPos) return;

    const dom = gl.domElement;
    let isDragging = false;
    const raycaster = new THREE.Raycaster();

    const getNDC = (e: MouseEvent | PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const getBaseInfo = () => object.userData.baseTextDragInfo;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // Left click only
      const baseInfo = getBaseInfo();
      if (!baseInfo) return;

      const textMesh = scene.getObjectByName("base_3d_text");
      if (!textMesh || !textMesh.visible) return;

      const ndc = getNDC(e);
      raycaster.setFromCamera(ndc, camera);

      const hits = raycaster.intersectObject(textMesh, true);
      let isHit = hits.length > 0;
      if (!isHit) {
        const bbox = new THREE.Box3().setFromObject(textMesh);
        bbox.expandByScalar(0.18);
        isHit = raycaster.ray.intersectsBox(bbox);
      }
      if (!isHit) return;

      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      dom.style.cursor = "grabbing";

      if (orbitControls) {
        orbitControls.enabled = false;
      }

      const handlePointerMove = (moveEvt: PointerEvent) => {
        if (!isDragging) return;
        const curBaseInfo = getBaseInfo();
        if (!curBaseInfo) return;

        const mNdc = getNDC(moveEvt);
        raycaster.setFromCamera(mNdc, camera);

        const worldTopY = (curBaseInfo.ry + curBaseInfo.halfH - lowestY) * scale;
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -worldTopY);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(plane, intersection)) {
          const ox = intersection.x / scale + center.x;
          const oz = intersection.z / scale + center.z;

          const usableHalfW = curBaseInfo.halfW * 0.90;
          const usableHalfD = curBaseInfo.halfD * 0.90;

          const normX = Math.round(Math.max(-100, Math.min(100, ((ox - curBaseInfo.rx) / usableHalfW) * 100)));
          const normZ = Math.round(Math.max(-100, Math.min(100, ((oz - curBaseInfo.rz) / usableHalfD) * 100)));

          onUpdateBaseTextPos(normX, normZ);
        }
      };

      const handlePointerUp = () => {
        isDragging = false;
        dom.style.cursor = "auto";
        if (orbitControls) {
          orbitControls.enabled = true;
        }
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    };

    const handleHover = (e: PointerEvent) => {
      if (isDragging) return;
      const textMesh = scene.getObjectByName("base_3d_text");
      if (!textMesh || !textMesh.visible) return;

      const ndc = getNDC(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(textMesh, true);
      let isOver = hits.length > 0;
      if (!isOver) {
        const bbox = new THREE.Box3().setFromObject(textMesh);
        bbox.expandByScalar(0.12);
        isOver = raycaster.ray.intersectsBox(bbox);
      }

      if (isOver) {
        dom.style.cursor = "grab";
      } else if (dom.style.cursor === "grab") {
        dom.style.cursor = "auto";
      }
    };

    dom.addEventListener("pointerdown", handlePointerDown);
    dom.addEventListener("pointermove", handleHover);

    return () => {
      dom.removeEventListener("pointerdown", handlePointerDown);
      dom.removeEventListener("pointermove", handleHover);
      if (orbitControls) {
        orbitControls.enabled = true;
      }
    };
  }, [object, controls.enableBaseText, controls.enableRevit, scale, lowestY, center, camera, gl, scene, orbitControls, onUpdateBaseTextPos]);

  return null;
}

// Fallback tile for locations that don't have a model uploaded yet.
function PlaceholderTile({
  mode,
  onTarget,
  onTransform,
}: {
  mode: GizmoMode;
  onTarget: (o: THREE.Object3D | null) => void;
  onTransform: (o: THREE.Object3D) => void;
}) {
  return (
    <TransformTarget
      mode={mode}
      position={[0, 1, 0]}
      onTarget={onTarget}
      onTransform={onTransform}
    >
      <mesh castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#e9e6df" roughness={0.6} metalness={0.05} />
        <Edges color="#8a8478" threshold={20} opacity={0.35} transparent />
      </mesh>
    </TransformTarget>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cream/20 border-t-[color:var(--accent)]" />
        <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.24em] text-cream/55">
          Loading model…
        </span>
      </div>
    </Html>
  );
}

function StudioCameraControls() {
  return (
    <OrbitControls
      makeDefault
      target={[0, 0.8, 0]}
      enableDamping
      dampingFactor={0.08}
      minDistance={2.0}
      maxDistance={32.0}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}

export default function StudioScene({
  bedW,
  bedD,
  mode,
  light,
  loading,
  files,
  cityControls,
  country = "United States",
  buildingName = "Building",
  onTarget,
  onTransform,
  onUpdateBaseTextPos,
}: {
  bedW: number;
  bedD: number;
  mode: GizmoMode;
  light: boolean;
  loading: boolean;
  files: ModelFile[];
  cityControls: CityControls;
  country?: string;
  buildingName?: string;
  onTarget: (o: THREE.Object3D | null) => void;
  onTransform: (o: THREE.Object3D) => void;
  onUpdateBaseTextPos?: (x: number, z: number) => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [7, 5.5, 9], fov: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[6, 9, 4]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-6, 4, -5]} intensity={0.6} color="#c8cede" />
      <directionalLight position={[0, 2, -8]} intensity={0.45} color="#e8d9c4" />

      <Bed w={bedW} d={bedD} light={light} />

      {/* One render path — no placeholder→model swap. */}
      {loading ? (
        <Loader />
      ) : files.length > 0 ? (
        <Suspense fallback={<Loader />}>
          <CityAssembly
            key={files[0].url}
            files={files}
            mode={mode}
            controls={cityControls}
            country={country}
            buildingName={buildingName}
            onTarget={onTarget}
            onTransform={onTransform}
            onUpdateBaseTextPos={onUpdateBaseTextPos}
          />
        </Suspense>
      ) : (
        <PlaceholderTile mode={mode} onTarget={onTarget} onTransform={onTransform} />
      )}

      <StudioCameraControls />
    </Canvas>
  );
}
