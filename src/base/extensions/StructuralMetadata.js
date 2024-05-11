export class StructuralMetadata {

	constructor( data ) {

		this.schema = null;
		this.tables = null;
		if ( data ) {

			this.init( data );

		}

	}

	init( data ) {

		const { schema, propertyTables } = data;
		this.schema = new StructuralMetadataSchema( schema );
		this.tables = propertyTables;

	}

	getTableNames() {

		return Object.keys( this.tables );

	}

	getTableClass( table ) {

		const className = this.tables[ table ].class;
		return this.schema.getClass( className );

	}

	getTable( table ) {

		// TODO

	}

	getTableData( table, index, target ) {

		// TODO

	}

}

class PropertyTable {

	constructor( data ) {

		this.name = null;
		this.class = null;
		this.count = null;
		this.properties = null;
		this.data = null;

		if ( data ) {

			this.init( data );

		}

	}

	init( data ) {

		// TOOD

	}

}

class StructuralMetadataSchema {

	constructor( data ) {

		this.id = null;
		this.name = null;
		this.description = null;
		this.version = null;
		this.enums = null;
		this.classes = null;

		if ( data ) {

			this.init( data );

		}

	}

	init( data ) {

		this.id = data.id;
		this.name = data.name || null;
		this.description = data.description || null;
		this.version = data.version || null;
		this.enums = data.enums || null;

		const classes = data.classes;
		if ( classes ) {

			this.classes = {};
			for ( const key in classes ) {

				this.classes[ key ] = parseClass( classes[ key ] );

			}

		}

	}

	getClass( className ) {

		return this.classes[ className ];

	}

}

class StructuredMetadataClass {

	constructor() {

		this.properties = {};
		this.enums = {};
		this.data = null;
		this.name = null;
		this.description = null;

	}

	getProperties() {

		return Object.keys( this.properties );

	}

	getProperty( name ) {

		return this.properties[ name ];

	}

	getPropertyType( name ) {

		const property = this.getPropertyInfo( name );
		return {
			type: property.type,
			array: property.array || false,
			enumType: property.enumType || null,
		};

	}

	getPropertySemantic( name ) {

		return this.getPropertyInfo( name ).semantic;

	}

	getPropertyValue( name, target = null ) {

		const property = this.getPropertyInfo( name );
		if ( property.array ) {

			// perform reading for array

		} else {

			if (
				property.type === 'SCALAR' &&
				property.type === 'STRING' &&
				property.type === 'BOOLEAN' &&
				property.type === 'ENUM'
			) {

				// read the data and assign to target

			} else {

				// assign the data

			}

		}

		return target;

	}

	getEnumPropertyValue( name ) {

		// TODO: return enum name as string

	}

	setData( data ) {

		this.data = data;

	}

}

function parseClass( info, enums ) {

	const localClass = class extends StructuredMetadataClass {};
	const proto = localClass.prototype;
	proto.name = info.name || null;
	proto.description = info.description || null;
	proto.properties = info.properties;
	proto.enums = enums;

	return localClass;

}

class Matrix {

	constructor( width, height ) {

		this.width = width;
		this.height = height;
		this.elements = new Array( width * height ).fill( 0 );

	}

}

// TODO: add these to the "StructuredMetadataClass" definition
class Vector2 extends Matrix {

	constructor() {

		super( 1, 2 );
		this.isVector2 = true;

	}

}

class Vector3 extends Matrix {

	constructor() {

		super( 1, 3 );
		this.isVector3 = true;

	}

}

class Vector4 extends Matrix {

	constructor() {

		super( 1, 4 );
		this.isVector4 = true;

	}

}

class Matrix2 extends Matrix {

	constructor() {

		super( 2, 2 );
		this.isMatrix2 = true;

	}

}

class Matrix3 extends Matrix {

	constructor() {

		super( 3, 3 );
		this.isMatrix3 = true;

	}

}

class Matrix4 extends Matrix {

	constructor() {

		super( 4, 4 );
		this.isMatrix4 = true;

	}

}
