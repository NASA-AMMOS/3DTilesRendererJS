import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin, CesiumIonOverlay } from '3d-tiles-renderer/plugins';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { PivotControls } from '@react-three/drei';
import { ImageOverlay, ImageOverlayPlugin } from './plugins/ImageOverlayPlugin.jsx';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function App() {

	const worldMatrix = useMemo( () => {

		const scale = new Vector3().set( 40, 40, 1 );
		const position = new Vector3( - scale.x, 5, scale.y * 0.5 );
		const rotation = new Euler( - Math.PI / 2 );
		const quaternion = new Quaternion().setFromEuler( rotation );
		return new Matrix4().compose( position, quaternion, scale );

	}, [] );

	return (
		<Canvas
			frameloop='demand'
			camera={ {
				position: [ 0, 40, 35 ],
			} }
			style={ {
				width: '100%',
				height: '100%',
				position: 'absolute',
				margin: 0,
				left: 0,
				top: 0,
			} }
			onContextMenu={ e => {

				// disable the context menu click for pivot controls
				e.preventDefault();

			} }
		>
			<color attach="background" args={ [ 0x222222 ] } />

			{/* 3D Tiles renderer tileset */}
			<group rotation-x={ Math.PI / 2 }>
				<TilesRenderer url={ tilesetUrl }>
					<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={ 500 } />
					<ImageOverlayPlugin>
						<ImageOverlay
							type={ CesiumIonOverlay }
							assetId='3954'
							apiToken={ import.meta.env.VITE_ION_KEY }
							worldFrame={ worldMatrix }
						/>
					</ImageOverlayPlugin>
				</TilesRenderer>
			</group>

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } maxDistance={ 300 } minDistance={ 1 } cameraRadius={ 0 } />
			<PivotControls scale={ 150 } matrix={ worldMatrix } fixed />

		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

