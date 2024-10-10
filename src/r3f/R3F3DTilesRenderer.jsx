import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";

import { TilesRenderer } from "../three/TilesRenderer";
import { GooglePhotorealisticTilesRenderer } from '../three/renderers/GoogleTilesRenderer';
import { GoogleCloudAuthPlugin } from '../three/plugins/GoogleCloudAuthPlugin.js';
import {CesiumIonTilesRenderer } from '../three/renderers/CesiumIonTilesRenderer'
import {applyMatrix4_matrixVersion} from './utils'


export const TilesRendererType = {
  Standard: 'Standard',
  Google: 'Google',
  CesiumIon: 'CesiumIon',
}

console.log('THREE REVISION: ', THREE.REVISION)
const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`;
const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath( `${THREE_PATH}/examples/js/libs/draco/gltf/` );
// dracoLoader.setDecoderConfig({ type: "js" });
// dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
dracoLoader.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );
// https://github.com/pmndrs/drei/discussions/1335
const ktx2Loader = new KTX2Loader().setTranscoderPath(
  `${THREE_PATH}/examples/jsm/libs/basis/`
);

function R3F3DTilesRenderer(props) {
  const tilesRendererRef = useRef(null);
  const groupRef = useRef(null);
  const { camera, gl } = useThree();


  useEffect(() => {
    // Create the TilesRenderer Object
    let tilesRenderer;
    if (props.type === TilesRendererType.Standard){
      if (!props.path) throw('No path provided for a Standard tileRenderer');
      tilesRenderer = new TilesRenderer(props.path);
    }
    else if (props.type === TilesRendererType.Google){
      if (!props.googleApiKey) throw('No googleApiKey provided for a GooglePhotorealisticTilesRenderer');
      tilesRenderer = new GooglePhotorealisticTilesRenderer();
      tilesRenderer.registerPlugin( new GoogleCloudAuthPlugin( { apiToken: props.googleApiKey, autoRefreshToken: true } ) );
      tilesRenderer.errorTarget = 50;
    }
    else if (props.type === TilesRendererType.CesiumIon){
      if (!props.ionAssetId || !props.ionAccessToken) throw('No ionAccessToken or ionAssetId provided for a CesiumIonTilesRenderer');
      tilesRenderer = new CesiumIonTilesRenderer(props.ionAssetId, props.ionAccessToken);
    } else {
      throw ('R3F3DTilesRenderer component has to have type prop that takes values among `Standard, Google, CesiumIon`')
    }

    if (props.rendererPlugins) 
      for (const plugin of props.rendererPlugins) 
        tilesRenderer.registerPlugin( plugin );

    // Set tile loader manager
    const loader = new GLTFLoader(tilesRenderer.manager);
    loader.setDRACOLoader(dracoLoader);
    loader.setKTX2Loader(ktx2Loader.detectSupport(gl));
    tilesRenderer.manager.addHandler( /\.gltf$/, loader );
    // tilesRenderer.manager.addHandler( /(gltf|glb|b3dm)$/g, loader);

    // Set camera and resolution
    tilesRenderer.setCamera(camera);
    tilesRenderer.setResolutionFromRenderer(camera, gl);

    // Generic listeners applied to renderer to traverse tile scene, edit mesh materials etc
    if (props.addRendererEventListeners) {
      props.addRendererEventListeners(tilesRenderer)
    }

    // TODO: EVENTUALLY EXTRACT THESE MATRIX TRANSFORMS OUTSIDE THE RENDERER COMPONENT
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

    // Store references to the renderer and group to dispose them correctly at the end
    tilesRendererRef.current = tilesRenderer;
    groupRef.current.add(tilesRenderer.group);
    const groupRefCopy = groupRef.current;
    return () => {
      tilesRenderer.dispose();
      groupRefCopy.remove(tilesRenderer.group);
    };
  }, []);

  // update renderer on every frame
  useFrame(() => {
    tilesRendererRef.current?.update();
  });

  return <group ref={groupRef} />;
}

export default R3F3DTilesRenderer;

