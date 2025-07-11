import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin, CesiumIonOverlay, EnforceNonZeroErrorPlugin } from '3d-tiles-renderer/plugins';
import { BoxGeometry, EdgesGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { PivotControls } from '@react-three/drei';
import { ImageOverlay, ImageOverlayPlugin } from './plugins/ImageOverlayPlugin.jsx';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function Scene() {

	const [ transformRoot, setTransformRoot ] = useState( null );
	const [ overlay, setOverlay ] = useState( null );

	const worldMatrix = useMemo( () => {

		const scale = new Vector3().set( 40, 40, 20 );
		const position = new Vector3( - scale.x, 10, scale.y * 0.25 );
		const rotation = new Euler( - Math.PI / 2 );
		const quaternion = new Quaternion().setFromEuler( rotation );
		return new Matrix4().compose( position, quaternion, scale );

	}, [] );

	const boxMesh = useMemo( () => {

		const boxGeometry = new BoxGeometry();
		const edgesGeometry = new EdgesGeometry( boxGeometry );
		const linesGeometry = new LineSegmentsGeometry().fromEdgesGeometry( edgesGeometry );
		const lines = new LineSegments2( linesGeometry );
		lines.material.color.set( 0xffff00 );
		lines.material.linewidth = 2;
		return lines;

	}, [] );

	useEffect( () => {

		return () => {

			boxMesh.geometry.dispose();
			boxMesh.material.dispose();

		};

	}, [ boxMesh ] );

	useFrame( () => {

		if ( overlay && boxMesh ) {

			boxMesh.scale.x = overlay.aspectRatio;
			boxMesh.position.x = overlay.aspectRatio / 2;

		}

	} );

	return (
		<>
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
							worldFrame={ transformRoot ? transformRoot.matrixWorld : null }
							ref={ setOverlay }
						/>
					</ImageOverlayPlugin>
					<TilesPlugin plugin={ EnforceNonZeroErrorPlugin } />
				</TilesRenderer>
			</group>

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } maxDistance={ 1000 } minDistance={ 1 } cameraRadius={ 0 } />
			<PivotControls scale={ 150 } matrix={ worldMatrix } fixed>
				<group ref={ setTransformRoot } position-z={ - 1 }>
					<primitive object={ boxMesh } position={ [ 0.5, 0.5, 0.5 ] } />
				</group>
			</PivotControls>
		</>
	);

}

function App() {

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
			<Scene />
		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

