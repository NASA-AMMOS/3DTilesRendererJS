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
