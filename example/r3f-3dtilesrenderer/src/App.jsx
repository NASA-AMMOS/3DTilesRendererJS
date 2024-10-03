
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  useGLTF,
  CameraControls,
  Environment
} from '@react-three/drei'
import { TilesPluginComponent, TilesRendererComponent } from '../../../src/r3f/TilesRendererComponent';

import DemoTiles from './DemoTiles'
import { TilesFadePlugin } from '../../src/plugins/fade/TilesFadePlugin';

// import modelPath from '../public/DamagedHelmet.glb'
// function HelmetModel(props) {
//   const gltf = useGLTF(modelPath)
//   return <primitive {...props} object={gltf.scene} />
// }

function Suzi(props) {
  const { nodes } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf')
  return (
    <mesh castShadow receiveShadow geometry={nodes.Suzanne.geometry} {...props}>
      <meshStandardMaterial color="#9d4b4b" />
    </mesh>
  )
}

const URL = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function App() {

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
        <ambientLight  intensity={2} />
        {/* <directionalLight color="white" position={[0, 5, 5]} intensity={1} /> */}
        <Environment preset="sunset" />
        <CameraControls distance={10} polarAngle={Math.PI / 2 - 0.3} azimuthAngle={-0.4} />
          <Suspense>
            {/* <HelmetModel /> */}
            <Suzi position={[2, 0, 2]} />
          </Suspense>

          {/* <DemoTiles /> */}
					<group rotation-x={ Math.PI / 2 }>
						<TilesRendererComponent url={ URL } lruCache-minSize={ 0 }>
							<TilesPluginComponent plugin={ TilesFadePlugin } fadeDuration={500} />
						</TilesRendererComponent>
					</group>
      </Canvas>
    </div>
  )
}

export default App
