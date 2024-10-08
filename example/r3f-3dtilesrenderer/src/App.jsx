// R3F 3DTilesRenderer, controls and attribution imports
import { TilesPlugin, TilesRenderer, EastNorthUpFrame } from '../../../src/r3f/TilesRenderer';
import { EnvironmentControls, GlobeControls} from '../../../src/r3f/CameraControls';
import { TilesAttributionOverlay} from '../../../src/r3f/TilesAttributionOverlay';

// Plugins
import {GLTFExtensionsPlugin} from '../../src/plugins/GLTFExtensionsPlugin'
import {ReorientationPlugin} from '../../src/plugins/ReorientationPlugin'
import { TilesFadePlugin } from '../../src/plugins/fade/TilesFadePlugin';
import { TileCompressionPlugin } from '../../src/plugins/TileCompressionPlugin';
import {DebugTilesPlugin, NONE, SCREEN_ERROR, GEOMETRIC_ERROR, DISTANCE, DEPTH, RELATIVE_DEPTH, IS_LEAF, RANDOM_COLOR, RANDOM_NODE_COLOR, CUSTOM_COLOR, LOAD_ORDER} from '../../../src/three/plugins/DebugTilesPlugin'
// Auth plugins
import {GoogleCloudAuthPlugin } from '../../../src/three/plugins/GoogleCloudAuthPlugin'
import {CesiumIonAuthPlugin } from '../../../src/three/plugins/CesiumIonAuthPlugin'

// R3F, DREI and LEVA imports
import { Canvas } from '@react-three/fiber'
import { 
  useGLTF, 
  CameraControls, 
  Environment, 
  PerspectiveCamera, 
  TransformControls, 
  Grid, 
  GizmoHelper, 
  GizmoViewport
} from '@react-three/drei'
import { useControls, folder } from 'leva'

// Loaders
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";

const THREE_PATH_LIBS = `https://unpkg.com/three@0.169.x/examples/jsm/libs
/examples/jsm/libs`;
const dracoLoader = new DRACOLoader().setDecoderPath("https://www.gstatic.com/draco/v1/decoders/"); // .setDecoderPath( `${THREE_PATH_LIBS}/draco/gltf/` );
const ktx2Loader = new KTX2Loader().setTranscoderPath(`${THREE_PATH_LIBS}/basis/`);


function GoogleTiles( { children, apiToken, ...rest } ) {
  return (
    <TilesRenderer { ...rest }>
      <TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } />
      { children }
    </TilesRenderer>
  );
}

function CesiumIonTiles( { children, apiToken, assetId, ...rest } ) {
  return (
    <TilesRenderer { ...rest }>
      <TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken, assetId, autoRefreshToken : true  } } />
      { children }
    </TilesRenderer>
  );
}

function TilesRenderersDemo({commonPluginsProps, googleApiKey, ionAccessToken, ionAssetId, tilesetPath}) {
  const tilesetUrl = (tilesetPath && tilesetPath.length > 0) ? tilesetPath : URL
  return <>
    {/* Example provided below for different TilesRenderer-s */}
    {/* Default TilesRenderer with provided url */}
    <group rotation-x={ Math.PI / 2 }>
      <TilesRenderer url={ tilesetUrl } lruCache-minSize={ 0 }>
        <CommonPlugins {...commonPluginsProps} />
      </TilesRenderer>
    </group> 

    {/* Google and CesiumIon Tiles Renderers */}
    <TilesAttributionOverlay />
    {/* can pass url, endpointUrl, or nothing which will fallback to google endpointUrl={'https://tile.googleapis.com/v1/3dtiles/root.json'}> */}
    <GoogleTiles apiToken={googleApiKey} >
      <CommonPlugins {...commonPluginsProps} />
    </GoogleTiles>

    <TransformControls mode='translate' >
      <CesiumIonTiles apiToken={ionAccessToken} assetId={ionAssetId}>
        <CommonPlugins 
          {...commonPluginsProps}
          lat={40.70439150614563} 
          lon={-74.00952717236795} 
        />
      </CesiumIonTiles>
    </TransformControls>
  </>
}

function StagingComponent() {
  return <>
    <ambientLight intensity={1} />
    <directionalLight color="white" position={[0, 5, 5]} intensity={1} />
    <Environment
      preset="sunset" background={true}
      backgroundBlurriness={0.9}
      environmentIntensity={1}
    />
    <Grid
      infiniteGrid={ true } cellSize={ 1 } sectionSize={ 10 }
      fadeDistance={ 20000 } fadeStrength={ 50 } 
    />
    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
      <GizmoViewport axisColors={['#9d4b4b', '#2f7f4f', '#3b5b9d']} labelColor="white" />
    </GizmoHelper>

    {/* Controls */}
    {/* 3dtilesrenderer controls */}
    {/* <EnvironmentControls enableDamping={true} /> */}
    {/* <GlobeControls enableDamping={true}  enable={true}  /> // Not working*/}
    {/* r3f camera controls */}
    <CameraControls makeDefault distance={10} polarAngle={Math.PI / 2 - 0.3} azimuthAngle={-0.4} />
    {/* Camera is here to update the far clip plane */}
    <PerspectiveCamera
      // ref={refCamera}
      makeDefault
      near={0.1}
      far={15000}
      fov={60}
    /> 
  </>
}

