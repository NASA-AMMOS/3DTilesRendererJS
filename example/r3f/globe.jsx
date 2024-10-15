import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// TilesRenderer, controls and attribution imports
import { TilesPlugin, TilesRenderer, TilesAttributionOverlay, GlobeControls, EastNorthUpFrame } from '../../src/r3f/index.jsx';

// Plugins
import { GoogleCloudAuthPlugin } from '../../src/index.js';
import { GLTFExtensionsPlugin } from '../src/plugins/GLTFExtensionsPlugin.js';
import { TilesFadePlugin } from '../src/plugins/fade/TilesFadePlugin.js';
import { TileCompressionPlugin } from '../src/plugins/TileCompressionPlugin.js';
import { UpdateOnChangePlugin } from '../src/plugins/UpdateOnChangePlugin.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// R3F, DREI and LEVA imports
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useControls } from 'leva';
import { MathUtils, Vector3 } from 'three';

const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );
const vec1 = new Vector3();
const vec2 = new Vector3();

function Pointer() {

	const ref = useRef();
	useFrame( ( { camera } ) => {

		const pointer = ref.current;
		vec1.setFromMatrixPosition( camera.matrixWorld );

		pointer.position.set( 0, 0, 0 );
		pointer.updateMatrixWorld();
		vec2.setFromMatrixPosition( pointer.matrixWorld );

		const distance = vec1.distanceTo( vec2 );
		const scale = Math.max( 0.05 * distance, 25 );
		pointer.scale.setScalar( scale );
		pointer.position.z = scale * 0.5;

	} );

	return (
		<mesh ref={ ref } rotation-x={ - Math.PI / 2 } raycast={ () => {} }>
			<coneGeometry args={ [ 0.3 ] } />
			<meshStandardMaterial color={ 0xEC407A } emissive={ 0xEC407A } emissiveIntensity={ 0.25 } />
		</mesh>
	);

}

function App() {

	const levaParams = {
		apiToken: {
			value: localStorage.getItem( 'google-token' ) || 'put-your-api-key-here',
			onChange: ( value ) => localStorage.setItem( 'google-token', value ),
			transient: false,
		}
	};

	const { apiToken } = useControls( levaParams );
	return (
		<Canvas
			camera={ {
				position: [ 0, 4 * 1e7, 1e8 ],
			} }
			style={ {
				width: '100%',
				height: '100%',
				position: 'absolute',
				margin: 0,
				left: 0,
				top: 0,
			} }
			color='red'
		>
			<color attach="background" args={ [ 0x111111 ] } />

			{/*
				3D Tiles renderer tile set
				Use a "key" property to ensure the tiles renderer gets recreated when the api token or asset change
			*/}
			<group rotation-x={ - Math.PI / 2 }>
				<TilesRenderer key={ apiToken }>
					<TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } />
					<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } />
					<TilesPlugin plugin={ TileCompressionPlugin } />
					<TilesPlugin plugin={ UpdateOnChangePlugin } />
					<TilesPlugin plugin={ TilesFadePlugin } />

					{/* Controls */}
					<GlobeControls enableDamping={ true } />

					{/* Attributions */}
					<TilesAttributionOverlay />

					{/* Pointer to NASA JPL */}
					<EastNorthUpFrame lat={ 34.2013 * MathUtils.DEG2RAD } lon={ - 118.1714 * MathUtils.DEG2RAD } height={ 350 }>
						<Pointer />
					</EastNorthUpFrame>;
				</TilesRenderer>
			</group>


			{/* other r3f staging */}
			<Environment
				preset="sunset"
				backgroundBlurriness={ 0.9 }
				environmentIntensity={ 1 }
			/>
			<GizmoHelper alignment="bottom-right">
				<GizmoViewport />
			</GizmoHelper>

		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

