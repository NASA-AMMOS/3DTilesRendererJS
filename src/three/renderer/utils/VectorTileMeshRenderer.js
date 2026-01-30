import {
	Group,
	Points,
	PointsMaterial,
	BufferGeometry,
	Float32BufferAttribute,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	FrontSide
} from 'three';
import earcut from 'earcut';
import { VectorTileIterator } from '../../../core/renderer/utilities/VectorTileIterator.js';

const MVT_EXTENT = 4096;

// --- CLIPPING UTILS ---

function inside( p, edge, val ) {

	if ( edge === 0 ) return p.x >= val; // Left
	if ( edge === 1 ) return p.x <= val; // Right
	if ( edge === 2 ) return p.y >= val; // Top
	if ( edge === 3 ) return p.y <= val; // Bottom
	return false;

}

// Helper to calculate signed area of a ring to determine winding order
// Returns true if CW (Exterior), false if CCW (Interior/Hole)
function isExterior( ring ) {

	let area = 0;
	const len = ring.length;
	for ( let i = 0; i < len; i ++ ) {

		const j = ( i + 1 ) % len;
		area += ring[ i ].x * ring[ j ].y;
		area -= ring[ j ].x * ring[ i ].y;

	}

	// In MVT (Y down), Positive Area = Clockwise = Exterior
	return area > 0;

}

function intersect( p1, p2, edge, val ) {

	const p = { x: 0, y: 0 };
	if ( edge === 0 || edge === 1 ) { // Vertical line (Left/Right)

		p.x = val;
		p.y = p1.y + ( p2.y - p1.y ) * ( val - p1.x ) / ( p2.x - p1.x );

	} else { // Horizontal line (Top/Bottom)

		p.y = val;
		p.x = p1.x + ( p2.x - p1.x ) * ( val - p1.y ) / ( p2.y - p1.y );

	}

	return p;

}

// Sutherland-Hodgman Polygon Clipping
function clipPolygonRing( subjectPolygon ) {

	let outputList = subjectPolygon;

	// We clip against 4 edges: Left(0), Right(EXTENT), Top(0), Bottom(EXTENT)
	const edges = [
		{ edge: 0, val: 0 }, // Min X
		{ edge: 1, val: MVT_EXTENT }, // Max X
		{ edge: 2, val: 0 }, // Min Y
		{ edge: 3, val: MVT_EXTENT } // Max Y
	];

	for ( let i = 0; i < edges.length; i ++ ) {

		const edge = edges[ i ].edge;
		const val = edges[ i ].val;
		const inputList = outputList;
		outputList = [];

		if ( inputList.length === 0 ) break;

		let S = inputList[ inputList.length - 1 ];

		for ( let j = 0; j < inputList.length; j ++ ) {

			const E = inputList[ j ];
			if ( inside( E, edge, val ) ) {

				if ( ! inside( S, edge, val ) ) {

					outputList.push( intersect( S, E, edge, val ) );

				}

				outputList.push( E );

			} else if ( inside( S, edge, val ) ) {

				outputList.push( intersect( S, E, edge, val ) );

			}

			S = E;

		}

	}

	return outputList;

}

// Simple Line Segment Clipping (Cohen-Sutherland-ish)
function clipLinePoints( p1, p2 ) {

	// Bounding box check
	if ( p1.x >= 0 && p1.x <= MVT_EXTENT && p1.y >= 0 && p1.y <= MVT_EXTENT &&
		p2.x >= 0 && p2.x <= MVT_EXTENT && p2.y >= 0 && p2.y <= MVT_EXTENT ) {

		return [ p1, p2 ];

	}

	// dropping segments completely outside
	let t0 = 0, t1 = 1;
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const p = [ - dx, dx, - dy, dy ];
	const q = [ p1.x, MVT_EXTENT - p1.x, p1.y, MVT_EXTENT - p1.y ];

	for ( let i = 0; i < 4; i ++ ) {

		if ( p[ i ] === 0 ) {

			if ( q[ i ] < 0 ) return null; // Parallel and outside

		} else {

			const t = q[ i ] / p[ i ];
			if ( p[ i ] < 0 ) {

				if ( t > t1 ) return null;
				if ( t > t0 ) t0 = t;

			} else {

				if ( t < t0 ) return null;
				if ( t < t1 ) t1 = t;

			}

		}

	}

	if ( t0 > t1 ) return null;

	return [
		{ x: p1.x + t0 * dx, y: p1.y + t0 * dy },
		{ x: p1.x + t1 * dx, y: p1.y + t1 * dy }
	];

}

