
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  useGLTF, 
  CameraControls, 
  Environment
} from '@react-three/drei'

import TilesComponents from './TilesComponents'

import modelPath from '../public/DamagedHelmet.glb'
function HelmetModel(props) {
  const gltf = useGLTF(modelPath)
  return <primitive {...props} object={gltf.scene} />
}

function Suzi(props) {
  const { nodes } = useGLTF('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/suzanne-high-poly/model.gltf')
  return (
    <mesh castShadow receiveShadow geometry={nodes.Suzanne.geometry} {...props}>
      <meshStandardMaterial color="#9d4b4b" />
    </mesh>
  )
}



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
        <ambientLight />
        <directionalLight color="white" position={[0, 5, 5]} intensity={10} />
        <Environment preset="sunset" />
        <CameraControls distance={2}/>
          <Suspense>
            <HelmetModel />
          </Suspense>
          <Suspense>
            <Suzi position={[2, 0, 2]} />
          </Suspense>
          
          <TilesComponents />
      </Canvas>
    </div>
  )
}

export default App
