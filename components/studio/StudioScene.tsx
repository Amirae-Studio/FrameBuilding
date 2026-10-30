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
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
import { MM, DEFAULT_LAYER_COLORS, type CityControls, type BaseText } from "../../lib/studio";
import {
  buildBaseStack,
  classifyFace,
  disposeStack,
  faceFrame,
  pointToUV,
  stackThickness,
  STACK_GROUP,
  type BaseInfo,
  type MaskBox,
  type StackFrame,
} from "./baseStack";
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

  const plate = light ? "#e2e0ec" : "#4f5396";
  const lineColor = light ? "#4a4344" : "#f6eaea";

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
  selectedTextId,
  onSelectText,
  onMoveText,
  onModelSize,
}: {
  files: ModelFile[];
  mode: GizmoMode;
  controls: CityControls;
  country?: string;
  buildingName?: string;
  onTarget: (o: THREE.Object3D | null) => void;
  onTransform: (o: THREE.Object3D) => void;
  selectedTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  onMoveText?: (id: string, patch: Partial<BaseText>) => void;
  onModelSize?: (widthCm: number, depthCm: number) => void;
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

    // Compute bounding box ONLY for city model layers (excluding helper volumes)
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

    // 1 three.js unit = 50 mm, so 1 cm = 10 * MM world units = (10 * MM) / scale object units.
    // The base stack itself is built in its own effect (see buildBaseStack).
    const unit1cmInObj = (10 * MM) / scale;

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
    // every base in the stack, one under the other
    const h = stackThickness(controls.bases, unit1cmInObj);
    const revitBottom = effectiveBottom + REVIT_OVERLAP - h;
    const lowestPoint = controls.enableRevit
      ? Math.min(effectiveBottom, revitBottom)
      : effectiveBottom;
    const lowestY = Math.min(boxMin[upAxis], lowestPoint);
    const totalHeight = boxMax[upAxis] - lowestY;
    return { lowestY, totalHeight };
  }, [
    controls.enableRevit,
    controls.bases,
    controls.terrain,
    terrainBottomAtRest,
    unit1cmInObj,
    boxMin,
    boxMax,
    upAxis,
    layerInfo,
  ]);


  // Apply the Manipulate City controls, non-destructively.
  // The base stack (plates + labels) is rebuilt separately below.
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
      if (layerName === STACK_GROUP || layerName.startsWith("boolean_cube")) return;
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
      if (layer.name.startsWith("boolean_cube") || layer.name === STACK_GROUP) return;

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
  ]);

  // tell the configurator the model's footprint (cm) so presets can size around it
  useEffect(() => {
    onModelSize?.(rawModelSize.width / unit1cmInObj, rawModelSize.depth / unit1cmInObj);
  }, [onModelSize, rawModelSize, unit1cmInObj]);

  /* ---------------------------------------------------------------- base stack */

  const stackRef = useRef<THREE.Group | null>(null);
  const buildToken = useRef(0);
  const defaultLabel = `Country: ${country}\nBuilding: ${buildingName}`;

  useEffect(() => {
    const token = ++buildToken.current;
    const remove = () => {
      if (stackRef.current) {
        object.remove(stackRef.current);
        disposeStack(stackRef.current);
        stackRef.current = null;
      }
    };
    if (!controls.enableRevit || controls.bases.length === 0) {
      remove();
      return;
    }

    // where the terrain's bottom currently is (it stretches downward)
    const terrainInfo = layerInfo.get("terrain");
    let terrainBottom = terrainBottomAtRest;
    if (terrainInfo) {
      const totalH = terrainInfo.max[upAxis] - terrainInfo.min[upAxis];
      terrainBottom = terrainInfo.min[upAxis] - (controls.terrain / 100 - 1) * 0.35 * totalH;
    }
    const frame: StackFrame = {
      upAxis,
      horizAxes,
      cx: center[horizAxes[0]],
      cz: center[horizAxes[1]],
      topY: terrainBottom + 0.015,
      modelW: rawModelSize.width,
      modelD: rawModelSize.depth,
      unit: unit1cmInObj,
    };

    // footprints of boolean_cube helpers are cut through the top base (water off)
    const maskBoxes = controls.enableWater ? [] : computeMaskBoxes(object, frame, controls.bases[0], boxMax);

    const fontKeys = Array.from(new Set(["sans-serif", ...controls.texts.map((t) => t.font)]));
    let timer: ReturnType<typeof setTimeout> | undefined;

    const commit = (fonts: Map<string, Font>, fast: boolean) => {
      if (token !== buildToken.current) return;
      const { group } = buildBaseStack(frame, controls.bases, controls.texts, {
        fonts,
        colors: controls.enableColors,
        defaultText: defaultLabel,
        maskBoxes,
        fast,
      });
      remove();
      object.add(group);
      object.updateMatrixWorld(true);
      stackRef.current = group;
      highlightText(group, selectedTextId);
    };

    Promise.all(fontKeys.map((k) => loadFontPromise(k).then((f) => [k, f] as const).catch(() => null)))
      .then((pairs) => {
        if (token !== buildToken.current) return;
        const fonts = new Map<string, Font>();
        pairs.forEach((p) => p && fonts.set(p[0], p[1]));
        const needsCarve = controls.texts.some((t) => t.mode === "engrave");
        // instant preview, then the carved result once the user pauses
        commit(fonts, needsCarve);
        if (needsCarve) timer = setTimeout(() => commit(fonts, false), 350);
      });

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    object,
    controls.enableRevit,
    controls.bases,
    controls.texts,
    controls.terrain,
    controls.enableWater,
    controls.enableColors,
    layerInfo,
    upAxis,
    horizAxes,
    center,
    rawModelSize,
    unit1cmInObj,
    terrainBottomAtRest,
    boxMax,
    defaultLabel,
  ]);

  // selection highlight without a rebuild
  useEffect(() => {
    if (stackRef.current) highlightText(stackRef.current, selectedTextId);
  }, [selectedTextId]);

  // remove the stack when this assembly unmounts
  useEffect(
    () => () => {
      if (stackRef.current) {
        disposeStack(stackRef.current);
        stackRef.current = null;
      }
    },
    []
  );

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
      <StackDragHandler
        object={object}
        enabled={controls.enableRevit && controls.texts.length > 0}
        onSelectText={onSelectText}
        onMoveText={onMoveText}
      />
    </>
  );
}

