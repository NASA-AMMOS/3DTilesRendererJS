import { Quaternion, Vector3, Matrix4 } from 'three';

const _position = new Vector3();
const _quaternion = new Quaternion();
const _scale = new Vector3();

function updateFrame( info, frames ) {

	if ( info.sceneMatrix ) {

		return;

	}

	// get the transformation fields
	const { translation, rotation, scale } = info;
	_position.set( translation.x, translation.y, translation.z );
	_quaternion.set( rotation.x, rotation.y, rotation.z, rotation.w );
	_scale.set( scale.x, scale.y, scale.z );

	// initialize matrices
	info.matrix = new Matrix4().compose( _position, _quaternion, _scale );
	info.sceneMatrix = new Matrix4().copy( info.matrix );

	if ( info.parent_id !== '' ) {

		const parent = frames.find( e => e.id === info.parent_id );
		updateFrame( parent, frames );
		info.sceneMatrix.premultiply( parent.sceneMatrix );

	}

}

export class JPLLandformSiteSceneLoader {

	constructor() {

		this.fetchOptions = {};

	}

	loadAsync( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => res.json() )
			.then( json => this.parse( json ) );

	}

	parse( json ) {

		json
			.frames
			.forEach( info => updateFrame( info, json.frames ) );

		return json;

	}

}
