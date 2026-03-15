// Formats a JSDoc type object into a type string, e.g. "string | Object | null".
// Strips JSDoc's dot-generic syntax: Promise.<void> -> Promise<void>
export function formatType( typeObj ) {

	if ( ! typeObj || ! typeObj.names || typeObj.names.length === 0 ) return '';
	return typeObj.names
		.map( t => t.replace( /\.</g, '<' ) )
		.join( ' | ' );

}

// Formats a single param into the inline signature style: "name = default: Type"
export function formatParam( param ) {

	const type = formatType( param.type );
	const hasDefault = param.defaultvalue !== undefined;

	if ( hasDefault ) {

		return `${param.name} = ${param.defaultvalue}: ${type}`;

	}

	return `${param.name}: ${type}`;

}

export function renderConstructor( classDoc ) {

	const lines = [];

	const topLevel = ( classDoc.params || [] ).filter( p => ! p.name.includes( '.' ) );
	const options = ( classDoc.params || [] ).filter( p => p.name.includes( '.' ) );

	const sig = topLevel.map( formatParam ).join( ', ' );

	lines.push( '### .constructor' );
	lines.push( '' );
	lines.push( '```js' );
	lines.push( `constructor( ${sig} )` );
	lines.push( '```' );
	lines.push( '' );

	// Constructor description (JSDoc puts it in `description`, not `classdesc`)
	if ( classDoc.description ) {

		lines.push( classDoc.description );
		lines.push( '' );

	}

	// Render nested options (e.g. options.layer, options.url) as a list
	if ( options.length > 0 ) {

		for ( const param of options ) {

			const name = param.name.split( '.' ).pop();
			const type = formatType( param.type );
			const hasDefault = param.defaultvalue !== undefined;
			const defStr = hasDefault ? ` = ${param.defaultvalue}` : '';
			lines.push( `- \`${name}${defStr}: ${type}\` — ${param.description}` );

		}

		lines.push( '' );

	}

	return lines.join( '\n' );

}

export function renderMember( doc ) {

	const lines = [];

	lines.push( `### .${doc.name}` );
	lines.push( '' );
	lines.push( '```js' );

	const type = formatType( doc.type );
	const readonly = doc.readonly ? 'readonly ' : '';
	lines.push( `${readonly}${doc.name}: ${type}` );

	lines.push( '```' );
	lines.push( '' );

	if ( doc.description ) {

		lines.push( doc.description );
		lines.push( '' );

	}

	return lines.join( '\n' );

}

export function renderMethod( doc ) {

	const lines = [];

	lines.push( `### .${doc.name}` );
	lines.push( '' );
	lines.push( '```js' );

	const params = ( doc.params || [] ).map( formatParam );
	const ret = ( doc.returns && doc.returns[ 0 ] )
		? formatType( doc.returns[ 0 ].type )
		: 'void';

	const singleLine = params.length
		? `${doc.name}( ${params.join( ', ' )} ): ${ret}`
		: `${doc.name}(): ${ret}`;

	if ( singleLine.length > 80 ) {

		lines.push( `${doc.name}(` );
		params.forEach( ( p, i ) => {

			const comma = i < params.length - 1 ? ',' : '';
			lines.push( `\t${p}${comma}` );

		} );
		lines.push( `): ${ret}` );

	} else {

		lines.push( singleLine );

	}

	lines.push( '```' );
	lines.push( '' );

	if ( doc.description ) {

		lines.push( doc.description );
		lines.push( '' );

	}

	return lines.join( '\n' );

}

export function renderConstants( constants ) {

	if ( constants.length === 0 ) return '';

	const lines = [];

	lines.push( '## Constants' );
	lines.push( '' );

	for ( const c of constants ) {

		const type = formatType( c.type ) || 'number';
		lines.push( `### ${c.name}` );
		lines.push( '' );
		lines.push( '```js' );
		lines.push( `${c.name}: ${type}` );
		lines.push( '```' );
		lines.push( '' );

		if ( c.description ) {

			lines.push( c.description );
			lines.push( '' );

		}

	}

	return lines.join( '\n' );

}

export function renderTypedef( typeDoc ) {

	const lines = [];

	lines.push( `## ${typeDoc.name}` );
	lines.push( '' );

	// If the typedef's base type is not plain Object, treat it as an extension
	const baseType = typeDoc.type && typeDoc.type.names && typeDoc.type.names[ 0 ];
	if ( baseType && baseType !== 'Object' ) {

		lines.push( `_extends \`${baseType}\`_` );
		lines.push( '' );

	}

	if ( typeDoc.description ) {

		lines.push( typeDoc.description );
		lines.push( '' );

	}

	for ( const prop of ( typeDoc.properties || [] ) ) {

		const type = formatType( prop.type );
		const optional = prop.optional ? '?' : '';
		lines.push( `### .${prop.name}` );
		lines.push( '' );
		lines.push( '```js' );
		lines.push( `${prop.name}${optional}: ${type}` );
		lines.push( '```' );
		lines.push( '' );

		if ( prop.description ) {

			lines.push( prop.description );
			lines.push( '' );

		}

	}

	return lines.join( '\n' );

}

export function renderClass( classDoc, members ) {

	const lines = [];

	lines.push( `## ${classDoc.name}` );
	lines.push( '' );

	if ( classDoc.augments && classDoc.augments.length > 0 ) {

		lines.push( `_extends \`${classDoc.augments[ 0 ]}\`_` );
		lines.push( '' );

	}

	if ( classDoc.classdesc ) {

		lines.push( classDoc.classdesc );
		lines.push( '' );

	}

	const visible = members.filter( m => m.access !== 'private' );
	// Treat function doclets that carry an explicit @type tag as properties
	// (e.g. arrow-function assignments like `this.schedulingCallback = func => ...`)
	const isProperty = m => m.kind === 'member' || ( m.kind === 'function' && m.type );
	const properties = visible
		.filter( isProperty )
		.sort( ( a, b ) => a.meta.lineno - b.meta.lineno );
	const methods = visible
		.filter( m => m.kind === 'function' && ! m.type )
		.sort( ( a, b ) => a.meta.lineno - b.meta.lineno );

	for ( const member of properties ) {

		lines.push( renderMember( member ) );

	}

	// Constructor before other methods
	if ( classDoc.params && classDoc.params.length > 0 ) {

		lines.push( renderConstructor( classDoc ) );

	}

	for ( const method of methods ) {

		lines.push( renderMethod( method ) );

	}

	return lines.join( '\n' );

}
