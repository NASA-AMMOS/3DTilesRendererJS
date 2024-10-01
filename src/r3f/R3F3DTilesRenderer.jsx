import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";

import { TilesRenderer } from "../three/TilesRenderer";
import { DebugTilesRenderer } from "../three/DebugTilesRenderer";

const draco = new DRACOLoader();
draco.setDecoderConfig({ type: "js" });
draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
// https://github.com/pmndrs/drei/discussions/1335
const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`;
const ktx2Loader = new KTX2Loader().setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`
);

const applyMatrix4_matrixVersion = (obj, matrix) => {
  // https://github.com/mrdoob/three.js/blob/76bff1eb9584c47d521755b87e49246079a8ae24/src/core/Object3D.js#L128
  // mat.(de)compose(p, q, s) introduces errors in scale+quaternion computation
  // So using this method to update the matrix itself
  /*
  // For reference: Object3D.applyMatrix4
  applyMatrix4( matrix ) {
    if ( this.matrixAutoUpdate ) this.updateMatrix();
    // updateMatrix() {
    // 	this.matrix.compose( this.position, this.quaternion, this.scale );
    // 	this.matrixWorldNeedsUpdate = true;
    // }
    this.matrix.premultiply( matrix );
    this.matrix.decompose( this.position, this.quaternion, this.scale );
  }
  */
  obj.matrix.premultiply(matrix);
  obj.matrixAutoUpdate = false;
  obj.updateMatrixWorld(true);
};
export {applyMatrix4_matrixVersion};

function R3F3DTilesRenderer(props) {
  const tilesRendererRef = useRef(null);
  const groupRef = useRef(null);
  const { camera, gl } = useThree();

  useEffect(() => {

    // Create the TilesRenderer Object
    if (!props.path) return;
    let tilesRenderer;
    if (!props.debug) {
      tilesRenderer = new TilesRenderer(props.path);
    } else {
      tilesRenderer = new DebugTilesRenderer(props.path);
      Object.entries(props.debug).forEach(
        (entry, idx) => (tilesRenderer[entry[0]] = entry[1])
      );
    }
    // Set tile loader manager
    const loader = new GLTFLoader(tilesRenderer.manager);
    loader.setDRACOLoader(draco);
    loader.setKTX2Loader(ktx2Loader.detectSupport(gl));
    tilesRenderer.manager.addHandler(/\.gltf$/, loader);

    // Set camera and resolution
    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, gl);

    // Eventually apply matrixTransform
    if (props.resetTransform) {
      // center the tileset on local origin in case it's far off center
      // has to be applied on each tiles, not only on the tileset
      tilesRenderer.addEventListener("load-tile-set", () => {
        const sphere = new THREE.Sphere();
        tilesRenderer.getBoundingSphere(sphere);
        tilesRenderer.group.position.copy(sphere.center).multiplyScalar(-1);
      });
    } else if (props.matrixTransform) {
      applyMatrix4_matrixVersion(groupRef.current, props.matrixTransform);
    }
    
    // Handle Clipping Planes and material properties applied to every tile mesh
    if (props.clippingPlanes) {
      tilesRenderer.addEventListener( 'load-model', (scene) => {
        scene.traverse((child) => {
          if (child.isMesh) {
            // see https://github.com/orgs/Iconem/projects/3/views/6?pane=issue&itemId=75278208
            child.material.map.generateMipmaps = false;
            if (props.clippingPlanes) {
              child.material.clippingPlanes = props.clippingPlanes;
              child.material.clipIntersection = props.clippingVolume
                ? true
                : false;
            }
          }
        });
      } );

      tilesRenderer.addEventListener( 'dispose-model', (scene) => {
        scene.traverse((child) => {
          if (child.isMesh) {
            const material = child.material;
            material.dispose();
          }
        });
      });
    }

    tilesRendererRef.current = tilesRenderer;
    groupRef.current.add(tilesRenderer.group);
    const groupRefCopy = groupRef.current;
    return () => {
      tilesRenderer.dispose();
      groupRefCopy.remove(tilesRenderer.group);
    };
  }, []);

  // update on every frame
  useFrame(() => {
    tilesRendererRef.current?.update();
  });

  return <group ref={groupRef} />;
}

export default R3F3DTilesRenderer;

