
export default class GLTFCesiumRTCExtension {

	constructor() {

		this.name = 'CESIUM_RTC';

	}

	afterRoot( res ) {

		const { center } = res.parser.json.extensions.CESIUM_RTC;
		res.scene.position.x += center[ 0 ];
		res.scene.position.y += center[ 1 ];
		res.scene.position.z += center[ 2 ];

	}

}
