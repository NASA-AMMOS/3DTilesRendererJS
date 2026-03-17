/**
 * GLTF loader plugin that applies the `CESIUM_RTC` extension, which offsets the scene
 * position by the RTC center defined in the GLTF JSON. Register with a `GLTFLoader`
 * via `loader.register( () => new GLTFCesiumRTCExtension() )`.
 */
export class GLTFCesiumRTCExtension {

	constructor() {

		this.name = 'CESIUM_RTC';

	}

	afterRoot( res ) {

		if ( res.parser.json.extensions && res.parser.json.extensions.CESIUM_RTC ) {

			const { center } = res.parser.json.extensions.CESIUM_RTC;

			if ( center ) {

				res.scene.position.x += center[ 0 ];
				res.scene.position.y += center[ 1 ];
				res.scene.position.z += center[ 2 ];

			}

		}

	}

}
