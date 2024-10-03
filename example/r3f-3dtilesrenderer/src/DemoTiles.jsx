import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {computeTransformToLocalYup, computeTransformToLocalZup} from './utils'
import {Vector3} from "three";

import R3F3DTilesRenderer from '../../../src/r3f/R3F3DTilesRenderer'
import {TilesRendererType} from '../../../src/r3f/R3F3DTilesRenderer'

import { TransformControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useControls, folder } from 'leva'

import {DebugTilesPlugin, NONE, SCREEN_ERROR, GEOMETRIC_ERROR, DISTANCE, DEPTH, RELATIVE_DEPTH, IS_LEAF, RANDOM_COLOR, RANDOM_NODE_COLOR, CUSTOM_COLOR, LOAD_ORDER} from '../../../src/three/plugins/DebugTilesPlugin'
import { TileCompressionPlugin } from '../../example/src/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from '../../example/src/plugins/UpdateOnChangePlugin.js';
import { TilesFadePlugin } from '../../example/src/plugins/fade/TilesFadePlugin.js';

function Simple3dTileset(props) {

  const matrixTransform_Roma = computeTransformToLocalYup (
    new Vector3(288807, 4642039, 100), // Roma Vatican 32633
    '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs +type=crs',  // EPSG:32633 UTM 33N Roma
    '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs'        // EPSG:4978 metric
  )
  const matrixTransform_NY = computeTransformToLocalYup (
    new Vector3(756961, 4759003, 0), // New York 32618
    '+proj=utm +zone=18 +datum=WGS84 +units=m +no_defs +type=crs',  // EPSG:32633 UTM 33N New york
    '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs'        // EPSG:4978 metric
  )

  const { debug, tilesRendererType, latlon, googleApiKey, ionAccessToken, ionAssetId, resetTransform, tilesetPath } = useControls({ 
    debug: false, // TODO DEBUG RENDERERS WERE REPLACED BY A PLUGIN
    tilesRendererType: {
      value: TilesRendererType.Google, 
      options : {
        [TilesRendererType.Standard]: TilesRendererType.Standard, 
        [TilesRendererType.Google]: TilesRendererType.Google, 
        [TilesRendererType.CesiumIon]: TilesRendererType.CesiumIon, 
      }
    }, 
    latlon: [0, 0],
    'Standard': folder(
      {tilesetPath: '3dtiles tileset path'}, 
      { render: (get) => get('tilesRendererType') == TilesRendererType.Standard }
    ), 
    'Google 3D Cities': folder(
      {
        googleApiKey: import.meta.env.VITE_GOOGLEAPIKEY
      }, 
      { render: (get) => get('tilesRendererType') == TilesRendererType.Google }
    ), 
    CesiumIon: folder(
      {
        ionAccessToken: import.meta.env.VITE_IONACCESSTOKEN,
        ionAssetId: '57587'
        // ionAssetId: {
        //   value: 57587,
        //   min: 0,
        //   max: 10e6,
        //   step: 1,
        // }
      }, 
      { render: (get) => get('tilesRendererType') == TilesRendererType.CesiumIon }
    ), // 2684829, 2644092, 2275207, 1415196, 354759, 354307, 96188, 75343, 69380, 57590, 57588, 57587, 43978, 29335, 29332, 29331, 28945
    resetTransform: true,
  })

  console.log('LEVA Controls: debug, tilesRendererType, latlon, googleApiKey, ionAccessToken, ionAssetId, resetTransform, tilesetPath', debug, tilesRendererType, latlon, googleApiKey, ionAccessToken, ionAssetId, resetTransform, tilesetPath)

  // Add plugins
  const rendererPlugins = [
    new DebugTilesPlugin({
			colorMode: RANDOM_COLOR,
      displayBoxBounds: true,
			// displayRegionBounds: false,
			// displaySphereBounds: false,
			// maxDebugDepth: - 1,
			// maxDebugDistance: - 1,
			// maxDebugError: - 1,
			// customColorCallback: null,
    }), 
    // new TileCompressionPlugin(),
    // new UpdateOnChangePlugin(),
    // new TilesFadePlugin(),
  ]
  
  // Add event listeners to tilesRenderer
  const addRendererEventListeners = tilesRenderer => {
    
    // Handle Clipping Planes and material properties applied to every tile mesh
    if (false || props.clippingPlanes) {
      tilesRenderer.addEventListener( 'load-model', ({scene}) => {
        console.log('SCENEEEEEEEEEEEE', scene)
        scene.traverse((child) => {
          if (child.isMesh) {
            console.log('child.material', child.material)
            // see https://github.com/orgs/Iconem/projects/3/views/6?pane=issue&itemId=75278208
            child.material.color = new THREE.Color('#ddd')
            child.material.emissive = new THREE.Color('#444')
            child.material.metalness = 0.5
            child.material.roughness = 0.5
            // child.material.emissiveMap = child.material.map
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

      tilesRenderer.addEventListener( 'dispose-model', (scene) => {
        scene.traverse((child) => {
          if (child.isMesh) {
            const material = child.material;
            material.dispose();
          }
        });
      });
    }
  }

  return <R3F3DTilesRenderer
    {...props}
    // type={tilesRendererType}
    // debug={debug}
    // resetTransform={resetTransform}

    type={TilesRendererType.Google}
    // type={TilesRendererType.Google}
    // type={TilesRendererType.CesiumIon}
    rendererPlugins= {rendererPlugins}
    resetTransform={false}
    // path={openDataTilesets.iconem_bing}
    path={openDataTilesets.iconem_int_merged_473M}
    matrixTransform={matrixTransform_Roma}
    addRendererEventListeners={addRendererEventListeners}
    // matrixTransform={matrixTransform_NY}
    
    // path={tilesetPath}
    googleApiKey={googleApiKey}
    ionAssetId={'57587'} // 57587 cesium ion asset is oer New York
    // ionAssetId={ionAssetId}
    ionAccessToken={ionAccessToken}
    // resetTransform={props.matrixTransform ? false : true}
    // clippingPlanes={props.clippingPlanes}
    // path={openDataTilesets.iconem2}

  />
}

function DemoTiles() {
  const { camera } = useThree();
  useEffect(() => {
    // camera.up.set(0, 0, 1);
    camera.far = 1000000;
    camera.near = 0.1;
  }, []);

  return (
    <>
      <Grid 
        infiniteGrid={ true }
        fadeDistance={ 200 }
        fadeStrength={ 0.5 }
        fadeFrom={ 1 } 
        cellSize={ 1 }
        sectionSize={ 5 }
        cellColor={ '#6f6f6f' }
        sectionColor={ '#9d4b4b' }
        cellThickness={ 0.5 }
        sectionThickness={ 1.5 }
        followCamera={ false }
      />
      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
      </GizmoHelper>

      {/* <group rotation={[ -0*Math.PI / 2, 0*Math.PI / 2, 0*Math.PI / 2]}> */}
      {/* <TransformControls mode='rotate' > */}
        <Simple3dTileset 
        />
        {/*<EnvLayer /> */}
      {/* </TransformControls> */}
      {/* </group> */}
    </>
  )
}

export default DemoTiles
