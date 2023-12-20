import { Group } from 'three';
import { TilesRenderer } from '../..';
import { FadeManager } from './FadeManager.js';

function onTileVisibilityChange( scene, tile, visible ) {

	if ( tile.__wasInFrustum !== tile.__inFrustum ) {

		// TODO: possibly need to cancel fade?
		return;

	}

	// TODO: we should only do this when jumping from parent to child tiles.
	// do not fade when a tile is made visible from frustum culling
	if ( ! visible ) {

		this._fadeGroup.add( scene );
		this._fadeManager.fadeOut( scene );

	} else {

		this._fadeManager.fadeIn( scene );

	}

}

function onLoadModel( scene ) {

	this._fadeManager.prepareObject( scene );

}

function onDisposeModel( scene ) {

	this._fadeManager.deleteObject( scene );

}

export class FadeTilesRenderer extends TilesRenderer {

	get fadeDuration() {

		return this._fadeManager.duration;

	}

	set fadeDuration( value ) {

		this._fadeManager.duration = Number( value );

	}

	constructor( ...args ) {

		super( ...args );

		const fadeGroup = new Group();
		this.group.add( fadeGroup );

		const fadeManager = new FadeManager();
		fadeManager.onFadeFinish = object => {

			if ( object.parent === fadeGroup ) {

				fadeGroup.remove( object );

			}

		};

		this._fadeManager = fadeManager;
		this._fadeGroup = fadeGroup;

		this.onLoadModel = onLoadModel.bind( this );
		this.onDisposeModel = onDisposeModel.bind( this );
		this.onTileVisibilityChange = onTileVisibilityChange.bind( this );

	}

	update( ...args ) {

		super.update( ...args );
		this._fadeManager.update();

	}

}
