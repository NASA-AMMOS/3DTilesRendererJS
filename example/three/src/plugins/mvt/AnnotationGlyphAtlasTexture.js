import { GlyphAtlasTexture } from '3d-tiles-renderer/plugins';

const MAKI_BASE = 'https://cdn.jsdelivr.net/npm/@mapbox/maki@8/icons/';
const ICONS = [ 'restaurant', 'park', 'town-hall', 'shop', 'airport', 'museum', 'hospital', 'lodging' ];

const GLYPH_SIZE = 64;
const GLYPH_SLOT_COUNT = 16;
const ICON_SCALE = 0.75;

export class AnnotationGlyphAtlasTexture extends GlyphAtlasTexture {

	constructor() {

		super( GLYPH_SLOT_COUNT, GLYPH_SIZE );
		this._load();

	}

	async _load() {

		ICONS.forEach( icon =>
			fetch( MAKI_BASE + icon + '.svg' )
				.then( r => r.text() )
				.then( svg => [ icon, svg ] )
				.catch( () => [ icon, null ] )
				.then( ( [ icon, svgText ] ) => {

					this.drawSVG( icon, svgText, {
						fillStyle: 'white',
						strokeStyle: '#3f3e4c',
						strokeWidth: 10,
						iconScale: ICON_SCALE,
					} );
					this.dispatchEvent( { type: 'change' } );

				} )
		);

	}

}
