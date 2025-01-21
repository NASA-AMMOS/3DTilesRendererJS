import { StrictMode, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// TilesRenderer, controls and attribution imports
import {
	TilesPlugin,
	TilesRenderer,
	TilesAttributionOverlay,
	GlobeControls,
	CompassGizmo,
	CameraTransition,
	TilesRendererContext,
} from '3d-tiles-renderer/r3f';

// Plugins
import {
	CesiumIonAuthPlugin,
	UpdateOnChangePlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
	GLTFExtensionsPlugin,
	UnloadTilesPlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// R3F, DREI and LEVA imports
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { MathUtils, Matrix4 } from 'three';

// Postprocessing
import { EffectComposer, SMAA, ToneMapping } from '@react-three/postprocessing';
import { EffectMaterial, ToneMappingMode } from 'postprocessing';

// Atmosphere
import {
	AerialPerspective,
	Atmosphere,
	Sky,
	Stars,
} from '@takram/three-atmosphere/r3f';
import { Dithering, LensFlare, } from '@takram/three-geospatial-effects/r3f';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TilesLoadingBar } from './components/TilesLoadingBar.jsx';

// Plugin to generate creased normals for the tiles
class TileCreasedNormalsPlugin {

	processTileModel( scene ) {

		scene.traverse( c => {

			if ( c.geometry ) {

				c.geometry = toCreasedNormals( c.geometry, MathUtils.degToRad( 30 ) );

			}

		} );

	}

}

const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );
function App() {

	const levaParams = {
		ortho: false,
	};

	const { ortho } = useControls( levaParams );
	return (
		<>
			<TilesRenderer ref={ tiles => window.TILES = tiles }>
				<TilesPlugin plugin={ CesiumIonAuthPlugin } args={ { apiToken: import.meta.env.VITE_ION_KEY, assetId: '2275207', autoRefreshToken: true } } />
				<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } />
				<TilesPlugin plugin={ TileCompressionPlugin } />
				<TilesPlugin plugin={ UpdateOnChangePlugin } />
				<TilesPlugin plugin={ UnloadTilesPlugin } />
				<TilesPlugin plugin={ TilesFadePlugin } />
				<TilesPlugin plugin={ TileCreasedNormalsPlugin } />

				{/* Controls */}
				<GlobeControls enableDamping={ true } />

				{/* Attributions */}
				<TilesAttributionOverlay />

				{/* Add compass gizmo */}
				<CompassGizmo overrideRenderLoop={ false } />

				<TilesLoadingBar />
				<GlobeTilesAtmosphere />
			</TilesRenderer>

			<CameraTransition mode={ ortho ? 'orthographic' : 'perspective' }/>
		</>
	);

}

function GlobeTilesAtmosphere() {

	const tiles = useContext( TilesRendererContext );
	const camera = useThree( ( { camera } ) => camera );
	const gl = useThree( ( { gl } ) => gl );
	gl.toneMappingExposure = 10;

	const atmosphereRef = useRef( null );
	const composerRef = useRef( null );
	const matrix = new Matrix4();
	useFrame( () => {

		// assign the orientation
		const atmosphere = atmosphereRef.current;
		if ( atmosphere != null && tiles ) {

			matrix.copy( tiles.group.matrixWorld ).setPosition( 0, 0, 0 );

			atmosphere.updateByDate( Date.now() );
			atmosphere.ellipsoidMatrix.copy( matrix );
			atmosphere.ellipsoidCenter.setFromMatrixPosition( tiles.group.matrixWorld ).applyMatrix4( matrix.invert() );

		}

		// update the camera settings for the atmosphere
		const composer = composerRef.current;
		if ( composer != null ) {

			composer.passes.forEach( pass => {

				if ( pass.fullscreenMaterial instanceof EffectMaterial ) {

					pass.fullscreenMaterial.adoptCameraSettings( camera );

				}

			} );

		}

	} );

	return (
		<>
			{/* Atmosphere set up */}
			<Atmosphere
				ref={ atmosphereRef }
				textures='https://takram-design-engineering.github.io/three-geospatial/atmosphere'
			>
				{/* Background */}
				<Sky />
				<Stars data='https://takram-design-engineering.github.io/three-geospatial/atmosphere/stars.bin' />

				{/* Atmosphere effects */}
				<EffectComposer ref={ composerRef } multisampling={ 0 } enableNormalPass>
					<AerialPerspective sunIrradiance skyIrradiance irradianceScale={ 2 / Math.PI } />
					<LensFlare />
					<ToneMapping mode={ ToneMappingMode.AGX } />
					<SMAA />
					<Dithering />
				</EffectComposer>
			</Atmosphere>
		</>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<Canvas
			frameloop='demand'
			camera={ {
				position: [ 0, 1.5 * 1e7, 0 ],
				rotation: [ - Math.PI / 2, 0, Math.PI ],
			} }
			style={ {
				width: '100%',
				height: '100%',
				position: 'absolute',
				margin: 0,
				left: 0,
				top: 0,
			} }
			flat
		>
			<App />
		</Canvas>
	</StrictMode>,
);

