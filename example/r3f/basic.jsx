import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, GizmoHelper, GizmoViewport, MeshTransmissionMaterial } from '@react-three/drei';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin } from '../src/plugins/fade/TilesFadePlugin.js';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function RotatingMesh( props ) {

	const ref = useRef();

	useFrame( () => {

		const mesh = ref.current;
		mesh.rotation.x = Math.sin( window.performance.now() * 0.0005 ) * 2;
		mesh.rotation.y = Math.cos( window.performance.now() * 0.0015 );

	} );

	return <mesh { ...props } ref={ ref }>
		<icosahedronGeometry />
		<MeshTransmissionMaterial thickness={ 1.5 } chromaticAberration={ 0.25 } color={ 0x80DEEA } />
	</mesh>;

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
			{/* 3D Tiles renderer tileset */}
			<group rotation-x={ Math.PI / 2 }>
				<TilesRenderer url={ tilesetUrl }>
					<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={ 500 } />

					{/* add mesh to local frame of the tile set*/}
					<RotatingMesh position={ [ 0, - 4, - 4 ] } scale={ 2 } />

				</TilesRenderer>
			</group>

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } maxDistance={ 50 } />

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

