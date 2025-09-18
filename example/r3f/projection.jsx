import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin, EnforceNonZeroErrorPlugin, GeoJSONOverlay } from '3d-tiles-renderer/plugins';
import { BoxGeometry, EdgesGeometry, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { PivotControls } from '@react-three/drei';
import { ImageOverlay, ImageOverlayPlugin } from './plugins/ImageOverlayPlugin.jsx';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

// construct a shape via geojson
const shape = [];
for ( let i = 0; i < 100; i ++ ) {

	const x = Math.sin( Math.PI * 2 * i / 100 );
	const y = Math.cos( Math.PI * 2 * i / 100 );
	const len = Math.sin( 10 * 2 * Math.PI * i / 100 ) * 10 + 75;

	shape.push( [ x * len, y * len ] );

}

const geojson = {
	type: 'Feature',
	geometry: {
		type: 'Polygon',
		coordinates: [ shape ],
	},
};

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
		boxGeometry.translate( 0.5, 0.5, 0.5 );

		const edgesGeometry = new EdgesGeometry( boxGeometry );
		const linesGeometry = new LineSegmentsGeometry().fromEdgesGeometry( edgesGeometry );
		const lines = new LineSegments2( linesGeometry );
		lines.material.color.set( 0xffff00 );
		lines.material.linewidth = 2;
		return lines;

	}, [] );

	const worldToProjectionMatrix = useMemo( () => {

		return new Matrix4();

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
			worldToProjectionMatrix.copy( transformRoot.matrixWorld ).invert();

		}

	} );

	return (
		<>
			<color attach="background" args={ [ 0x222222 ] } />

			{/* 3D Tiles renderer tileset */}
			<group rotation-x={ Math.PI / 2 }>
				<TilesRenderer url={ tilesetUrl } errorTarget={ 6 }>
					<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={ 500 } />
					<ImageOverlayPlugin>
						<ImageOverlay
							type={ GeoJSONOverlay }
							geojson={ geojson }
							color={ 'red' }
							strokeWidth={ 10 }
							fillStyle={ 'rgba( 255, 255, 255, 0.25 )' }
							worldToProjection={ worldToProjectionMatrix }
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
					<primitive object={ boxMesh } />
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

