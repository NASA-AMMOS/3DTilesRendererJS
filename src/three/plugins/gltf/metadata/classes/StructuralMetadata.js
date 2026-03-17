import { PropertyAttributeAccessor } from './PropertyAttributeAccessor.js';
import { PropertyTableAccessor } from './PropertyTableAccessor.js';
import { PropertyTextureAccessor } from './PropertyTextureAccessor.js';

/**
 * Provides access to `EXT_structural_metadata` property tables, property textures, and
 * property attributes for a GLTF scene or primitive. Instances are created by
 * `GLTFStructuralMetadataExtension` and attached to `scene.userData.structuralMetadata`
 * and `mesh.userData.structuralMetadata`.
 * @param {Object} definition The root `EXT_structural_metadata` extension object.
 * @param {Array<Texture>} textures Loaded GLTF textures referenced by property textures.
 * @param {Array<ArrayBuffer>} buffers Loaded GLTF buffer views referenced by property tables.
 * @param {Object|null} [nodeMetadata=null] Per-primitive metadata indices (property texture / attribute refs).
 * @param {Object3D|null} [object=null] The three.js object associated with `nodeMetadata`.
 */
export class StructuralMetadata {

	constructor( definition, textures, buffers, nodeMetadata = null, object = null ) {

		const {
			schema,
			propertyTables = [],
			propertyTextures = [],
			propertyAttributes = [],
		} = definition;

		const { enums, classes } = schema;
		const tableAccessors = propertyTables.map( t => new PropertyTableAccessor( t, classes, enums, buffers ) );
		let textureAccessors = [];
		let attributeAccessors = [];

		if ( nodeMetadata ) {

			if ( nodeMetadata.propertyTextures ) {

				textureAccessors = nodeMetadata.propertyTextures.map( i => new PropertyTextureAccessor( propertyTextures[ i ], classes, enums, textures ) );

			}

			if ( nodeMetadata.propertyAttributes ) {

				attributeAccessors = nodeMetadata.propertyAttributes.map( i => new PropertyAttributeAccessor( propertyAttributes[ i ], classes, enums ) );

			}

		}

		this.schema = schema;
		this.tableAccessors = tableAccessors;
		this.textureAccessors = textureAccessors;
		this.attributeAccessors = attributeAccessors;
		this.object = object;
		this.textures = textures;
		this.nodeMetadata = nodeMetadata;

	}

	// Property Tables
	/**
	 * Returns data from one or more property tables. Pass a single table index and row ID to
	 * get one object, or parallel arrays of table indices and row IDs to get an array of
	 * results. Each returned object conforms to the structure class referenced in the schema.
	 * @param {number|Array<number>} tableIndices Table index or array of table indices.
	 * @param {number|Array<number>} ids Row ID or array of row IDs.
	 * @param {Object|Array|null} [target=null] Optional target object or array to write into.
	 * @returns {Object|Array}
	 */
	getPropertyTableData( tableIndices, ids, target = null ) {

		if ( ! Array.isArray( tableIndices ) || ! Array.isArray( ids ) ) {

			// only return a single tables data
			target = target || {};

			const table = this.tableAccessors[ tableIndices ];
			target = table.getData( ids, target );

		} else {

			// return data from an array of tables and ids
			target = target || [];

			const length = Math.min( tableIndices.length, ids.length );
			target.length = length;

			for ( let i = 0; i < length; i ++ ) {

				const table = this.tableAccessors[ tableIndices[ i ] ];
				target[ i ] = table.getData( ids[ i ], target[ i ] );

			}

		}

		return target;

	}

