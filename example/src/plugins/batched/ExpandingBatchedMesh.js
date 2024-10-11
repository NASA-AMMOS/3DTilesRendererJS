import { BatchedMesh, Mesh, Box3, Sphere } from 'three';

const raycastMesh = new Mesh();
const batchIntersects = [];

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

		const needsIndex = Boolean( this.geometry.index );
		const neededIndexCount = Math.max( needsIndex ? geometry.index.count : - 1, reservedIndexRange );
		const neededVertexCount = Math.max( geometry.attributes.position.count, reservedVertexRange );

		let bestId = - 1;
		let bestScore = Infinity;
		this._freeIds.forEach( id => {

			// if indices are not needed then they default to - 1
			const reservedRange = this._reservedRanges[ id ];
			const { indexCount, vertexCount } = reservedRange;
			if ( indexCount >= neededIndexCount && vertexCount >= neededVertexCount ) {

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

				// TODO: should we delete all the ids? Or save them for later?
				_freeIds.forEach( id => {

					this.deleteGeometry( id );

				} );
				_freeIds.length = 0;
				this.optimize();

				try {

					resultId = super.addGeometry( geometry, vertexCount, indexCount );

				} catch {

					const index = this.geometry.index;
					const position = this.geometry.attributes.position;
					const addIndexCount = index ? Math.ceil( expandPercent * index.count ) : - 1;
					const newIndexCount = index ? Math.max( addIndexCount, reservedIndexRange, geometry.index.count ) + index.count : - 1;
					const addVertexCount = Math.ceil( expandPercent * position.count );
					const newVertexCount = Math.max( addVertexCount, reservedVertexRange, geometry.attributes.position.count ) + position.count;

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

		if ( this._drawInfo[ instanceId ].active === false ) {

			return;

		}

		this._freeIds.push( this.getGeometryIdAt( instanceId ) );
		this._currentInstances --;
		return super.deleteInstance( instanceId );

	}

	raycastInstance( instanceId, raycaster, intersects ) {

		const batchGeometry = this.geometry;
		const geometryId = this.getGeometryIdAt( instanceId );

		// initialize the mesh
		raycastMesh.material = this.material;
		raycastMesh.geometry.index = batchGeometry.index;
		raycastMesh.geometry.attributes = batchGeometry.attributes;

		// initialize the geometry
		const drawRange = this.getGeometryRangeAt( geometryId );
		raycastMesh.geometry.setDrawRange( drawRange.start, drawRange.count );
		if ( raycastMesh.geometry.boundingBox === null ) {

			raycastMesh.geometry.boundingBox = new Box3();

		}

		if ( raycastMesh.geometry.boundingSphere === null ) {

			raycastMesh.geometry.boundingSphere = new Sphere();

		}

		// get the intersects
		this.getMatrixAt( instanceId, raycastMesh.matrixWorld ).premultiply( this.matrixWorld );
		this.getBoundingBoxAt( geometryId, raycastMesh.geometry.boundingBox );
		this.getBoundingSphereAt( geometryId, raycastMesh.geometry.boundingSphere );
		raycastMesh.raycast( raycaster, batchIntersects );

		// add batch id to the intersects
		for ( let j = 0, l = batchIntersects.length; j < l; j ++ ) {

			const intersect = batchIntersects[ j ];
			intersect.object = this;
			intersect.batchId = instanceId;
			intersects.push( intersect );

		}

		batchIntersects.length = 0;

	}

}
