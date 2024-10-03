import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { TilesRenderer } from '../three/TilesRenderer.js';

// returns a sorted dependency array from an object
function getDepsArray( object ) {

	if ( ! object ) {

		return [];

	}

	return Object.entries( object )
		.sort( ( a, b ) => a[ 0 ] > b[ 0 ] ? 1 : - 1 )
		.flatMap( item => item );

}

// return true if the given key is for registering an event
function isEventName( key ) {

	return /^on/g.test( key );

}

// returns the event name to register for the given key
function getEventName( key ) {

	return key
		.replace( /^on/, '' )
		.replace( /[a-z][A-Z]/g, match => `${ match[ 0 ] }-${ match[ 1 ] }` )
		.toLowerCase();

}

// returns a dash-separated key as a list of tokens
function getPath( key ) {

	return key.split( '-' );

}

// gets the value from the object at the given path
function getValueAtPath( object, path ) {

	let curr = object;
	const tokens = [ ...path ];
	while ( tokens.length !== 0 ) {

		const key = tokens.shift();
		curr = curr[ key ];

	}

	return curr;

}

// sets the value of the object at the given path
function setValueAtPath( object, path, value ) {

	const tokens = [ ...path ];
	const finalKey = tokens.pop();
	getValueAtPath( object, tokens )[ finalKey ] = value;

}

// context for accessing the tile set
export const TilesRendererContext = createContext( null );

// group that matches the transform of the tile set root group
function TileSetRoot() {

	const tiles = useContext( TilesRendererContext );
	const group = useMemo( () => new Group(), [] );
	if ( tiles ) {

		group.matrixWorld = tiles.group.matrixWorld;

	}

	return <primitive object={ group }/>;

}

// component for registering a plugin
export function TilesPluginComponent( props ) {

	const { plugin, args, ...options } = props;
	const tiles = useContext( TilesRendererContext );
	const [ instance, setInstance ] = useState( null );

	// creates the instance
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		let instance;
		if ( Array.isArray( args ) ) {

			instance = new plugin( ...args );

		} else {

			instance = new plugin( args );

		}

		tiles.registerPlugin( instance );
		setInstance( instance );

		return () => {

			tiles.unregisterPlugin( instance );

		};

	}, [ plugin, tiles, ...getDepsArray( args ) ] );

	// assigns any provided options to the plugin
	useEffect( () => {

		if ( instance === null ) {

			return;

		}

		for ( const key in options ) {

			if ( key in instance ) {

				instance[ key ] = options[ key ];

			}

		}

	}, [ instance, ...getDepsArray( options ) ] );

}

// component for adding a TilesRenderer to the scene
export function TilesRendererComponent( props ) {

	const { url, children, ...options } = props;
	const [ tiles, setTiles ] = useState( null );
	const [ camera, gl ] = useThree( state => [ state.camera, state.gl ] );

	// create the tile set
	useEffect( () => {

		const tiles = new TilesRenderer( url );
		setTiles( tiles );

		return () => {

			tiles.dispose();

		};

	}, [ url ] );

	// update the resolution for the camera
	useFrame( () => {

		camera.updateMatrixWorld();
		tiles.setResolutionFromRenderer( camera, gl );
		tiles.update();

	} );

	// add the camera
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		tiles.setCamera( camera );
		return () => {

			tiles.deleteCamera( camera );

		};

	}, [ tiles, camera ] );

	// assign options recursively
	useEffect( () => {

		if ( tiles === null ) {

			return;

		}

		let previousState = {};
		for ( const key in options ) {

			if ( isEventName( key ) ) {

				tiles.addEventListener( getEventName( key ), options[ key ] );

			} else {

				const path = getPath( key );
				previousState[ key ] = getValueAtPath( tiles, path );
				setValueAtPath( tiles, path, options[ key ] );

			}

		}

		return () => {

			for ( const key in options ) {

				if ( isEventName( key ) ) {

					tiles.removeEventListener( getEventName( key ), options[ key ] );

				}

			}

			for ( const key in options ) {

				const path = getPath( key );
				setValueAtPath( tiles, path, options[ key ] );

			}

		};

	}, [ tiles, ...getDepsArray( options ) ] );

	return <>
		{ tiles ? <primitive object={ tiles.group }/> : null }
		<TilesRendererContext.Provider value={ tiles }>
			<TileSetRoot>
				{ children }
			</TileSetRoot>
		</TilesRendererContext.Provider>
	</>;

}