/** Gently tint the selected label so it is obvious which one you are editing. */
function highlightText(group: THREE.Object3D, id: string | null | undefined) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.userData.isBaseText) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    const on = !!id && m.userData.textId === id;
    mat.emissive?.set(on ? "#ff9a5c" : "#000000");
    mat.emissiveIntensity = on ? 0.35 : 0;
  });
}

/**
 * Footprints of the boolean_cube helpers under the top base, merged into as few
 * boxes as possible. They are carved through the top plate (e.g. water shows through).
 */
function computeMaskBoxes(
  object: THREE.Object3D,
  frame: StackFrame,
  top: CityControls["bases"][number],
  boxMax: THREE.Vector3
): MaskBox[] {
  const boolMeshes: THREE.Mesh[] = [];
  object.children.forEach((layer) => {
    if (!layer.name.startsWith("boolean_cube")) return;
    layer.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const local = new THREE.Matrix4();
      let curr: THREE.Object3D | null = mesh;
      while (curr && curr !== object) {
        local.premultiply(curr.matrix);
        curr = curr.parent;
      }
      const g = mesh.geometry.clone();
      g.applyMatrix4(local);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.matrixWorld.identity();
      boolMeshes.push(m);
    });
  });
  if (!boolMeshes.length) return [];

  const margins = top.uniform ? { w: top.margin, d: top.margin } : { w: top.marginW, d: top.marginD };
  const w = frame.modelW + 2 * margins.w * frame.unit;
  const d = frame.modelD + 2 * margins.d * frame.unit;
  const N = 60;
  const cw = w / N;
  const cd = d / N;
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  dir[frame.upAxis] = -1;
  const origin = new THREE.Vector3();
  const hit: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  for (let ix = 0; ix < N; ix++) {
    for (let iz = 0; iz < N; iz++) {
      origin[frame.upAxis] = boxMax[frame.upAxis] + 100;
      origin[frame.horizAxes[0]] = frame.cx - w / 2 + (ix + 0.5) * cw;
      origin[frame.horizAxes[1]] = frame.cz - d / 2 + (iz + 0.5) * cd;
      ray.set(origin, dir);
      hit[ix][iz] = ray.intersectObjects(boolMeshes, false).length > 0;
    }
  }
  boolMeshes.forEach((m) => m.geometry.dispose());

  // greedy merge of masked cells into boxes
  const used: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));
  const boxes: MaskBox[] = [];
  for (let ix = 0; ix < N; ix++) {
    for (let iz = 0; iz < N; iz++) {
      if (!hit[ix][iz] || used[ix][iz]) continue;
      let rw = 1;
      while (ix + rw < N && hit[ix + rw][iz] && !used[ix + rw][iz]) rw++;
      let rd = 1;
      let grow = true;
      while (iz + rd < N && grow) {
        for (let k = 0; k < rw; k++) if (!hit[ix + k][iz + rd] || used[ix + k][iz + rd]) grow = false;
        if (grow) rd++;
      }
      for (let kx = 0; kx < rw; kx++) for (let kz = 0; kz < rd; kz++) used[ix + kx][iz + kz] = true;
      // slight overlap so neighbouring cut boxes leave no slivers
      boxes.push({
        a: frame.cx - w / 2 + (ix + rw / 2) * cw,
        b: frame.cz - d / 2 + (iz + rd / 2) * cd,
        w: rw * cw * 1.002,
        d: rd * cd * 1.002,
      });
    }
  }
  return boxes;
}

