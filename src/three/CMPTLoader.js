import { Group, DefaultLoadingManager } from 'three';
import { CMPTLoaderBase } from '../base/CMPTLoaderBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { PNTSLoader } from './PNTSLoader.js';
import { I3DMLoader } from './I3DMLoader.js';

export class CMPTLoader extends CMPTLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;

	}

	parse( buffer ) {

		const result = super.parse( buffer );
		const manager = this.manager;
		const promises = [];

		for ( const i in result.tiles ) {

			const { type, buffer } = result.tiles[ i ];
			switch ( type ) {

				case 'b3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new B3DMLoader( manager );
					loader.workingPath = this.workingPath;
					loader.fetchOptions = this.fetchOptions;

					const promise = loader.parse( slicedBuffer.buffer );
					promises.push( promise );
					break;

				}

				case 'pnts': {

					const slicedBuffer = buffer.slice();
					const pointsResult = new PNTSLoader( manager ).parse( slicedBuffer.buffer );
					const promise = Promise.resolve( pointsResult );
					promises.push( promise );
					break;

				}

				case 'i3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new I3DMLoader( manager );
					loader.workingPath = this.workingPath;
					loader.fetchOptions = this.fetchOptions;

					const promise = loader.parse( slicedBuffer.buffer );
					promises.push( promise );
					break;

				}

			}

		}

		return Promise.all( promises ).then( results => {

			const group = new Group();
			results.forEach( result => {

				group.add( result.scene );

			} );

			return {

				tiles: results,
				scene: group,

			};

		} );

	}

}
