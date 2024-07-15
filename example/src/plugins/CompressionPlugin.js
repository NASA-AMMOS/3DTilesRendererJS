import { Vector3 } from 'three';
import { BufferAttribute, MathUtils } from 'three';

const _vec = new Vector3();
function compressAttribute( attribute, arrayType ) {

	if ( attribute.isInterleavedBufferAttribute || attribute.array instanceof arrayType ) {

		return attribute;

	}

	const signed = arrayType === Int8Array || array === Int16Array;
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

}

export class CompressionPlugin {

	constructor( options ) {

		this.options = {
			disableMipmaps: true,
			compressNormals: true,
			compressUvs: true,
			compressPosition: true,
			...options,
		};
		this.tiles = null;

	}

	init( tiles ) {

		this.tiles = tiles;

		const {
			disableMipmaps,
			compressUvs,
			compressNormals,
			compressPosition,
		} = this.options;

		this._onLoadModel = ( { scene } ) => {

			scene.traverse( c => {

				if ( c.material && disableMipmaps ) {

					const material = c.material;
					for ( const key in material ) {

						const value = material[ key ];
						if ( value && value.isTexture ) {

							value.generateMipmaps = false;

						}

					}

				}

				if ( c.geometry ) {

					const geometry = c.geometry;
					const attributes = geometry.attributes;
					if ( compressUvs ) {

						const { uv, uv1, uv2, uv3 } = attributes;
						if ( uv ) attributes.uv = compressAttribute( uv, Int8Array );
						if ( uv1 ) attributes.uv1 = compressAttribute( uv1, Int8Array );
						if ( uv2 ) attributes.uv2 = compressAttribute( uv2, Int8Array );
						if ( uv3 ) attributes.uv3 = compressAttribute( uv3, Int8Array );

					}

					if ( compressNormals && attributes.normals ) {

						attributes.normals = compressAttribute( attributes.normals, Int8Array );

					}

					if ( compressPosition ) {

						compressPositionAttribute( c );

					}

				}

			} );

		};

		tiles.addEventListener( 'load-model', this._onLoadModel );

	}

	dispose() {

		this.tiles.removeEventListener( 'load-model', this._onLoadModel );

	}

}
