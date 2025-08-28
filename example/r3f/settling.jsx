import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// TilesRenderer, controls and attribution imports
import {
	TilesPlugin,
	TilesRenderer,
	TilesAttributionOverlay,
	GlobeControls,
	CompassGizmo,
	SettledObjects,
	AnimatedSettledObject,
} from '3d-tiles-renderer/r3f';

// Plugins
import {
	CesiumIonAuthPlugin,
	UpdateOnChangePlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
	GLTFExtensionsPlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// R3F, DREI and LEVA imports
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useControls } from 'leva';
import { MathUtils, Vector3 } from 'three';
import { TilesLoadingBar } from './components/TilesLoadingBar.jsx';
import { CameraViewTransition } from './components/CameraViewTransition.jsx';

const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );
const vec1 = new Vector3();
const vec2 = new Vector3();

function Pin( props ) {

	const ref = useRef();
	useFrame( ( { camera } ) => {

		const pin = ref.current;
		let scale;
		if ( camera.isPerspectiveCamera ) {

			vec1.setFromMatrixPosition( camera.matrixWorld );
			vec2.setFromMatrixPosition( pin.matrixWorld );

			const distance = vec1.distanceTo( vec2 );
			scale = 0.05 * distance * Math.atan( camera.fov * MathUtils.DEG2RAD );

		} else {

			scale = ( camera.top - camera.bottom ) * 0.05 / camera.zoom;

		}

		scale = Math.min( Math.max( scale, 100 ), 200000 );
		pin.scale.setScalar( scale * 0.5 );

	} );

	return (
		<AnimatedSettledObject ref={ ref } { ...props }>
			<mesh position-y={ 1.25 } scale={ 0.5 }>
				<sphereGeometry />
				<meshStandardMaterial color={ 0xf44336 } emissive={ 0xf44336 } emissiveIntensity={ 0.25 } />
			</mesh>
			<mesh position-y={ 0.5 } scale={ [ 0.1, 1, 0.1 ] }>
				<cylinderGeometry />
				<meshStandardMaterial color={ 0xf44336 } emissive={ 0xf44336 } emissiveIntensity={ 0.25 } />
			</mesh>
		</AnimatedSettledObject>
	);

}

function App() {

	const levaParams = {
		ortho: false,
	};

	// TODO: the renderer is rerendering due to floating point issues
	// - see if we should trigger an invalidate on tiles plugin add and params change
	// - see if we need to trigger a force update on plugin add for the UpdateOnChange plugin

	const pins = new Array( 500 ).fill().map( ( e, i ) => {

		const lat = - Math.PI / 2 + Math.PI * i / 500;
		const lon = i;

		return <Pin
			key={ i }
			lat={ lat }
			lon={ lon }
			scale={ 0.1 }
		/>;

	} );

	const { ortho } = useControls( levaParams );
	return (
		<Canvas
			frameloop='demand'
			camera={ {
				position: [ 0, 0.5 * 1e7, 1.5 * 1e7 ],
			} }
			style={ {
				width: '100%',
				height: '100%',
				position: 'absolute',
				margin: 0,
				left: 0,
				top: 0,
			} }
			flat
		>
			<color attach="background" args={ [ 0x111111 ] } />

			<TilesRenderer group={ { rotation: [ - Math.PI / 2, 0, 0 ] } }>
				<TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } } />
				<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } />
				<TilesPlugin plugin={ TileCompressionPlugin } />
				<TilesPlugin plugin={ UpdateOnChangePlugin } />
				<TilesPlugin plugin={ TilesFadePlugin } />

				{/* Controls */}
				<GlobeControls enableDamping={ true } />
				<CameraViewTransition mode={ ortho ? 'orthographic' : 'perspective' } />

				{/* Attributions */}
				<TilesAttributionOverlay />

				{/* Add compass gizmo */}
				<CompassGizmo />

				<TilesLoadingBar />

				<SettledObjects>{ pins }</SettledObjects>
			</TilesRenderer>

			{/* other r3f staging */}
			<Environment
				preset="sunset"
				backgroundBlurriness={ 0.9 }
				environmentIntensity={ 1 }
			/>
		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

