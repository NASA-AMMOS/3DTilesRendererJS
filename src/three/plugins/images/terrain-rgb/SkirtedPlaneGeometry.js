import { BufferGeometry, BufferAttribute } from 'three';

// Plane geometry with a skirt around the perimeter. The surface vertices and triangles are laid out
// first, matching PlaneGeometry, followed by the skirt vertices and triangles. Each skirt vertex
// duplicates the perimeter surface vertex at "skirtSourceIndices[ i - surfaceVertexCount ]".
export class SkirtedPlaneGeometry extends BufferGeometry {

	constructor( width = 1, height = 1, widthSegments = 1, heightSegments = 1 ) {

		super();

		const cols = widthSegments + 1;
		const rows = heightSegments + 1;
		const surfaceVertexCount = cols * rows;

		// perimeter vertex loop, clockwise so the skirt triangles face outward
		const perimeter = [];
		for ( let x = 0; x < cols; x ++ ) {

			perimeter.push( x );

		}

		for ( let y = 1; y < rows; y ++ ) {

			perimeter.push( y * cols + cols - 1 );

		}

		for ( let x = cols - 2; x >= 0; x -- ) {

			perimeter.push( ( rows - 1 ) * cols + x );

		}

		for ( let y = rows - 2; y >= 1; y -- ) {

			perimeter.push( y * cols );

		}

		const skirtVertexCount = perimeter.length;
		const vertexCount = surfaceVertexCount + skirtVertexCount;
		const position = new Float32Array( 3 * vertexCount );
		const normal = new Float32Array( 3 * vertexCount );
		const uv = new Float32Array( 2 * vertexCount );

		// flat surface vertices
		for ( let row = 0; row < rows; row ++ ) {

			for ( let col = 0; col < cols; col ++ ) {

				const i = row * cols + col;
				const u = col / widthSegments;
				const v = 1 - row / heightSegments;
				position[ 3 * i + 0 ] = ( u - 0.5 ) * width;
				position[ 3 * i + 1 ] = ( v - 0.5 ) * height;
				normal[ 3 * i + 2 ] = 1;
				uv[ 2 * i + 0 ] = u;
				uv[ 2 * i + 1 ] = v;

			}

		}

		// skirt vertices copy their source vertex
		for ( let i = 0; i < skirtVertexCount; i ++ ) {

			const src = perimeter[ i ];
			const dst = surfaceVertexCount + i;
			position[ 3 * dst + 0 ] = position[ 3 * src + 0 ];
			position[ 3 * dst + 1 ] = position[ 3 * src + 1 ];
			position[ 3 * dst + 2 ] = position[ 3 * src + 2 ];
			normal[ 3 * dst + 2 ] = 1;
			uv[ 2 * dst + 0 ] = uv[ 2 * src + 0 ];
			uv[ 2 * dst + 1 ] = uv[ 2 * src + 1 ];

		}

		// surface triangles
		const index = new Uint32Array( 6 * widthSegments * heightSegments + 6 * skirtVertexCount );
		let offset = 0;
		for ( let y = 0; y < heightSegments; y ++ ) {

			for ( let x = 0; x < widthSegments; x ++ ) {

				const a = y * cols + x;
				const b = ( y + 1 ) * cols + x;
				const c = ( y + 1 ) * cols + x + 1;
				const d = y * cols + x + 1;
				index[ offset ++ ] = a;
				index[ offset ++ ] = b;
				index[ offset ++ ] = d;
				index[ offset ++ ] = b;
				index[ offset ++ ] = c;
				index[ offset ++ ] = d;

			}

		}

		// skirt triangles, one quad per perimeter edge
		for ( let e = 0; e < skirtVertexCount; e ++ ) {

			const ne = ( e + 1 ) % skirtVertexCount;
			const a = perimeter[ e ];
			const b = perimeter[ ne ];
			const sa = surfaceVertexCount + e;
			const sb = surfaceVertexCount + ne;
			index[ offset ++ ] = a;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sa;
			index[ offset ++ ] = b;
			index[ offset ++ ] = sb;
			index[ offset ++ ] = sa;

		}

		this.setIndex( new BufferAttribute( index, 1 ) );
		this.setAttribute( 'position', new BufferAttribute( position, 3 ) );
		this.setAttribute( 'normal', new BufferAttribute( normal, 3 ) );
		this.setAttribute( 'uv', new BufferAttribute( uv, 2 ) );

		this.surfaceVertexCount = surfaceVertexCount;
		this.skirtSourceIndices = new Uint32Array( perimeter );

	}

}
