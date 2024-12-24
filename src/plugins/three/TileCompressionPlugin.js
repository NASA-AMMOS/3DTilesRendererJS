import { Vector3, LinearFilter, BufferAttribute, MathUtils } from 'three';

const _vec = new Vector3();
function compressAttribute( attribute, arrayType ) {

	if ( attribute.isInterleavedBufferAttribute || attribute.array instanceof arrayType ) {

		return attribute;

	}

	const signed = arrayType === Int8Array || arrayType === Int16Array || arrayType === Int32Array;
	const minValue = signed ? - 1 : 0;

	const array = new arrayType( attribute.count * attribute.itemSize );
	const newAttribute = new BufferAttribute( array, attribute.itemSize, true );
	const itemSize = attribute.itemSize;
	const count = attribute.count;
	for ( let i = 0; i < count; i ++ ) {

		for ( let j = 0; j < itemSize; j ++ ) {

			const v = MathUtils.clamp( attribute.getComponent( i, j ), minValue, 1 );
			newAttribute.setComponent( i, j, v );

		}

	}

	return newAttribute;

}

function compressPositionAttribute( mesh, arrayType = Int16Array ) {

	const geometry = mesh.geometry;
	const attributes = geometry.attributes;
	const attribute = attributes.position;

	// skip if it's already compressed to the provided level
	if ( attribute.isInterleavedBufferAttribute || attribute.array instanceof arrayType ) {

		return attribute;

	}

	// new attribute data
	const array = new arrayType( attribute.count * attribute.itemSize );
	const newAttribute = new BufferAttribute( array, attribute.itemSize, false );
	const itemSize = attribute.itemSize;
	const count = attribute.count;

	// bounding box stride
	// TODO: the bounding box is computed every time even if it already exists because
	// it's possible that the encoded value is incorrect causing artifacts
	geometry.computeBoundingBox();

	const boundingBox = geometry.boundingBox;
	const { min, max } = boundingBox;

	// array range
	const maxValue = 2 ** ( 8 * arrayType.BYTES_PER_ELEMENT - 1 ) - 1;
	const minValue = - maxValue;

	for ( let i = 0; i < count; i ++ ) {

		for ( let j = 0; j < itemSize; j ++ ) {

			const key = j === 0 ? 'x' : j === 1 ? 'y' : 'z';
			const bbMinValue = min[ key ];
			const bbMaxValue = max[ key ];

			// scale the geometry values to the integer range
			const v = MathUtils.mapLinear(
				attribute.getComponent( i, j ),
				bbMinValue, bbMaxValue,
				minValue, maxValue,
			);

			newAttribute.setComponent( i, j, v );

		}

	}

	// shift the mesh to the center of the bounds
	boundingBox.getCenter( _vec );
	mesh.position.add( _vec );

	// adjust the scale to accommodate the new geometry data range
	mesh.scale.x *= 0.5 * ( max.x - min.x ) / maxValue;
	mesh.scale.y *= 0.5 * ( max.y - min.y ) / maxValue;
	mesh.scale.z *= 0.5 * ( max.z - min.z ) / maxValue;

	attributes.position = newAttribute;
	mesh.geometry.boundingBox = null;
	mesh.geometry.boundingSphere = null;

	mesh.updateMatrixWorld();

}

export class TileCompressionPlugin {

	constructor( options ) {

		this._options = {
			// whether to generate normals if they don't already exist.
			generateNormals: false,

			// whether to disable use of mipmaps since they are typically not necessary
			// with something like 3d tiles.
			disableMipmaps: true,

			// whether to compress certain attributes
			compressIndex: true,
			compressNormals: false,
			compressUvs: false,
			compressPosition: false,

			// the TypedArray type to use when compressing the attributes
			uvType: Int8Array,
			normalType: Int8Array,
			positionType: Int16Array,

			...options,
		};

		this.name = 'TILES_COMPRESSION_PLUGIN';
		this.priority = - 100;

	}

	processTileModel( scene, tile ) {

		const {
			generateNormals,

			disableMipmaps,
			compressIndex,
			compressUvs,
			compressNormals,
			compressPosition,

			uvType,
			normalType,
			positionType,
		} = this._options;

		scene.traverse( c => {

			// handle materials
			if ( c.material && disableMipmaps ) {

				const material = c.material;
				for ( const key in material ) {

					const value = material[ key ];
					if ( value && value.isTexture && value.generateMipmaps ) {

						value.generateMipmaps = false;
						value.minFilter = LinearFilter;

					}

				}

			}

			// handle geometry attribute compression
			if ( c.geometry ) {

				const geometry = c.geometry;
				const attributes = geometry.attributes;
				if ( compressUvs ) {

					const { uv, uv1, uv2, uv3 } = attributes;
					if ( uv ) attributes.uv = compressAttribute( uv, uvType );
					if ( uv1 ) attributes.uv1 = compressAttribute( uv1, uvType );
					if ( uv2 ) attributes.uv2 = compressAttribute( uv2, uvType );
					if ( uv3 ) attributes.uv3 = compressAttribute( uv3, uvType );

				}

				if ( generateNormals && ! attributes.normals ) {

					geometry.computeVertexNormals();

				}

				if ( compressNormals && attributes.normals ) {

					attributes.normals = compressAttribute( attributes.normals, normalType );

				}

				if ( compressPosition ) {

					compressPositionAttribute( c, positionType );

				}

				if ( compressIndex && geometry.index ) {

					const vertCount = attributes.position.count;
					const index = geometry.index;
					const type = vertCount > 65535 ? Uint32Array : vertCount > 255 ? Uint16Array : Uint8Array;
					if ( ! ( index.array instanceof type ) ) {

						const array = new type( geometry.index.count );
						array.set( index.array );

						const attribute = new BufferAttribute( array, 1 );
						geometry.setIndex( attribute );

					}

				}

			}

		} );

	}

}