/**
 * Click a label to select it; drag it anywhere on the stack — across the top
 * of any base or onto any of its four sides. It stays attached to the face it
 * is over.
 */
function StackDragHandler({
  object,
  enabled,
  onSelectText,
  onMoveText,
}: {
  object: THREE.Object3D;
  enabled: boolean;
  onSelectText?: (id: string | null) => void;
  onMoveText?: (id: string, patch: Partial<BaseText>) => void;
}) {
  const { camera, gl } = useThree();
  const orbitControls = useThree((state) => (state as unknown as { controls?: { enabled: boolean } }).controls);

  useEffect(() => {
    if (!enabled) return;
    const dom = gl.domElement;
    const raycaster = new THREE.Raycaster();
    let dragging: string | null = null;

    const ndc = (e: PointerEvent) => {
      const r = dom.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const stack = () => object.getObjectByName(STACK_GROUP);
    const meshes = (pred: (m: THREE.Mesh) => boolean) => {
      const out: THREE.Mesh[] = [];
      stack()?.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && pred(m)) out.push(m);
      });
      return out;
    };
    const textUnder = (e: PointerEvent) => {
      // the stack is rebuilt as labels move; refresh matrices before picking
      object.updateMatrixWorld(true);
      raycaster.setFromCamera(ndc(e), camera);
      const texts = meshes((m) => !!m.userData.isBaseText);
      const hit = raycaster.intersectObjects(texts, false)[0];
      if (hit) return hit.object.userData.textId as string;
      // generous hit area around small labels
      for (const t of texts) {
        const bb = new THREE.Box3().setFromObject(t).expandByScalar(0.08);
        if (raycaster.ray.intersectsBox(bb)) return t.userData.textId as string;
      }
      return null;
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging || !onMoveText) return;
      const group = stack();
      const info = group?.userData.stack as { frame: StackFrame; bases: BaseInfo[] } | undefined;
      if (!group || !info) return;
      object.updateMatrixWorld(true);
      raycaster.setFromCamera(ndc(e), camera);
      // first visible surface under the pointer — if the model is in front of
      // the base there, keep the label where it was (never slide it under the model)
      const isShown = (o: THREE.Object3D | null) => {
        for (let c = o; c; c = c.parent) if (!c.visible) return false;
        return true;
      };
      const hit = raycaster
        .intersectObject(object, true)
        .find((h) => !h.object.userData.isBaseText && isShown(h.object));
      if (!hit || !hit.face || !hit.object.userData.isBase) return;
      const base = info.bases.find((b) => b.id === hit.object.userData.baseId);
      const face = classifyFace(info.frame, hit.face.normal);
      if (!base || !face) return;
      const local = object.worldToLocal(hit.point.clone());
      const { u, v } = pointToUV(faceFrame(info.frame, base, face), local);
      onMoveText(dragging, { baseId: base.id, face, u, v });
    };

    const onUp = () => {
      dragging = null;
      dom.style.cursor = "auto";
      if (orbitControls) orbitControls.enabled = true;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const id = textUnder(e);
      if (!id) return;
      e.preventDefault();
      e.stopPropagation();
      onSelectText?.(id);
      dragging = id;
      dom.style.cursor = "grabbing";
      if (orbitControls) orbitControls.enabled = false;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };

    const onHover = (e: PointerEvent) => {
      if (dragging) return;
      const over = !!textUnder(e);
      if (over) dom.style.cursor = "grab";
      else if (dom.style.cursor === "grab") dom.style.cursor = "auto";
    };

    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onHover);
    return () => {
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onHover);
      onUp();
    };
  }, [object, enabled, camera, gl, orbitControls, onSelectText, onMoveText]);

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
  selectedTextId,
  onSelectText,
  onMoveText,
  onModelSize,
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
  selectedTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  onMoveText?: (id: string, patch: Partial<BaseText>) => void;
  onModelSize?: (widthCm: number, depthCm: number) => void;
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
            selectedTextId={selectedTextId}
            onSelectText={onSelectText}
            onMoveText={onMoveText}
            onModelSize={onModelSize}
          />
        </Suspense>
      ) : (
        <PlaceholderTile mode={mode} onTarget={onTarget} onTransform={onTransform} />
      )}

      <StudioCameraControls />
    </Canvas>
  );
}
