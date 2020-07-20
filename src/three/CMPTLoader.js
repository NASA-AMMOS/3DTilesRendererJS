import { Group } from 'three';
import { CMPTLoaderBase } from '../base/CMPTLoaderBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { PNTSLoader } from './PNTSLoader.js';

export class CMPTLoader extends CMPTLoaderBase {

	constructor( manager ) {

		super();
		this.manager = manager;
		this.ktx2Loader = null;
		this.dracoLoader = null;
		this.ddsLoader = null;

	}
	
	setKTX2Loader( loader ) {

		this.ktx2Loader = loader;

	}
	
	setDracoLoader( loader ) {

		this.dracoLoader = loader;

	}
	
	setDDSLoader( loader ) {

		this.ddsLoader = loader;

	}

	parse( buffer ) {

		const result = super.parse( buffer );
		const manager = this.manager;
		const group = new Group();
		const results = [];
		const promises = [];

		for ( const i in result.tiles ) {

			const { type, buffer } = result.tiles[ i ];
			switch ( type ) {

				case 'b3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new B3DMLoader( manager );
					loader.setKTX2Loader( this.ktx2Loader );
					loader.setDracoLoader( this.dracoLoader );
					loader.setDDSLoader( this.ddsLoader );

					const promise = loader
						.parse( slicedBuffer.buffer )
						.then( res => {

							results.push( res );
							group.add( res.scene );

						} );

					promises.push(promise);
					break;

				}

				case 'pnts': {

					const slicedBuffer = buffer.slice();
					const pointsResult = new PNTSLoader( manager ).parse( slicedBuffer.buffer );
					results.push( pointsResult );
					group.add( pointsResult.scene );
					break;

				}

				case 'i3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new I3DMLoader( manager );
					loader.setKTX2Loader( this.ktx2Loader );
					loader.setDracoLoader( this.dracoLoader );
					loader.setDDSLoader( this.ddsLoader );
					
					const promise = loader
						.parse( slicedBuffer.buffer )
						.then( res => {

							results.push( res );
							group.add( res.scene );

						} );
					promises.push(promise);
					break;

				}

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
