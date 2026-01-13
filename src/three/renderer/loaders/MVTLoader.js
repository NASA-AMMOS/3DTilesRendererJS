import { MVTLoaderBase } from '3d-tiles-renderer/core';
import {
	Group,
	Points,
	PointsMaterial,
	BufferGeometry,
	Float32BufferAttribute,
	DefaultLoadingManager,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	FrontSide,
	Color
} from 'three';
import earcut from 'earcut';
import { LAYER_COLORS } from '../utils/layerColors';
import { MVT_EXTENT } from '../../../core/renderer/loaders/MVTLoaderBase';

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
	// Note: MVT Y axis is technically positive down, but the math for the box [0,4096] is the same.
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
		// Calculate new vertex index based on current newPositions length
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

const ENABLE_DENSIFICATION = true;

const LAYER_STACK = [
	'place_label',
	'poi',
	'admin',
	'building',
	'road',
	'transportation',
	'park',
	'landuse',
	'waterway',
	'water'
];
const _color = new Color();

export class MVTLoader extends MVTLoaderBase {

	constructor( manager = DefaultLoadingManager, styles = {} ) {

		super();
		this.manager = manager;

		this._styles = {};
		const colorsToSet = Object.assign( {}, LAYER_COLORS, styles || {} );
		for ( const key in colorsToSet ) {

			_color.set( colorsToSet[ key ] );
			this._styles[ key ] = _color.getHex();

		}

		this.defaultPointsMaterial = new PointsMaterial( { color: 0xff0000, size: 4, sizeAttenuation: false, depthTest: false, transparent: true } );
		this.defaultLineMaterial = new LineBasicMaterial( { color: 0x44aaff, linewidth: 2, depthTest: false } );
		this.defaultMeshMaterial = new MeshBasicMaterial( { color: 0x44aaff, side: FrontSide, wireframe: false, depthTest: false } );

		this.filter = ( feature, layerName ) => true;

	}

