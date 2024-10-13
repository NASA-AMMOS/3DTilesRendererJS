import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '../../src/r3f/index';
import { TilesFadePlugin } from '../src/plugins/fade/TilesFadePlugin';

// R3F + DREI
import { Canvas } from '@react-three/fiber';
import {
	Environment,
	Grid,
	GizmoHelper,
	GizmoViewport
} from '@react-three/drei';

const tilesetUrl = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';

function App() {

	return (
		<div id="canvas-container" style={ {
			width: '100%',
			height: '100%',
			position: 'absolute',
			margin: 0,
			left: 0,
			top: 0,
		} }>
			<Canvas>
				{/* 3D Tiles renderer tileset */}
				<group rotation-x={ Math.PI / 2 }>
					<TilesRenderer url={ tilesetUrl } lruCache-minSize={ 0 }>
						<TilesPlugin plugin={ TilesFadePlugin } fadeDuration={ 500 } />
					</TilesRenderer>
				</group>

				{/* add mesh to local frame */}
				<mesh position={ [ 0, 2, 0 ] }>
					<boxGeometry />
					<meshStandardMaterial />
				</mesh>

				{/* Controls */}
				<EnvironmentControls enableDamping={ true } />

				{/* other r3f staging */}
				<Environment
					preset="sunset" background={ true }
					backgroundBlurriness={ 0.9 }
					environmentIntensity={ 1 }
				/>
				<Grid
					infiniteGrid={ true } cellSize={ 1 } sectionSize={ 10 }
					fadeDistance={ 20000 } fadeStrength={ 50 }
				/>
				<GizmoHelper alignment="bottom-right" margin={ [ 80, 80 ] }>
					<GizmoViewport axisColors={ [ '#9d4b4b', '#2f7f4f', '#3b5b9d' ] } labelColor="white" />
				</GizmoHelper>

			</Canvas>
		</div>
	);

}

export default App;


createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);