function SuziModel(props) {
  const { nodes } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf')
  return (
    <mesh castShadow receiveShadow geometry={nodes.Suzanne.geometry} {...props}>
      <meshStandardMaterial color={"#9d4b4b"} {...props.materialProps} />
    </mesh>
  )
}

function Additional3dObjects({commonPluginsProps}) {
  const {lat, lon, fade, debug} = commonPluginsProps
  return <>
    {/* Other standard r3f objects added to scene */}
    {/* either to local frame */}
    <SuziModel position={[0, 0, 0]} />

    {/* or ENUFrame center to provided lat-lon-height */}
    <EastNorthUpFrame
      lat = {lat * Math.PI / 180}
      lon = {lon * Math.PI / 180}
      height = { 100}
      az = {0}
      el = {0}
      roll = {0}
    > 
      <SuziModel position={[0, 0, 2]} rotation-z={Math.PI/2 * 0} rotation-y={- Math.PI/2} scale={1} materialProps={{color:'#0000cc'}} />
    </EastNorthUpFrame>
  </>
}

function CommonPlugins ( props ) {
  return <>
    <TilesPlugin plugin={ GLTFExtensionsPlugin } 
      dracoLoader={dracoLoader}
      ktxLoader={ktx2Loader}
      autoDispose={false}
      // both args and props/options do work to pass loaders
      // args = {{
      //   dracoLoader, ktxLoader:ktx2Loader
      // }}
    />
    {props.lat && props.lon && props.height && 
    <TilesPlugin plugin={ ReorientationPlugin } 
      lat={props.lat * Math.PI / 180}
      lon={props.lon * Math.PI / 180}
      height={props.height}
      up={'+z'}
      recenter={true}
    /> }
    {props.fade && <TilesPlugin plugin={ TilesFadePlugin } fadeDuration={props.fadeDuration || 500} />}
    {props.debug && <TilesPlugin plugin={ DebugTilesPlugin } 
      colorMode={NONE} // NONE, SCREEN_ERROR, GEOMETRIC_ERROR, DISTANCE, DEPTH, RELATIVE_DEPTH, IS_LEAF, RANDOM_COLOR, RANDOM_NODE_COLOR, CUSTOM_COLOR, LOAD_ORDER
      displayBoxBounds={true}
      displayRegionBounds={false}
    />}
    <TilesPlugin plugin={ TileCompressionPlugin } 
      generateNormals={false}
      disableMipmaps={true}
      compressIndex={false}
      // compressNormals={true} normalType={Int8Array}
      // compressUvs={false} uvType={Int8Array}
      // compressPosition={false} positionType={Int16Array}
    />
  </>
}

const URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';


function App() {
  const { debug, fade, lonlat, googleApiKey, ionAccessToken, ionAssetId, tilesetPath } = useControls({ 
    debug: false, 
    fade: true, 
    // lonlat: [12.455084, 41.902149], // Vatican, Roma
    lonlat: [2.2968877321156422, 48.857756887115485], // Paris Eiffel
    'Standard': folder(
      {tilesetPath: ''},
    ),
    'Google 3D Cities': folder(
      {
        googleApiKey: import.meta.env.VITE_GOOGLEAPIKEY
      },
    ),
    CesiumIon: folder(
      {
        ionAccessToken: import.meta.env.VITE_IONACCESSTOKEN,
        ionAssetId: '57587'
      },
    ), // 2684829, 2644092, 2275207, 1415196, 354759, 354307, 96188, 75343, 69380, 57590, 57588, 57587, 43978, 29335, 29332, 29331, 28945
  })

  const commonPluginsProps = {
    lat: lonlat[1], 
    lon: lonlat[0], 
    height: 90, 
    fade: fade, 
    debug: debug, 
  }

  return (
    <div id="canvas-container" style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      margin: 0,
      left: 0,
      top: 0,
    }}>
      <Canvas>
        <StagingComponent />
        <TilesRenderersDemo {...{commonPluginsProps, googleApiKey, ionAccessToken, ionAssetId, tilesetPath}} />
        <Additional3dObjects {...{commonPluginsProps}} />
      </Canvas>
    </div>
  )
}

export default App