	parse( buffer ) {

		return super.parse( buffer ).then( async ( result ) => {

			const { vectorTile } = result;
			const group = new Group();
			group.name = 'MVTScene';

			const flatCoordinates = [];
			const holeIndices = [];
			const polygons = [];

			for ( const layerName in vectorTile.layers ) {

				let isTransparent = false;
				let layerIndex = 0;

				const layer = vectorTile.layers[ layerName ];

				if ( layerName.endsWith( '_overlay' ) ) {

					isTransparent = true;
					layerIndex = 0.12; // draw just before labels, on top of the rest

				} else if ( layerName.endsWith( '_label' ) ) {

					layerIndex = 0.1; // draw on top of everything else (labels)

				} else {

					let layerIndex = LAYER_STACK.indexOf( layerName );
					if ( layerIndex === - 1 ) {

						console.log( 'layerName not found in LAYER_STACK:', layerName );
						layerIndex = 0; // draw on top if not found to debug

					}

				}

				const pointsPositions = [];
				const linePositions = [];
				const meshPositions = [];
				const meshIndices = [];

				// Track meshVertexCount implicitly via meshPositions.length / 3

				for ( let i = 0; i < layer.length; i ++ ) {

					const feature = layer.feature( i );
					if ( ! this.filter( feature, layerName ) ) continue;

					const geometry = feature.loadGeometry();
					const type = feature.type;

					if ( type === 1 ) {

						// --- TYPE 1: POINTS ---
						for ( const multiPoint of geometry ) {

							for ( const p of multiPoint ) {

								if ( p.x < 0 || p.x > MVT_EXTENT || p.y < 0 || p.y > MVT_EXTENT ) continue;
								pointsPositions.push( p.x, - p.y, 0 );

							}

						}

					} else if ( type === 2 ) {

						// --- TYPE 2: LINES ---
						for ( const ring of geometry ) {

							const len = ring.length;
							for ( let j = 0; j < len - 1; j ++ ) {

								const clipped = clipLinePoints( ring[ j ], ring[ j + 1 ] );

								// If line is completely outside, clipped is null
								if ( clipped ) {

									linePositions.push( clipped[ 0 ].x, - clipped[ 0 ].y, 0 );
									linePositions.push( clipped[ 1 ].x, - clipped[ 1 ].y, 0 );

								}

							}

						}

					} else if ( type === 3 ) {

						// --- TYPE 3: POLYGONS ---
						polygons.length = 0;
						const clippedRings = [];

						for ( const ring of geometry ) {

							const clipped = clipPolygonRing( ring );
							// Only keep rings that still have area
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

							// 1. Flatten Data
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

							// 2. Run Earcut
							const triangles = earcut( flatCoordinates, holeIndices );

							// 3. Process Result
							// If densification is OFF, we write directly to the main buffer to avoid double-looping and copying.
							const currentOffset = meshPositions.length / 3;

							if ( ! ENABLE_DENSIFICATION ) {

								// --- FAST PATH (Direct Write) ---

								// Push Positions: Convert 2D flat coords to 3D (x, -y, 0)
								for ( let k = 0; k < flatCoordinates.length; k += 2 ) {

									meshPositions.push( flatCoordinates[ k ], - flatCoordinates[ k + 1 ], 0 );

								}

								// Push Indices: Adjust by currentOffset
								for ( let k = 0; k < triangles.length; k += 3 ) {

									// And we SWAP the last two (k+2, k+1) to flip the normal outward
									meshIndices.push(
										triangles[ k ] + currentOffset,
										triangles[ k + 2 ] + currentOffset,
										triangles[ k + 1 ] + currentOffset
									);

								}

							} else {

								// --- DENSIFICATION PATH ---

								// Reconstruct 3D points for the densifier
								const rawPos = [];
								for ( let k = 0; k < flatCoordinates.length; k += 2 ) {

									rawPos.push( flatCoordinates[ k ], - flatCoordinates[ k + 1 ], 0 );

								}

								// Threshold: ~100-200 ensures roughly 20-40 segments across the tile (4096 extent)
								const DENSITY_THRESHOLD = 1400; // arbitrary number, tweak as needed
								const densified = densifyGeometry( rawPos, triangles, DENSITY_THRESHOLD );

								// Copy densified result to main buffer
								for ( let k = 0; k < densified.positions.length; k ++ ) {

									meshPositions.push( densified.positions[ k ] );

								}

								for ( let k = 0; k < densified.indices.length; k += 3 ) {

									meshIndices.push(
										densified.indices[ k ] + currentOffset,
										densified.indices[ k + 2 ] + currentOffset,
										densified.indices[ k + 1 ] + currentOffset
									);

								}

							}

						}

					}

				}

				// --- BUILD MESHES ---

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

					// CLONE material so we can set a unique color, can be optimised later
					const lines = new LineSegments( geometry, this.defaultLineMaterial.clone() );

					// RENDER ORDER:
					// Polygons are at (-layerIndex - 1) which is usually < -1.
					// We put lines at 1 to ensure they sit ON TOP of all land/water polygons.
					lines.renderOrder = 1;

					lines.name = layerName + '_lines';
					lines.raycast = () => false;

					// --- COLOR LOGIC FOR LINES ---
					let layerColor = this._styles[ layerName ];

					if ( ! layerColor ) {

						layerColor = this._styles[ 'default' ];


					}

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
					let layerColor = this._styles[ layerName ];

					if ( ! layerColor ) {

						layerColor = this._styles[ 'default' ];

					}

					if ( isTransparent ) {

						mesh.material.transparent = true;
						mesh.material.opacity = 0.6;

					}

					mesh.material.color.setHex( layerColor );
					group.add( mesh );

				}

			}

			result.scene = group;
			result.scene.vectorTile = vectorTile;
			return result;

		} );

	}

}
