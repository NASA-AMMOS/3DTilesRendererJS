import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";

import { TilesRenderer } from "../three/TilesRenderer";
import { DebugTilesRenderer } from "../three/DebugTilesRenderer";
import { GooglePhotorealisticTilesRenderer, DebugGooglePhotorealisticTilesRenderer } from '../three/renderers/GoogleTilesRenderer';
import {CesiumIonTilesRenderer, DebugCesiumIonTilesRenderer } from '../three/renderers/CesiumIonTilesRenderer'

import { TileCompressionPlugin } from '../../example/src/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from '../../example/src/plugins/UpdateOnChangePlugin.js';
import { TilesFadePlugin } from '../../example/src/plugins/fade/TilesFadePlugin.js';
// import { CesiumIonAuthPlugin } from '../src/plugins/CesiumIonAuthPlugin.js';

import {applyMatrix4_matrixVersion} from './utils'

const TilesRendererType = {
  Standard: 'Standard',
  Google: 'Google',
  CesiumIon: 'CesiumIon',
}

export {TilesRendererType}

function R3F3DTilesRenderer(props) {
  const tilesRendererRef = useRef(null);
  const groupRef = useRef(null);
  const { camera, gl } = useThree();

  const draco = new DRACOLoader();
  draco.setDecoderConfig({ type: "js" });
  draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
  // draco.setDecoderPath( 'https://unpkg.com/three@0.153.0/examples/jsm/libs/draco/gltf/' );
  // https://github.com/pmndrs/drei/discussions/1335
  const THREE_PATH = `https://unpkg.com/three@0.${THREE.REVISION}.x`;
  const ktx2Loader = new KTX2Loader().setTranscoderPath(
    `${THREE_PATH}/examples/jsm/libs/basis/`
  );

  useEffect(() => {
    // Create the TilesRenderer Object
    let tilesRenderer;
    if (props.type === TilesRendererType.Standard){
      if (!props.path) throw('No path provided for a Standard tileRenderer');
      if (!props.debug) {
        tilesRenderer = new TilesRenderer(props.path);
      } else {
        tilesRenderer = new DebugTilesRenderer(props.path);
      }
    }
    else if (props.type === TilesRendererType.Google){
      if (!props.googleApiKey) throw('No googleApiKey provided for a GooglePhotorealisticTilesRenderer');
      if (!props.debug) {
        tilesRenderer = new GooglePhotorealisticTilesRenderer();
      } else {
        tilesRenderer = new DebugGooglePhotorealisticTilesRenderer();
      }
      tilesRenderer.registerPlugin( new GoogleCloudAuthPlugin( { apiToken: props.googleApiKey, autoRefreshToken: true } ) );
      tilesRenderer.errorTarget = 50;
    }
    else if (props.type === TilesRendererType.CesiumIon){
      if (!props.ionAssetId || !props.ionAccessToken) throw('No ionAccessToken or ionAssetId provided for a CesiumIonTilesRenderer');
      if (!props.debug) {
        tilesRenderer = new CesiumIonTilesRenderer(props.ionAssetId, props.ionAccessToken);
      } else {
        tilesRenderer = new DebugCesiumIonTilesRenderer(props.ionAssetId, props.ionAccessToken);
      }
      // tilesRenderer.registerPlugin( new CesiumIonAuthPlugin( { apiToken: params.ionAccessToken, assetId: params.ionAssetId } ) );
      // tilesRenderer.fetchOptions.mode = 'cors';
    } else {
      throw ('R3F3DTilesRenderer component has to have type prop that takes values among `Standard, Google, CesiumIon`')
    }
    
    // tilesRenderer.registerPlugin( new TileCompressionPlugin() );
    // tilesRenderer.registerPlugin( new UpdateOnChangePlugin() );
    // tilesRenderer.registerPlugin( new TilesFadePlugin() );

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
    if (true || props.clippingPlanes) {
      tilesRenderer.addEventListener( 'load-model', ({scene}) => {
        console.log('SCENEEEEEEEEEEEE', scene)
        scene.traverse((child) => {
          if (child.isMesh) {
            // see https://github.com/orgs/Iconem/projects/3/views/6?pane=issue&itemId=75278208
            child.material.color = new THREE.Color('#ddd')
            child.material.emissive = new THREE.Color('#444')
            child.material.metalness = 0.5
            child.material.roughness = 0.5
            // child.material.emissiveMap = child.material.map
            console.log('child.material', child.material)
            // child.material.map.generateMipmaps = false;
            if (props.clippingPlanes) {
              // child.material.clippingPlanes = props.clippingPlanes;
              // child.material.clipIntersection = props.clippingVolume
              //   ? true
              //   : false;
            }
          }
        });
      } );

      // tilesRenderer.addEventListener( 'dispose-model', (scene) => {
      //   scene.traverse((child) => {
      //     if (child.isMesh) {
      //       const material = child.material;
      //       material.dispose();
      //     }
      //   });
      // });
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

