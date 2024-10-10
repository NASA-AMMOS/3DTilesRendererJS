import { BatchedMesh } from 'three';

export class ExpandingBatchedMesh extends BatchedMesh {

	get instanceCount() {

		return this._currentInstances;

	}

	constructor( ...args ) {

		super( ...args );

		this.expandPercent = 0.25;
		this._freeIds = [];
		this._currentInstances = 0;

	}

	findSuitableId( geometry, reservedVertexRange, reservedIndexRange ) {

		const neededIndexCount = Math.max( geometry.index ? geometry.index.count : - 1, reservedIndexRange );
		const neededVertexCount = Math.max( geometry.attributes.position.count, reservedVertexRange );

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

		const { indexCount, vertexCount, expandPercent, _freeIds } = this;

		let resultId = this.findSuitableId( geometry, reservedVertexRange, reservedIndexRange );
		if ( resultId !== - 1 ) {

			this.setGeometryAt( resultId, geometry );
			_freeIds.splice( _freeIds.indexOf( resultId ), 1 );

		} else {

			try {

				resultId = super.addGeometry( geometry, vertexCount, indexCount );

			} catch {

				try {

					// TODO: should we delete all the ids? Or save them for later?
					_freeIds.forEach( id => this.deleteGeometry( id ) );
					_freeIds.length = 0;

					// TODO: optimize is breaking this?
					this.optimize();
					resultId = super.addGeometry( geometry, vertexCount, indexCount );

				} catch {

					const index = this.geometry.index;
					const position = this.geometry.attributes.position;
					const addIndexCount = index ? Math.ceil( expandPercent * index.count ) : - 1;
					const newIndexCount = index ? Math.max( addIndexCount, reservedIndexRange, geometry.index.count ) + index.count + 1 : - 1;
					const addVertexCount = Math.ceil( expandPercent * position.count );
					const newVertexCount = Math.max( addVertexCount, reservedVertexRange, geometry.attributes.position.count ) + position.count + 1;

					this.setGeometrySize( newVertexCount, newIndexCount );
					resultId = super.addGeometry( geometry, vertexCount, indexCount );

				}

			}

		}

		return resultId;

	}

	addInstance( geometryId ) {

		if ( this.maxInstanceCount === this._currentInstances ) {

			const newCount = Math.ceil( this.maxInstanceCount * ( 1 + this.expandPercent ) );
			this.setInstanceCount( newCount );

		}

		this._currentInstances ++;
		return super.addInstance( geometryId );

	}

	deleteInstance( instanceId ) {

		super.deleteInstance( instanceId );
		this._freeIds.push( instanceId );
		this._currentInstances --;

	}

}
