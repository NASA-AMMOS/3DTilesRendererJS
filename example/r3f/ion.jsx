import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// TilesRenderer, controls and attribution imports
import { TilesPlugin, TilesRenderer, TilesAttributionOverlay, EnvironmentControls } from '../../src/r3f/index.jsx';
import { CesiumIonAuthPlugin } from '../../src/index.js';

// Plugins
import { GLTFExtensionsPlugin } from '../src/plugins/GLTFExtensionsPlugin.js';
import { ReorientationPlugin } from '../src/plugins/ReorientationPlugin.js';

// R3F, DREI and LEVA imports
import { Canvas } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { useControls } from 'leva';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );

function App() {

	const levaParams = {
		apiToken: {
			value: localStorage.getItem( 'ion-token' ) || 'put-your-api-key-here',
			onChange: ( value ) => localStorage.setItem( 'ion-token', value ),
			transient: false,
		},
		assetId: {
			value: '40866',
			options: {
				'Aerometrex - San Francisco': '1415196',
				'Aerometrex - Denver': '354307',
				'New York City 3D Buildings': '75343',
				'Melbourne Photogrammetry': '69380',
				'Cesium HQ': '40866',
				'Melbourne Point Cloud': '43978',
				'Montreal Point Cloud': '28945',
			},
		},
	};

	const { apiToken, assetId } = useControls( levaParams );
	return (
		<Canvas
			camera={ {
				position: [ 300, 300, 300 ],
				near: 1,
				far: 1e5,
			} }
			style={ {
				width: '100%',
				height: '100%',
				position: 'absolute',
				margin: 0,
				left: 0,
				top: 0,
			} }
		>
			{/*
				3D Tiles renderer tile set
				Use a "key" property to ensure the tiles renderer gets recreated when the api token or asset change
			*/}
			<TilesRenderer key={ assetId + apiToken }>
				<TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken, assetId, autoRefreshToken: true } } />
				<TilesPlugin plugin={ ReorientationPlugin } />
				<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } autoDispose={ true } />

				<TilesAttributionOverlay />
			</TilesRenderer>

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } />

			{/* other r3f staging */}
			<Environment
				preset="sunset" background={ true }
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