// Helper: Subdivides triangles until they are smaller than maxEdgeLength
function densifyGeometry( positions, indices, maxEdgeLength ) {

	const newPositions = positions.slice();
	const newIndices = [];
	const stack = [];

	// Initialize stack with initial triangles
	for ( let i = 0; i < indices.length; i += 3 ) {

		stack.push( indices[ i ], indices[ i + 1 ], indices[ i + 2 ] );

	}

	const thresholdSq = maxEdgeLength * maxEdgeLength;

	while ( stack.length > 0 ) {

		const ic = stack.pop();
		const ib = stack.pop();
		const ia = stack.pop();

		const ia3 = ia * 3;
		const ib3 = ib * 3;
		const ic3 = ic * 3;

		const ax = newPositions[ ia3 ], ay = newPositions[ ia3 + 1 ];
		const bx = newPositions[ ib3 ], by = newPositions[ ib3 + 1 ];
		const cx = newPositions[ ic3 ], cy = newPositions[ ic3 + 1 ];

		const dAB = ( ax - bx ) * ( ax - bx ) + ( ay - by ) * ( ay - by );
		const dBC = ( bx - cx ) * ( bx - cx ) + ( by - cy ) * ( by - cy );
		const dCA = ( cx - ax ) * ( cx - ax ) + ( cy - ay ) * ( cy - ay );

		let maxSq = dAB;
		let edge = 0; // 0: AB, 1: BC, 2: CA

		if ( dBC > maxSq ) {

			maxSq = dBC;
			edge = 1;

		}

		if ( dCA > maxSq ) {

			maxSq = dCA;
			edge = 2;

		}

		if ( maxSq <= thresholdSq ) {

			newIndices.push( ia, ib, ic );
			continue;

		}

		// Split the longest edge
		const iMid = newPositions.length / 3;
		let mx, my;

		if ( edge === 0 ) { // AB

			mx = ( ax + bx ) * 0.5;
			my = ( ay + by ) * 0.5;
			newPositions.push( mx, my, 0 );
			stack.push( ia, iMid, ic );
			stack.push( iMid, ib, ic );

		} else if ( edge === 1 ) { // BC

			mx = ( bx + cx ) * 0.5;
			my = ( by + cy ) * 0.5;
			newPositions.push( mx, my, 0 );
			stack.push( ia, ib, iMid );
			stack.push( ia, iMid, ic );

		} else { // CA

			mx = ( cx + ax ) * 0.5;
			my = ( cy + ay ) * 0.5;
			newPositions.push( mx, my, 0 );
			stack.push( ia, ib, iMid );
			stack.push( iMid, ib, ic );

		}

	}

	return {
		positions: newPositions,
		indices: newIndices
	};

}

// Layer stack for render ordering (reversed from canvas order)
const LAYER_STACK = [
	'place_label',
	'poi',
	'boundaries',
	'building',
	'road',
	'transportation',
	'park',
	'landuse',
	'waterway',
	'water'
];

export class VectorTileMeshRenderer {

	constructor( styler, options = {} ) {

		this.styler = styler;
		this.enableDensification = options.enableDensification !== false;
		this.densityThreshold = options.densityThreshold || 1400;
		this._iterator = new VectorTileIterator( styler );

		// Default materials (can be customized)
		this.defaultPointsMaterial = options.pointsMaterial ||
			new PointsMaterial( { color: 0xff0000, size: 4, sizeAttenuation: false, depthTest: false, transparent: true } );
		this.defaultLineMaterial = options.lineMaterial ||
			new LineBasicMaterial( { color: 0x44aaff, linewidth: 2, depthTest: false } );
		this.defaultMeshMaterial = options.meshMaterial ||
			new MeshBasicMaterial( { color: 0x44aaff, side: FrontSide, wireframe: false, depthTest: false } );

	}

	render( vectorTile ) {

		const group = new Group();
		group.name = 'MVTScene';

		// Accumulate geometry per layer
		const layerData = new Map();

		// Process all features
		for ( const layerName in vectorTile.layers ) {

			const layer = vectorTile.layers[ layerName ];

			let isTransparent = false;
			let layerIndex = 0;

			if ( layerName.endsWith( '_overlay' ) ) {

				isTransparent = true;
				layerIndex = 0.12;

			} else if ( layerName.endsWith( '_label' ) ) {

				layerIndex = 0.1;

			} else {

				layerIndex = LAYER_STACK.indexOf( layerName );
				if ( layerIndex === - 1 ) {

					layerIndex = 0;

				}

			}

			const data = {
				pointsPositions: [],
				linePositions: [],
				meshPositions: [],
				meshIndices: [],
				isTransparent,
				layerIndex
			};

			// Temporary arrays for polygon processing
			const flatCoordinates = [];
			const holeIndices = [];
			const polygons = [];

			for ( let i = 0; i < layer.length; i ++ ) {

				const feature = layer.feature( i );
				if ( ! this.styler.shouldIncludeFeature( feature, layerName ) ) continue;

				const geometry = feature.loadGeometry();
				const type = feature.type;

				if ( type === 1 ) {

					this._processPoints( geometry, data.pointsPositions );

				} else if ( type === 2 ) {

					this._processLines( geometry, data.linePositions );

				} else if ( type === 3 ) {

					this._processPolygons( geometry, data, flatCoordinates, holeIndices, polygons );

				}

			}

			if ( data.pointsPositions.length > 0 || data.linePositions.length > 0 || data.meshPositions.length > 0 ) {

				layerData.set( layerName, data );

			}

		}

		// Build meshes from accumulated geometry
		for ( const [ layerName, data ] of layerData ) {

			this._buildLayerMeshes( group, layerName, data );

		}

		group.vectorTile = vectorTile;
		return group;

	}

