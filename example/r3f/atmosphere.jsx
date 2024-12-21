import { StrictMode, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// TilesRenderer, controls and attribution imports
import {
	TilesPlugin,
	TilesRenderer,
	TilesAttributionOverlay,
	GlobeControls,
	CompassGizmo,
	CameraTransition,
} from '3d-tiles-renderer/r3f';

// Plugins
import {
	GoogleCloudAuthPlugin,
	UpdateOnChangePlugin,
	TileCompressionPlugin,
	TilesFadePlugin,
	GLTFExtensionsPlugin,
} from '3d-tiles-renderer/plugins';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// R3F, DREI and LEVA imports
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { MathUtils } from 'three';





import { SMAA, ToneMapping } from '@react-three/postprocessing';
import {
	EffectMaterial,
	ToneMappingMode,
} from 'postprocessing';

import { TileCreasedNormalsPlugin } from '@takram/three-3d-tiles-support';
import {
	AerialPerspective,
	Atmosphere,
	Sky,
	Stars,
} from '@takram/three-atmosphere/r3f';
import { Geodetic, PointOfView, radians } from '@takram/three-geospatial';
import {
	Depth,
	Dithering,
	LensFlare,
	Normal
} from '@takram/three-geospatial-effects/r3f';

import { EffectComposer } from '@react-three/postprocessing';
// import {
// 	useLocalDateControls,
// } from '../helpers/useLocalDateControls';









const dracoLoader = new DRACOLoader().setDecoderPath( 'https://www.gstatic.com/draco/v1/decoders/' );
function App() {

	const levaParams = {
		apiToken: {
			value: localStorage.getItem( 'google-token' ) || 'put-your-api-key-here',
			onChange: ( value ) => localStorage.setItem( 'google-token', value ),
			transient: false,
		},
		ortho: false,
	};

	// TODO: the renderer is rerendering due to floating point issues
	// - see if we should trigger an invalidate on tiles plugin add and params change
	// - see if we need to trigger a force update on plugin add for the UpdateOnChange plugin

	const camera = useThree( ( { camera } ) => camera );
	const atmosphereRef = useRef( null );
	const composerRef = useRef( null );
	useFrame( () => {

		atmosphereRef.current?.updateByDate( Date.now() );

		const composer = composerRef.current;
		if ( composer != null ) {

			composer.passes.forEach( pass => {

				if ( pass.fullscreenMaterial instanceof EffectMaterial ) {

					pass.fullscreenMaterial.adoptCameraSettings( camera );

				}

			} );

		}

	} );

	const { apiToken, ortho } = useControls( levaParams );
	return (
		<>
			<color attach="background" args={ [ 0x111111 ] } />

			<TilesRenderer group={ { rotation: [ - Math.PI / 2, 0, 0 ] } }>
				<TilesPlugin plugin={ GoogleCloudAuthPlugin } args={ { apiToken } } />
				<TilesPlugin plugin={ GLTFExtensionsPlugin } dracoLoader={ dracoLoader } />
				<TilesPlugin plugin={ TileCompressionPlugin } />
				<TilesPlugin plugin={ UpdateOnChangePlugin } />
				<TilesPlugin plugin={ TilesFadePlugin } />

				{/* Controls */}
				<GlobeControls enableDamping={ true } />

				{/* Attributions */}
				<TilesAttributionOverlay />

				{/* Add compass gizmo */}
				<CompassGizmo />
			</TilesRenderer>

			{/* Atmosphere set up */}
			<Atmosphere
				ref={ atmosphereRef }
				textures='https://takram-design-engineering.github.io/three-geospatial/atmosphere'
				correctAltitude={ true }
				photometric={ true }
			>
				{/* Background */}
				<Sky />
				<Stars data='https://takram-design-engineering.github.io/three-geospatial/atmosphere/stars.bin' />

				{/* Atmosphere effects */}
				<EffectComposer ref={ composerRef } multisampling={ 0 }>
					<AerialPerspective
						sunIrradiance={ true }
						skyIrradiance={ true }
						transmittance={ true }
						inscatter={ true }
						correctGeometricError={ true }
						irradianceScale={ 2 / Math.PI }
					/>
					<LensFlare />
					<ToneMapping mode={ ToneMappingMode.AGX } />
					<SMAA />
					<Dithering />
				</EffectComposer>
			</Atmosphere>
			<CameraTransition mode={ ortho ? 'orthographic' : 'perspective' }/>
		</>
	);

}

createRoot( document.getElementById( 'root' ) ).render(
	<StrictMode>
		<Canvas
			frameloop='demand'
			camera={ {
				position: [ 0, 0.5 * 1e7, 1.5 * 1e7 ],
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

