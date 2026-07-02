import { BufferGeometry, Matrix4, Points } from 'three';

const _mvMatrix = /* @__PURE__ */ new Matrix4();

export class GlyphPoints extends Points {

	get size() {

		return this.material.size;

	}

	set size( v ) {

		this.material.size = v;

	}

	get glyphAtlas() {

		return this.material.glyphAtlas;

	}

	constructor( material ) {

		super( new BufferGeometry(), material );

		this.renderOrder = 1000;
		this.frustumCulled = false;

		// fade settings
		this.fadeInDuration = 0.3;
		this.fadeOutDuration = 0.3;

		// Map<itemId, { item, fade: 0..1, state: 'in' | 'visible' | 'out' }> keyed by stable id,
		// plus an insertion-ordered list of the same entries for stable geometry layout
		this._entryMap = new Map();
		this._orderedEntries = [];
		this._lastUpdateTime = - 1;
		this._added = [];
		this._removed = [];

	}

	dispose() {

		this.glyphAtlas.dispose();
		this.geometry.dispose();
		this.material.dispose();

	}

	// callback for adding and remove items from the set of glyphs
	update( added, removed ) {

		const now = performance.now() / 1000;
		const dt = this._lastUpdateTime < 0 ? 0 : Math.min( now - this._lastUpdateTime, 0.1 );
		this._lastUpdateTime = now;

		const { _entryMap, _orderedEntries, _added, _removed, fadeInDuration, fadeOutDuration } = this;
		_added.length = 0;
		_removed.length = 0;

		for ( const item of added ) {

			const existing = _entryMap.get( item.id );
			if ( ! existing ) {

				const entry = { item, fade: 0, state: 'in' };
				_entryMap.set( item.id, entry );
				_orderedEntries.push( entry );
				_added.push( item );

			} else {

				// keep reference fresh (LoD swap)
				existing.item = item;
				if ( existing.state === 'out' ) existing.state = 'in';

			}

		}

		for ( const item of removed ) {

			const entry = _entryMap.get( item.id );
			if ( entry && entry.state !== 'out' ) {

				entry.state = 'out';

			}

		}

		for ( const [ id, entry ] of _entryMap ) {

			if ( entry.state === 'in' ) {

				entry.fade = Math.min( 1, entry.fade + dt / fadeInDuration );
				if ( entry.fade >= 1 ) {

					entry.state = 'visible';

				}

			} else if ( entry.state === 'out' ) {

				entry.fade = Math.max( 0, entry.fade - dt / fadeOutDuration );
				if ( entry.fade <= 0 ) {

					_entryMap.delete( id );
					_removed.push( entry.item );

				}

			}

		}

		if ( _removed.length > 0 ) {

			this._orderedEntries = _orderedEntries.filter( e => _entryMap.has( e.item.id ) );

		}

		this._updateGeometry();

		return _removed;

	}

	onAfterRender( renderer, scene, camera ) {

		// keep the root near the camera to avoid gpu jitter at globe scale
		const { parent } = this;
		if ( parent ) {

			_mvMatrix.copy( parent.matrixWorld ).invert();

		} else {

			_mvMatrix.identity();

		}

		this.position.setFromMatrixPosition( camera.matrixWorld ).applyMatrix4( _mvMatrix );
		this.updateMatrixWorld( true );

	}

	// subclasses build their geometry from `this._orderedEntries` here
	_updateGeometry() {}

}
