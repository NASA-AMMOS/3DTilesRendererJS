import { Mesh, Box3, Sphere } from 'three';
import { ModelViewBatchedMesh } from './ModelViewBatchedMesh.js';

const _raycastMesh = new Mesh();
const _batchIntersects = [];

// Implementation of BatchedMesh that automatically expands
export class ExpandingBatchedMesh extends ModelViewBatchedMesh {

	constructor( ...args ) {

		super( ...args );

		this.expandPercent = 0.25;
		this.maxInstanceExpansionSize = Infinity;

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
			const geometryInfo = this.getGeometryRangeAt( id );
			const { reservedIndexCount, reservedVertexCount } = geometryInfo;
			if ( reservedIndexCount >= neededIndexCount && reservedVertexCount >= neededVertexCount ) {

				// generate score that is a combination of how much unused space a geometry would have if used and pick the
				// one with the least amount of unused space.
				const score = ( neededIndexCount - reservedIndexCount ) + ( neededVertexCount - reservedVertexCount );
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

		// expand the reserved range to what geometry needs since add geometry will throw an error otherwise
		const needsIndex = Boolean( this.geometry.index );
		reservedIndexRange = Math.max( needsIndex ? geometry.index.count : - 1, reservedIndexRange );
		reservedVertexRange = Math.max( geometry.attributes.position.count, reservedVertexRange );

		const { expandPercent, _freeGeometryIds } = this;
		let resultId = this.findFreeId( geometry, reservedVertexRange, reservedIndexRange );
		if ( resultId !== - 1 ) {

			// insert the geometry in the found empty space
			this.setGeometryAt( resultId, geometry );

		} else {

			const needsMoreSpace = () => {

				const vertexNeedsSpace = this.unusedVertexCount < reservedVertexRange;
				const indexNeedsSpace = this.unusedIndexCount < reservedIndexRange;
				return vertexNeedsSpace || indexNeedsSpace;

			};

			const index = geometry.index;
			const position = geometry.attributes.position;
			reservedVertexRange = Math.max( reservedVertexRange, position.count );
			reservedIndexRange = Math.max( reservedIndexRange, index ? index.count : 0 );

			if ( needsMoreSpace() ) {

				// shift all the unused geometries to try to make space
				_freeGeometryIds.forEach( id => this.deleteGeometry( id ) );
				_freeGeometryIds.length = 0;

				this.optimize();

				if ( needsMoreSpace() ) {

					// lastly try to expand the batched mesh size so the new geometry fits

					const batchedIndex = this.geometry.index;
					const batchedPosition = this.geometry.attributes.position;

					// compute the new geometry size to expand to accounting for the case where the geometry is not initialized
					let newIndexCount, newVertexCount;
					if ( batchedIndex ) {

						const addIndexCount = Math.ceil( expandPercent * batchedIndex.count );
						newIndexCount = Math.max( addIndexCount, reservedIndexRange, index.count ) + batchedIndex.count;

					} else {

						newIndexCount = Math.max( this.unusedIndexCount, reservedIndexRange );

					}

					if ( batchedPosition ) {

						const addVertexCount = Math.ceil( expandPercent * batchedPosition.count );
						newVertexCount = Math.max( addVertexCount, reservedVertexRange, position.count ) + batchedPosition.count;

					} else {

						newVertexCount = Math.max( this.unusedVertexCount, reservedVertexRange );

					}

					this.setGeometrySize( newVertexCount, newIndexCount );

				}

			}

			resultId = super.addGeometry( geometry, reservedVertexRange, reservedIndexRange );

		}

		return resultId;

	}

	// add an instance and automatically expand the number of instances if necessary
	addInstance( geometryId ) {

		if ( this.maxInstanceCount === this.instanceCount ) {

			const newCount = Math.ceil( this.maxInstanceCount * ( 1 + this.expandPercent ) );
			this.setInstanceCount( Math.min( newCount, this.maxInstanceExpansionSize ) );

		}

		return super.addInstance( geometryId );

	}

	// delete an instance, keeping note that the geometry id is now unused
	deleteInstance( instanceId ) {

		const geometryId = this.getGeometryIdAt( instanceId );
		if ( geometryId !== - 1 ) {

			this._freeGeometryIds.push( geometryId );

		}

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
