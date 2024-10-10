import { BatchedMesh } from 'three';

export class ExpandingBatchedMesh extends BatchedMesh {

	constructor( ...args ) {

		super( ...args );

		this.expandPercent = 0.25;
		this._freeIds = [];
		this._currentInstances = 0;

	}

	findSuitableId( geometry, reservedVertexRange, reservedIndexRange ) {

		const neededIndexCount = Math.max( geometry.index ? geometry.index.count : - 1, reservedIndexRange );
		const neededVertexCount = Math.max( geometry.position.count, reservedVertexRange );

		let bestId = - 1;
		let bestScore = Infinity;
		this._freeIds.forEach( id => {

			const reservedRange = this._reservedRanges[ id ];
			const { indexCount, vertexCount } = reservedRange;

			if ( indexCount > neededIndexCount && vertexCount > neededVertexCount ) {

				const score = ( neededIndexCount - indexCount ) + ( neededVertexCount - vertexCount );
				if ( score < bestScore ) {

					bestId = id;
					bestScore = score;

				}

			}

		} );

		return bestId;

	}

	addGeometry( geometry, reservedVertexRange, reservedIndexRange ) {

		const { indexCount, vertexCount, expandPercent, mesh, _freeIds } = this;
		const batchGeometry = mesh.geometry;

		let resultId = this.findSuitableId( geometry, reservedVertexRange, reservedIndexRange );
		if ( resultId !== - 1 ) {

			batchGeometry.setGeometryAt( resultId, geometry );
			_freeIds.splice( _freeIds.indexOf( resultId ), 1 );

		} else {

			try {

				resultId = batchGeometry.addGeometry( geometry, vertexCount, indexCount );

			} catch {

				try {

					// TODO: should we delete all the ids? Or save them for later?
					_freeIds.forEach( id => batchGeometry.deleteGeometry( id ) );
					_freeIds.length = 0;

					batchGeometry.optimize();
					resultId = batchGeometry.addGeometry( geometry, vertexCount, indexCount );

				} catch {

					const index = geometry.index;
					const position = geometry.attributes.position;
					const addIndexCount = index ? Math.ceil( expandPercent * index.count ) : - 1;
					const newIndexCount = index ? Math.max( addIndexCount, reservedIndexRange ) + index.count : - 1;
					const addVertexCount = Math.ceil( expandPercent * position.count );
					const newVertexCount = Math.max( addVertexCount, reservedVertexRange ) + position.count;

					batchGeometry.setGeometrySize( newVertexCount, newIndexCount );
					resultId = batchGeometry.addGeometry( geometry, vertexCount, indexCount );

				}

			}

		}

		return resultId;

	}

	addInstance( geometryId ) {

		if ( this.maxInstanceCount >= this._currentInstances ) {

			const newCount = Math.ceil( this.maxInstanceCount * this.expandPercent );
			this.setInstanceCount( newCount );

		}

		super.addInstance( geometryId );

	}

}