	/**
	 * Returns name and class information for one or more property tables. Defaults to all
	 * tables when `tableIndices` is `null`.
	 * @param {Array<number>|null} [tableIndices=null]
	 * @returns {Array<{name: string, className: string}>|{name: string, className: string}}
	 */
	getPropertyTableInfo( tableIndices = null ) {

		// default to all table information
		if ( tableIndices === null ) {

			tableIndices = this.tableAccessors.map( ( t, i ) => i );

		}

		if ( Array.isArray( tableIndices ) ) {

			// return all table information from the requested list
			return tableIndices.map( i => {

				const table = this.tableAccessors[ i ];
				return {
					name: table.name,
					className: table.definition.class,
				};

			} );

		} else {

			// return the one piece of table information
			const table = this.tableAccessors[ tableIndices ];
			return {
				name: table.name,
				className: table.definition.class,
			};

		}

	}

	// Property Textures
	/**
	 * Returns data from property textures at the given point on the mesh. Takes the triangle
	 * index and barycentric coordinate from a raycast result. See `MeshFeatures.getFeatures`
	 * for how to obtain these values.
	 * @param {number} triangle Triangle index from a raycast hit.
	 * @param {Vector3} barycoord Barycentric coordinate of the hit point.
	 * @param {Array} [target=[]] Optional target array to write into.
	 * @returns {Array}
	 */
	getPropertyTextureData( triangle, barycoord, target = [] ) {

		const textureAccessors = this.textureAccessors;
		target.length = textureAccessors.length;

		for ( let i = 0; i < textureAccessors.length; i ++ ) {

			const accessor = textureAccessors[ i ];
			target[ i ] = accessor.getData( triangle, barycoord, this.object.geometry, target[ i ] );

		}

		return target;

	}

	/**
	 * Returns the same data as `getPropertyTextureData` but performs texture reads
	 * asynchronously.
	 * @param {number} triangle Triangle index from a raycast hit.
	 * @param {Vector3} barycoord Barycentric coordinate of the hit point.
	 * @param {Array} [target=[]] Optional target array to write into.
	 * @returns {Promise<Array>}
	 */
	async getPropertyTextureDataAsync( triangle, barycoord, target = [] ) {

		const textureAccessors = this.textureAccessors;
		target.length = textureAccessors.length;

		const promises = [];
		for ( let i = 0; i < textureAccessors.length; i ++ ) {

			const accessor = textureAccessors[ i ];
			const promise = accessor
				.getDataAsync( triangle, barycoord, this.object.geometry, target[ i ] )
				.then( result => {

					target[ i ] = result;

				} );

			promises.push( promise );

		}

		await Promise.all( promises );

		return target;

	}

	/**
	 * Returns information about the property texture accessors, including their class names
	 * and per-property channel/texcoord mappings.
	 * @returns {Array<{name: string, className: string, properties: Object}>}
	 */
	getPropertyTextureInfo() {

		return this.textureAccessors;

	}

	// Property Attributes
	/**
	 * Returns data stored as property attributes for the given vertex index.
	 * @param {number} attributeIndex Vertex index.
	 * @param {Array} [target=[]] Optional target array to write into.
	 * @returns {Array}
	 */
	getPropertyAttributeData( attributeIndex, target = [] ) {

		const attributeAccessors = this.attributeAccessors;
		target.length = attributeAccessors.length;

		for ( let i = 0; i < attributeAccessors.length; i ++ ) {

			const accessor = attributeAccessors[ i ];
			target[ i ] = accessor.getData( attributeIndex, this.object.geometry, target[ i ] );

		}

		return target;

	}

	/**
	 * Returns name and class information for all property attribute accessors.
	 * @returns {Array<{name: string, className: string}>}
	 */
	getPropertyAttributeInfo() {

		return this.attributeAccessors.map( acc => {

			return {
				name: acc.name,
				className: acc.definition.class,
			};

		} );

	}

	/**
	 * Disposes all texture, table, and attribute accessors.
	 */
	dispose() {

		this.textureAccessors.forEach( acc => acc.dispose() );
		this.tableAccessors.forEach( acc => acc.dispose() );
		this.attributeAccessors.forEach( acc => acc.dispose() );

	}

}
