import { BufferAttribute, BufferGeometry, Color, Points } from 'three';
import { getAnnotationColor, getAnnotationKind } from './annotationColors.js';

const _color = /* @__PURE__ */ new Color();

export class AnnotationsPoints extends Points {

	constructor( material ) {

		super( new BufferGeometry(), material );

		this.renderOrder = 1000;
		this.frustumCulled = false;

		this.fadeInDuration = 0.3;
		this.fadeOutDuration = 0.3;

		// Map<itemId, entry> — keyed by stable id, not object reference.
		// entry: { item, fade: 0..1, state: 'in' | 'visible' | 'out' }
		this._entryMap = new Map();
		this._orderedEntries = [];
		this._structureDirty = false;

	}

	// Call every frame. visibleItems is DelayedScreenOccupationManager.visible (a Set<item>).
	// Returns true while any point is still animating.
	update( dt, visibleItems, glyphAtlas ) {

		// Build id→item map for the current visible set so we can look up by id.
		const visibleById = new Map();
		for ( const item of visibleItems ) {

			visibleById.set( item.id, item );

		}

		// Add new items, update LoD-swapped references, reverse in-progress fade-outs.
		for ( const [ id, item ] of visibleById ) {

			const existing = this._entryMap.get( id );
			if ( ! existing ) {

				const entry = { item, fade: 0, state: 'in' };
				this._entryMap.set( id, entry );
				this._orderedEntries.push( entry );
				this._structureDirty = true;

			} else {

				existing.item = item; // keep reference fresh (LoD swap)
				if ( existing.state === 'out' ) existing.state = 'in';

			}

		}

		// Start fade-out for items that left the visible set.
		for ( const [ id, entry ] of this._entryMap ) {

			if ( ! visibleById.has( id ) && entry.state !== 'out' ) {

				entry.state = 'out';

			}

		}

		// Tick fades; collect fully-faded-out items for removal.
		const toRemove = [];
		for ( const [ id, entry ] of this._entryMap ) {

			if ( entry.state === 'in' ) {

				entry.fade = Math.min( 1, entry.fade + dt / this.fadeInDuration );
				if ( entry.fade >= 1 ) entry.state = 'visible';

			} else if ( entry.state === 'out' ) {

				entry.fade = Math.max( 0, entry.fade - dt / this.fadeOutDuration );
				if ( entry.fade <= 0 ) toRemove.push( id );

			}

		}

		if ( toRemove.length > 0 ) {

			for ( const id of toRemove ) this._entryMap.delete( id );
			this._orderedEntries = this._orderedEntries.filter( e => this._entryMap.has( e.item.id ) );
			this._structureDirty = true;

		}

		const origin = this.position;
		if ( this._structureDirty ) {

			this._rebuildGeometry( origin, glyphAtlas );
			this._structureDirty = false;

		} else {

			this._updateDynamic( origin );

		}

		for ( const entry of this._entryMap.values() ) {

			if ( entry.state !== 'visible' ) return true;

		}

		return false;

	}

	_rebuildGeometry( origin, glyphAtlas ) {

		const entries = this._orderedEntries;
		const count = entries.length;

		this.geometry.dispose();

		const posAttr = new BufferAttribute( new Float32Array( count * 3 ), 3 );
		const colorAttr = new BufferAttribute( new Float32Array( count * 3 ), 3 );
		const glyphUVAttr = new BufferAttribute( new Float32Array( count * 2 ), 2 );
		const alphaAttr = new BufferAttribute( new Float32Array( count ), 1 );

		this.geometry.setAttribute( 'position', posAttr );
		this.geometry.setAttribute( 'color', colorAttr );
		this.geometry.setAttribute( 'glyphUV', glyphUVAttr );
		this.geometry.setAttribute( 'alpha', alphaAttr );

		for ( let i = 0; i < count; i ++ ) {

			const { item, fade } = entries[ i ];
			const p = item.position;
			posAttr.array[ i * 3 + 0 ] = p.x - origin.x;
			posAttr.array[ i * 3 + 1 ] = p.y - origin.y;
			posAttr.array[ i * 3 + 2 ] = p.z - origin.z;

			getAnnotationColor( item.layer, item.properties, _color );
			colorAttr.array[ i * 3 + 0 ] = _color.r;
			colorAttr.array[ i * 3 + 1 ] = _color.g;
			colorAttr.array[ i * 3 + 2 ] = _color.b;

			const kind = getAnnotationKind( item.layer, item.properties );
			const uv = kind !== null ? glyphAtlas.getKindUV( kind ) : null;
			glyphUVAttr.array[ i * 2 + 0 ] = uv !== null ? uv.uvX : - 1;
			glyphUVAttr.array[ i * 2 + 1 ] = uv !== null ? uv.uvY : - 1;

			alphaAttr.array[ i ] = fade;

		}

	}

	raycast( raycaster, intersects ) {

		const before = intersects.length;
		super.raycast( raycaster, intersects );

		for ( let i = before; i < intersects.length; i ++ ) {

			const hit = intersects[ i ];
			const entry = this._orderedEntries[ hit.index ];
			if ( entry ) {

				hit.layer = entry.item.layer;
				hit.properties = entry.item.properties;

			}

		}

	}

	_updateDynamic( origin ) {

		const entries = this._orderedEntries;
		const count = entries.length;
		if ( count === 0 ) return;

		const posAttr = this.geometry.getAttribute( 'position' );
		const alphaAttr = this.geometry.getAttribute( 'alpha' );
		if ( ! posAttr || ! alphaAttr ) return;

		for ( let i = 0; i < count; i ++ ) {

			const { item, fade } = entries[ i ];
			const p = item.position;
			posAttr.array[ i * 3 + 0 ] = p.x - origin.x;
			posAttr.array[ i * 3 + 1 ] = p.y - origin.y;
			posAttr.array[ i * 3 + 2 ] = p.z - origin.z;
			alphaAttr.array[ i ] = fade;

		}

		posAttr.needsUpdate = true;
		alphaAttr.needsUpdate = true;

	}

}
