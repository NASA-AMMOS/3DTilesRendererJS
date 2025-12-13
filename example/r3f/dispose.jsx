import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { TilesPlugin, TilesRenderer, EnvironmentControls } from '3d-tiles-renderer/r3f';
import { TilesFadePlugin } from '3d-tiles-renderer/plugins';
import { TopoLinesPlugin } from '../three/src/plugins/topolines/TopoLinesPlugin.js';
import { TopoLineScaleWidget } from './components/TopoLineScaleWidget.jsx';
import { useControls } from 'leva';

const tilesetUrl1 = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json';
const tilesetUrl2 = 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_sky/0528_0260184_to_s64o256_sky_tileset.json';

const Tiles = () => {

	const { tileset } = useControls( {
		tileset: {
			value: tilesetUrl1,
			options: {
				'Dingo Gap': tilesetUrl1,
				'Sky View': tilesetUrl2,
			},
		},
	} );

	return <group rotation-x={ Math.PI / 2 }>
		<TilesRenderer url={ tileset }>
			<TilesPlugin plugin={ TilesFadePlugin } />
			<TilesPlugin plugin={ TopoLinesPlugin } args={ { topoLimit: [ 0.01, 1e10 ] } } />

			{/* Widget for displaying topo lines */}
			<TopoLineScaleWidget invert />

		</TilesRenderer>
	</group>;

};

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

			<Tiles />

			{/* Controls */}
			<EnvironmentControls enableDamping={ true } maxDistance={ 500 } minDistance={ 1 } cameraRadius={ 0.5 } />
		</Canvas>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
