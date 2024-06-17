import { ClassProperty } from './ClassProperty.js';

export class PropertySetAccessor {

	constructor( definition, classes = {}, enums = {}, data = null ) {

		this.definition = definition;
		this.class = classes[ definition.class ];
		this.className = definition.class;
		this.enums = enums;
		this.data = data;
		this.name = 'name' in definition ? definition.name : null;

		this.properties = null;

	}

	getPropertyNames() {

		return Object.keys( this.class.properties );

	}

	includesData( name ) {

		return Boolean( this.definition.properties[ name ] );

	}

	dispose() {}

	_initProperties( propertyClass = ClassProperty ) {

		const properties = {};
		for ( const key in this.class.properties ) {

			properties[ key ] = new propertyClass( this.enums, this.class.properties[ key ], this.definition.properties[ key ] );

		}

		this.properties = properties;

	}

}
