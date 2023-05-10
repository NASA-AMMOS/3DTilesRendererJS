import { FeatureTable } from './FeatureTable.js';

const DRACO_ATTRIBUTE_MAP = {
	RGB: 'color',
	POSITION: 'position',
};

export class PNTSFeatureTable extends FeatureTable {

	constructor( buffer, start, headerLength, binLength ) {

		super( buffer, start, headerLength, binLength );

	}

	setDracoLoader( dracoLoader ) {

		this.dracoLoader = dracoLoader;

	}

	getKeys() {

		return Object.keys( this.header );

	}

	async getDracoEncodedGeometry() {

		if ( ! this.dracoLoader ) {

			throw new Error( 'FeatureTable: unable to decode buffer, dracoLoader undefined' );

		}

		const dracoIDs = this.header.extensions[ '3DTILES_draco_point_compression' ].properties;
		const attributeIDs = {};

		for ( const [ key, value ] of Object.entries( dracoIDs ) ) {

			const dracoAttributeKey = DRACO_ATTRIBUTE_MAP[ key ];

			if ( ! dracoAttributeKey ) continue;

			attributeIDs[ DRACO_ATTRIBUTE_MAP[ key ] ] = value;

		}

		if ( Object.keys( attributeIDs ).length === 0 ) {

			throw new Error( 'FeatureTable: no valid Draco attribute keys present' );

		}

		const taskConfig = {
			attributeIDs,
			attributeTypes: {
				position: 'Float32Array',
				color: 'Uint8Array',
			},
			useUniqueIDs: true,
		};


		const { buffer, binOffset } = this;

		const { byteOffset, byteLength } = this.header.extensions[ '3DTILES_draco_point_compression' ];

		const dracoBuffer = buffer.slice( binOffset + byteOffset, binOffset + byteOffset + byteLength );

		return await this.dracoLoader.decodeGeometry( dracoBuffer, taskConfig );

	}

	isDracoEncoded() {

		const { extensions } = this.header;
		return extensions && !! extensions[ '3DTILES_draco_point_compression' ];

	}

}
