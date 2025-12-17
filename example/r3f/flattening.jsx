import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { TilesPlugin, TilesRenderer, EnvironmentControls, EastNorthUpFrame } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin, GLTFExtensionsPlugin, ReorientationPlugin, CesiumIonAuthPlugin, UpdateOnChangePlugin } from '3d-tiles-renderer/plugins';
import { TileFlatteningPlugin, TileFlatteningShape } from './plugins/TileFlatteningPlugin.jsx';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
	MathUtils,
} from 'three';

const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );

const LAT = 35.3606 * MathUtils.DEG2RAD;
const LON = 138.7274 * MathUtils.DEG2RAD;
function App() {

	return (
		<Canvas
			camera={ {
				position: [ 1e4 * 0.7, 1e4 * 0.7, 1e4 * 0.7 ],
				far: 1600000
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
			{/* 3D Tiles renderer tileset */}
			<TilesRenderer group={ { rotation: [ - Math.PI / 2, 0, 0 ] } }>
				<TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } } />
				<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } />
				<TilesPlugin plugin={ UpdateOnChangePlugin } />
				<TilesPlugin plugin={ TilesFadePlugin } />
				<TilesPlugin plugin={ ReorientationPlugin } args={ { lat: LAT, lon: LON } } />
				<TileFlatteningPlugin>
					<TileFlatteningShape relativeToEllipsoid visible={ false }>
						<EastNorthUpFrame lat={ LAT } lon={ LON } height={ 1000 }>
							<mesh scale={ 5000 }>
								<circleGeometry />
							</mesh>
						</EastNorthUpFrame>
					</TileFlatteningShape>
				</TileFlatteningPlugin>

			</TilesRenderer>

			{/* Controls */}
			<EnvironmentControls
				enableDamping={ true }
				maxDistance={ 1e4 * 2 }
				minDistance={ 500 }
				minPolarAngle={ 0 }
				maxPolarAngle={ 3 * Math.PI / 8 }
			/>

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

