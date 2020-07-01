import { Group } from 'three';
import { CMPTLoaderBase } from '../base/CMPTLoaderBase.js';
import { B3DMLoader } from './B3DMLoader.js';

export class CMPTLoader extends CMPTLoaderBase {

	constructor( manager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		const manager = this.manager;
		const result = super.parse( buffer );
		const group = new Group();
		const results = [];
		const promises = [];

		console.log( result, buffer.byteLength );
		for ( const i in result.tiles ) {

			const { type, buffer } = result.tiles[ i ];
			switch ( type ) {
				case 'b3dm':

					const slicedBuffer = buffer.slice();
					console.log( slicedBuffer.buffer.byteLength, buffer.buffer.byteLength );

					const blob = URL.createObjectURL( new Blob( [ slicedBuffer ] ) );
					const promise =
						new B3DMLoader( manager ).parse( buffer.slice().buffer );

					promise.then( res => {

						results.push( res );
						group.add( res.scene );

					} );
					break;
				case 'i3dm':
				case 'pnts':
				default:
			}

		}

		return Promise.all( promises ).then( () => {

			return {

				tiles: results,
				scene: group,

			};

		} );

	}

}
