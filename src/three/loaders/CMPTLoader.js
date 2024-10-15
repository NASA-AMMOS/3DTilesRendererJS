import { Group, DefaultLoadingManager, Matrix4 } from 'three';
import { CMPTLoaderBase } from '../../base/loaders/CMPTLoaderBase.js';
import { B3DMLoader } from './B3DMLoader.js';
import { PNTSLoader } from './PNTSLoader.js';
import { I3DMLoader } from './I3DMLoader.js';
import { WGS84_ELLIPSOID } from '../math/GeoConstants.js';

export class CMPTLoader extends CMPTLoaderBase {

	constructor( manager = DefaultLoadingManager ) {

		super();
		this.manager = manager;
		this.adjustmentTransform = new Matrix4();
		this.ellipsoid = WGS84_ELLIPSOID.clone();

	}

	parse( buffer ) {

		const result = super.parse( buffer );
		const { manager, ellipsoid, adjustmentTransform } = this;
		const promises = [];

		for ( const i in result.tiles ) {

			const { type, buffer } = result.tiles[ i ];
			switch ( type ) {

				case 'b3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new B3DMLoader( manager );
					loader.workingPath = this.workingPath;
					loader.fetchOptions = this.fetchOptions;
					loader.adjustmentTransform.copy( adjustmentTransform );

					const promise = loader.parse( slicedBuffer.buffer );
					promises.push( promise );
					break;

				}

				case 'pnts': {

					const slicedBuffer = buffer.slice();
					const loader = new PNTSLoader( manager );
					loader.workingPath = this.workingPath;
					loader.fetchOptions = this.fetchOptions;

					const promise = loader.parse( slicedBuffer.buffer );
					promises.push( promise );
					break;

				}

				case 'i3dm': {

					const slicedBuffer = buffer.slice();
					const loader = new I3DMLoader( manager );
					loader.workingPath = this.workingPath;
					loader.fetchOptions = this.fetchOptions;

					loader.ellipsoid.copy( ellipsoid );
					loader.adjustmentTransform.copy( adjustmentTransform );

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
