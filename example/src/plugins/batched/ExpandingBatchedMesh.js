import { BatchedMesh, Mesh, Box3, Sphere } from 'three';

const _raycastMesh = new Mesh();
const _batchIntersects = [];

// Implementation of BatchedMesh that automatically expands
export class ExpandingBatchedMesh extends BatchedMesh {

	get instanceCount() {

		return this._currentInstances;

	}

	constructor( ...args ) {

		super( ...args );

		this.expandPercent = 0.25;
		this._currentInstances = 0;

		// set of available geometry ids that are no longer being used
		this._freeGeometryIds = [];

	}

	// Finds a free id that can fit the geometry with the requested ranges. Returns -1 if it could not be found.
	findFreeId( geometry, reservedVertexRange, reservedIndexRange ) {

		const needsIndex = Boolean( this.geometry.index );
		const neededIndexCount = Math.max( needsIndex ? geometry.index.count : - 1, reservedIndexRange );
		const neededVertexCount = Math.max( geometry.attributes.position.count, reservedVertexRange );

		let bestIndex = - 1;
		let bestScore = Infinity;
		const freeGeometryIds = this._freeGeometryIds;
		freeGeometryIds.forEach( ( id, i ) => {

			// if indices are not needed then they default to - 1
			const reservedRange = this._reservedRanges[ id ];
			const { indexCount, vertexCount } = reservedRange;
			if ( indexCount >= neededIndexCount && vertexCount >= neededVertexCount ) {

				// generate score that is a combination of how much unused space a geometry would have if used and pick the
				// one with the least amount of unused space.
				const score = ( neededIndexCount - indexCount ) + ( neededVertexCount - vertexCount );
				if ( score < bestScore ) {

					bestIndex = i;
					bestScore = score;

				}

			}

		} );

		if ( bestIndex !== - 1 ) {

			// remove the id from the array
			const id = freeGeometryIds[ bestIndex ];
			freeGeometryIds.splice( bestIndex, 1 );

			return id;

		} else {

			return - 1;

		}

	}

	// Overrides addGeometry to find an option geometry slot, expand, or optimized if needed
	addGeometry( geometry, reservedVertexRange, reservedIndexRange ) {

		const { indexCount, vertexCount, expandPercent, _freeGeometryIds } = this;
		let resultId = this.findFreeId( geometry, reservedVertexRange, reservedIndexRange );
		if ( resultId !== - 1 ) {

			// insert the geometry in the found empty space
			this.setGeometryAt( resultId, geometry );

		} else {

			try {

				// try to add the geometry, catching the error if it cannot fit
				resultId = super.addGeometry( geometry, vertexCount, indexCount );

			} catch {

				// shift all the unused geometries to try to make space
				_freeGeometryIds.forEach( id => this.deleteGeometry( id ) );
				_freeGeometryIds.length = 0;
				this.optimize();

				try {

					// see if we can insert geometry now
					resultId = super.addGeometry( geometry, vertexCount, indexCount );

				} catch {

					// lastly try to expand the batched mesh size so the new geometry fits
					const batchedIndex = this.geometry.index;
					const batchedPosition = this.geometry.attributes.position;
					const index = geometry.index;
					const position = geometry.attributes.position;

					const addIndexCount = batchedIndex ? Math.ceil( expandPercent * batchedIndex.count ) : - 1;
					const newIndexCount = batchedIndex ? Math.max( addIndexCount, reservedIndexRange, index.count ) + batchedIndex.count : - 1;
					const addVertexCount = Math.ceil( expandPercent * batchedPosition.count );
					const newVertexCount = Math.max( addVertexCount, reservedVertexRange, position.count ) + batchedPosition.count;

					this.setGeometrySize( newVertexCount, newIndexCount );
					resultId = super.addGeometry( geometry, vertexCount, indexCount );

				}

			}

		}

		return resultId;

	}

	// add an instance and automatically expand the number of instances if necessary
	addInstance( geometryId ) {

		if ( this.maxInstanceCount === this._currentInstances ) {

			const newCount = Math.ceil( this.maxInstanceCount * ( 1 + this.expandPercent ) );
			this.setInstanceCount( newCount );

		}

		this._currentInstances ++;
		return super.addInstance( geometryId );

	}

	// delete an instance, keeping note that the geometry id is now unused
	deleteInstance( instanceId ) {

		if ( this._drawInfo[ instanceId ].active === false ) {

			// TODO: how is this happening?
			return;

		}

		this._freeGeometryIds.push( this.getGeometryIdAt( instanceId ) );
		this._currentInstances --;
		return super.deleteInstance( instanceId );

	}

	// add a function for raycasting per tile
	raycastInstance( instanceId, raycaster, intersects ) {

		const batchGeometry = this.geometry;
		const geometryId = this.getGeometryIdAt( instanceId );

		// initialize the mesh
		_raycastMesh.material = this.material;
		_raycastMesh.geometry.index = batchGeometry.index;
		_raycastMesh.geometry.attributes = batchGeometry.attributes;

		// initialize the geometry
		const drawRange = this.getGeometryRangeAt( geometryId );
		_raycastMesh.geometry.setDrawRange( drawRange.start, drawRange.count );
		if ( _raycastMesh.geometry.boundingBox === null ) {

			_raycastMesh.geometry.boundingBox = new Box3();

		}

		if ( _raycastMesh.geometry.boundingSphere === null ) {

			_raycastMesh.geometry.boundingSphere = new Sphere();

		}

		// get the intersects
		this.getMatrixAt( instanceId, _raycastMesh.matrixWorld ).premultiply( this.matrixWorld );
		this.getBoundingBoxAt( geometryId, _raycastMesh.geometry.boundingBox );
		this.getBoundingSphereAt( geometryId, _raycastMesh.geometry.boundingSphere );
		_raycastMesh.raycast( raycaster, _batchIntersects );

		// add batch id to the intersects
		for ( let j = 0, l = _batchIntersects.length; j < l; j ++ ) {

			const intersect = _batchIntersects[ j ];
			intersect.object = this;
			intersect.batchId = instanceId;
			intersects.push( intersect );

		}

		_batchIntersects.length = 0;

	}

}
