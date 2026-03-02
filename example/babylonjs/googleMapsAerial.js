import { Scene, Engine, GeospatialCamera, Vector3, Color4 } from '@babylonjs/core';
import { GeospatialClippingBehavior } from '@babylonjs/core/Behaviors/Cameras';
import { TilesRenderer } from '3d-tiles-renderer/babylonjs';
import { CesiumIonAuthPlugin } from '3d-tiles-renderer/core/plugins';
import GUI from 'lil-gui';

const GOOGLE_TILES_ASSET_ID = 2275207;

const PLANET_RADIUS = 6378137;

// WGS84 geodetic (lat/lon/alt) to ECEF conversion
// Once upstreamed to Babylon.js, these can be removed
const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;

function latLonAltToEcef( latDeg, lonDeg, alt ) {

	const lat = ( latDeg * Math.PI ) / 180;
	const lon = ( lonDeg * Math.PI ) / 180;
	const sinLat = Math.sin( lat );
	const cosLat = Math.cos( lat );
	const sinLon = Math.sin( lon );
	const cosLon = Math.cos( lon );
	const N = WGS84_A / Math.sqrt( 1 - WGS84_E2 * sinLat * sinLat );

	const x = ( N + alt ) * cosLat * cosLon;
	const y = ( N + alt ) * cosLat * sinLon;
	const z = ( N * ( 1 - WGS84_E2 ) + alt ) * sinLat;

	return [ x, y, z ];

}

// gui
const params = {
	enabled: true,
	visibleTiles: 0,
	errorTarget: 12, // Lower value = more detail, less LOD overlap/z-fighting
};

const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'visibleTiles' ).name( 'Visible Tiles' ).listen().disable();
gui.add( params, 'errorTarget', 1, 100 );

// engine
const canvas = document.getElementById( 'renderCanvas' );
const engine = new Engine( canvas, true, { useLargeWorldRendering: true } );
engine.setHardwareScalingLevel( 1 / window.devicePixelRatio );

// scene
const scene = new Scene( engine );
scene.clearColor = new Color4( 0.05, 0.05, 0.05, 1 );

// 3D Tiles data uses right-handed coordinate system
scene.useRightHandedSystem = true;

// camera
const camera = new GeospatialCamera( 'geo', scene, { planetRadius: PLANET_RADIUS } );

camera.attachControl( true );
const clippingBehavior = new GeospatialClippingBehavior();
camera.addBehavior( clippingBehavior );

// Parse URL hash for initial coordinates (#lat=40.7&lon=-73.9&alt=500)
const hashParams = new URLSearchParams( window.location.hash.substring( 1 ) );
const urlLat = hashParams.get( 'lat' );
const urlLon = hashParams.get( 'lon' );
const urlAlt = hashParams.get( 'alt' );

let initialLat = 40.782773; // Central Park, NYC
let initialLon = - 73.965363;
let initialAlt = 600;
let initialRadius = initialAlt;

if ( urlLat && urlLon ) {

	initialLat = parseFloat( urlLat );
	initialLon = parseFloat( urlLon );
	initialAlt = urlAlt ? parseFloat( urlAlt ) : 300;
	initialRadius = initialAlt;

}

const [ initialX, initialY, initialZ ] = latLonAltToEcef( initialLat, initialLon, 0 );

// Start farther out, then fly in once tiles are loaded
camera.radius = initialRadius;

// Set center to initial location (ECEF coordinates)
camera.center = new Vector3( initialX, initialY, initialZ );
camera.pitch = 1.167625429373872;
camera.yaw = - 0.2513281792775774;
camera.limits.radiusMin = 25;


// tiles
const tiles = new TilesRenderer( null, scene );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );
tiles.errorTarget = params.errorTarget;

camera.checkCollisions = true;
// Enable collisions on tile meshes as they load
tiles.addEventListener( 'load-model', ( event ) => {

	const tileScene = event?.scene;
	if ( tileScene ) {

		const meshes = tileScene.getChildMeshes?.() ?? [];
		for ( const mesh of meshes ) {

			mesh.checkCollisions = true;

		}

	}

} );

// Babylon render loop

scene.onBeforeRenderObservable.add( () => {

	if ( params.enabled ) {

		tiles.errorTarget = params.errorTarget;
		tiles.update();
		params.visibleTiles = tiles.visibleTiles.size;

	}

	// update attributions
	const attributions = tiles.getAttributions();
	const creditsEl = document.getElementById( 'credits' );
	creditsEl.innerText = attributions[ 0 ]?.value || '';

} );

engine.runRenderLoop( () => {

	scene.render();

} );

// Handle window resize
window.addEventListener( 'resize', () => {

	engine.resize();

} );

// --- Navigation panel via lil-gui ---
const navParams = {
	placeSearch: '',
	lat: initialLat,
	lon: initialLon,
	alt: initialAlt,
};

const navFolder = gui.addFolder( 'Navigation' );

async function doSearch() {

	const query = navParams.placeSearch.trim();
	if ( ! query ) return;

	navParams.searchResult = 'Searching...';
	setResult( 'Searching...' );

	try {

		const url = `https://nominatim.openstreetmap.org/search?q=${ encodeURIComponent( query ) }&format=json&limit=1`;
		const res = await fetch( url );

		if ( ! res.ok ) {

			throw new Error( `HTTP ${ res.status }: ${ res.statusText }` );

		}

		const data = await res.json();

		if ( data.length === 0 ) {

			navParams.searchResult = 'No results found.';
			setResult( 'No results found.' );
			return;

		}

		const place = data[ 0 ];
		navParams.lat = parseFloat( place.lat );
		navParams.lon = parseFloat( place.lon );

		// Fetch terrain elevation at this location
		let elevation = 0;
		try {

			const elevUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${ navParams.lat },${ navParams.lon }`;
			const elevRes = await fetch( elevUrl );
			if ( elevRes.ok ) {

				const elevData = await elevRes.json();
				elevation = elevData.results?.[ 0 ]?.elevation ?? 0;

			}

		} catch {

			// Fall back to 0 elevation if API is unavailable
			elevation = 0;

		}

		const [ x, y, z ] = latLonAltToEcef( navParams.lat, navParams.lon, elevation + 200 );

		navParams.searchResult = place.display_name;
		setResult( place.display_name );

		// Auto-jump to the found location
		camera.center = new Vector3( x, y, z );
		camera.radius = navParams.alt || 300;

	} catch ( e ) {

		navParams.searchResult = `Error: ${ e.message }`;
		setResult( navParams.searchResult );

	}

}

navFolder.add( navParams, 'placeSearch' ).name( 'Place' ).onFinishChange( doSearch );
navFolder.add( { search: doSearch }, 'search' ).name( 'Search' );

const resultEl = document.createElement( 'div' );
resultEl.style.cssText = 'padding: 3px 8px 3px 8px; color: #a2db3c; font-size: 11px; line-height: 1.5; word-wrap: break-word; display: none;';
navFolder.$children.appendChild( resultEl );

function setResult( text ) {

	resultEl.textContent = text;
	resultEl.style.display = text ? 'block' : 'none';

}
