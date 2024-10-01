import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

import R3F3DTilesRenderer from '../../../src/r3f/R3F3DTilesRenderer'
import { TransformControls, Grid, GizmoHelper, GizmoViewport } from "@react-three/drei";

function Simple3dTileset(props) {
  
  return <R3F3DTilesRenderer
    // basisTranscoderPath={
    //   "https://unpkg.com/three@0.160.0/examples/jsm/libs/basis"
    // }
    {...props}
    // resetTransform={props.matrixTransform ? false : true}
    // clippingPlanes={props.clippingPlanes}
  />
}
function TilesComponents() {
  // const { camera } = useThree();
  // useEffect(() => {
  //   camera.up.set(0, 0, 1);
  //   camera.far = 10000;
  // }, []);

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
          path={openDataTilesets.nasa}
          resetTransform= {true}
        />
        {/*<EnvLayer /> */}
      {/* </TransformControls> */}
      {/* </group> */}
    </>
  )
}

export default TilesComponents
