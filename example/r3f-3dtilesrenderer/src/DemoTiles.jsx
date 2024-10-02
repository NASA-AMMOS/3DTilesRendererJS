import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import {computeTransformToLocalYup, computeTransformToLocalZup} from './utils'
import {Vector3} from "three";

import R3F3DTilesRenderer from '../../../src/r3f/R3F3DTilesRenderer'
import {TilesRendererType} from '../../../src/r3f/R3F3DTilesRenderer'

import { TransformControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { useControls, folder } from 'leva'


function Simple3dTileset(props) {

  const matrixTransform = computeTransformToLocalYup (
    new Vector3(288807, 4642039, 100),
    '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs +type=crs',  // EPSG:32633 UTM 33N Roma
    '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs'        // EPSG:4978 metric
  )

  const { debug, tilesRendererType, latlon, googleApiKey, ionAccessToken, ionAssetId, resetTransform, tilesetPath } = useControls({ 
    debug: true,
    tilesRendererType: {
      value: TilesRendererType.Standard, 
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
        ionAssetId: {
          value: 14151960,
          min: 0,
          max: 10e6,
          step: 1,
        }
      }, 
      { render: (get) => get('tilesRendererType') == TilesRendererType.CesiumIon }
    ), // 2684829, 2644092, 2275207, 1415196, 354759, 354307, 96188, 75343, 69380, 57590, 57588, 57587, 43978, 29335, 29332, 29331, 28945
    resetTransform: true,
  })
  console.log('googleApiKey', latlon, resetTransform, tilesetPath)
  
  return <R3F3DTilesRenderer
    {...props}
    type={tilesRendererType}
    debug={debug}
    
    // resetTransform={resetTransform}
    resetTransform={false}
    matrixTransform={matrixTransform}
    
    path={tilesetPath}
    // path={openDataTilesets.iconem_int_merged_473M}
    googleApiKey={googleApiKey}
    ionAssetId={ionAssetId}
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
