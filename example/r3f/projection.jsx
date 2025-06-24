import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin, ImageOverlayPlugin, CesiumIonOverlay } from '3d-tiles-renderer/plugins';
import { Box3, Matrix4, Vector3 } from 'three';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function OverlayPlugin() {

	const overlay = useMemo( () => {

		const mat = new Matrix4();
		mat.makeScale( 5, 5, 5 );//.setPosition( 2, 2, 0 );

		return new CesiumIonOverlay( {
			frame: mat,
			assetId: '3954',
			apiToken: import.meta.env.VITE_ION_KEY,
		} );

	}, [] );

	// TODO: try this without the getter again - causes a resize error
	const gl = useThree( state => state.gl );

	return (
		<TilesPlugin plugin={ ImageOverlayPlugin } args={ [ {
			overlays: [ overlay ],
			renderer: gl,
		} ] } />
	);

}

function App() {


	return (
		<Canvas
			camera={ {
				position: [ 12, 7.5, 12 ],
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
			<color attach="background" args={ [ 0x222222 ] } />

			{/* 3D Tiles renderer tileset */}
			<group rotation-x={ Math.PI / 2 }>
				<TilesRenderer url={ tilesetUrl } maxDepth={ 10 }>
					<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={ 500 } />
					<OverlayPlugin />
				</TilesRenderer>

				<box3Helper scale-z={ 100 } args={ [
					new Box3(
						new Vector3( - 1, - 1, - 5 ),
						new Vector3( 1, 1, 5 ),
					)
				] }
				raycast={ () => {} }
				/>

				<axesHelper
					scale={ 10 }
					position={ [ 2, 2, - 5 ] }
					raycast={ () => {} }
				/>
			</group>

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } maxDistance={ 50 } minDistance={ 1 } cameraRadius={ 0 } />

		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