	_processPoints( geometry, pointsPositions ) {

		for ( const multiPoint of geometry ) {

			for ( const p of multiPoint ) {

				if ( p.x < 0 || p.x > MVT_EXTENT || p.y < 0 || p.y > MVT_EXTENT ) continue;
				pointsPositions.push( p.x, - p.y, 0 );

			}

		}

	}

	_processLines( geometry, linePositions ) {

		for ( const ring of geometry ) {

			const len = ring.length;
			for ( let j = 0; j < len - 1; j ++ ) {

				const clipped = clipLinePoints( ring[ j ], ring[ j + 1 ] );

				if ( clipped ) {

					linePositions.push( clipped[ 0 ].x, - clipped[ 0 ].y, 0 );
					linePositions.push( clipped[ 1 ].x, - clipped[ 1 ].y, 0 );

				}

			}

		}

	}

	_processPolygons( geometry, data, flatCoordinates, holeIndices, polygons ) {

		polygons.length = 0;
		const clippedRings = [];

		for ( const ring of geometry ) {

			const clipped = clipPolygonRing( ring );
			if ( clipped.length >= 3 ) {

				clippedRings.push( clipped );

			}

		}

		// Group rings
		let currentPoly = null;

		for ( const ring of clippedRings ) {

			if ( isExterior( ring ) ) {

				currentPoly = { exterior: ring, holes: [] };
				polygons.push( currentPoly );

			} else {

				if ( currentPoly ) {

					currentPoly.holes.push( ring );

				}

			}

		}

		// Triangulate
		for ( const poly of polygons ) {

			flatCoordinates.length = 0;
			holeIndices.length = 0;

			const exterior = poly.exterior;
			for ( let k = 0; k < exterior.length; k ++ ) {

				flatCoordinates.push( exterior[ k ].x, exterior[ k ].y );

			}

			let indexOffset = flatCoordinates.length / 2;

			for ( const hole of poly.holes ) {

				holeIndices.push( indexOffset );
				for ( let k = 0; k < hole.length; k ++ ) {

					flatCoordinates.push( hole[ k ].x, hole[ k ].y );

				}

				indexOffset += hole.length;

			}

			const triangles = earcut( flatCoordinates, holeIndices );
			const currentOffset = data.meshPositions.length / 3;

			if ( ! this.enableDensification ) {

				for ( let k = 0; k < flatCoordinates.length; k += 2 ) {

					data.meshPositions.push( flatCoordinates[ k ], - flatCoordinates[ k + 1 ], 0 );

				}

				for ( let k = 0; k < triangles.length; k += 3 ) {

					data.meshIndices.push(
						triangles[ k ] + currentOffset,
						triangles[ k + 2 ] + currentOffset,
						triangles[ k + 1 ] + currentOffset
					);

				}

			} else {

				const rawPos = [];
				for ( let k = 0; k < flatCoordinates.length; k += 2 ) {

					rawPos.push( flatCoordinates[ k ], - flatCoordinates[ k + 1 ], 0 );

				}

				const densified = densifyGeometry( rawPos, triangles, this.densityThreshold );

				for ( let k = 0; k < densified.positions.length; k ++ ) {

					data.meshPositions.push( densified.positions[ k ] );

				}

				for ( let k = 0; k < densified.indices.length; k += 3 ) {

					data.meshIndices.push(
						densified.indices[ k ] + currentOffset,
						densified.indices[ k + 2 ] + currentOffset,
						densified.indices[ k + 1 ] + currentOffset
					);

				}

			}

		}

	}

	_buildLayerMeshes( group, layerName, data ) {

		const { pointsPositions, linePositions, meshPositions, meshIndices, isTransparent, layerIndex } = data;
		const layerColor = this.styler.getColor( layerName, 'hex' );

		// 1. Points
		if ( pointsPositions.length > 0 ) {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( pointsPositions, 3 ) );
			const points = new Points( geometry, this.defaultPointsMaterial );
			points.renderOrder = - 0.1;
			points.name = layerName + '_points';
			points.raycast = () => false;
			group.add( points );

		}

		// 2. Lines
		if ( linePositions.length > 0 ) {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( linePositions, 3 ) );

			const lines = new LineSegments( geometry, this.defaultLineMaterial.clone() );
			lines.renderOrder = 1;
			lines.name = layerName + '_lines';
			lines.raycast = () => false;
			lines.material.color.setHex( layerColor );
			group.add( lines );

		}

		// 3. Polygons
		if ( meshPositions.length > 0 ) {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new Float32BufferAttribute( meshPositions, 3 ) );
			geometry.setIndex( meshIndices );

			const mesh = new Mesh( geometry, this.defaultMeshMaterial.clone() );
			mesh.renderOrder = - layerIndex - 1;
			mesh.name = layerName + '_mesh';
			mesh.raycast = () => false;

			if ( isTransparent ) {

				mesh.material.transparent = true;
				mesh.material.opacity = 0.6;

			}

			mesh.material.color.setHex( layerColor );
			group.add( mesh );

		}

	}

}
