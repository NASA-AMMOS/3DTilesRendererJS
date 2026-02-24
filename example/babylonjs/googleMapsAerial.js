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

function ecefToLatLonAlt( x, y, z ) {

	const lon = Math.atan2( y, x );
	const p = Math.sqrt( x * x + y * y );
	let lat = Math.atan2( z, p * ( 1 - WGS84_E2 ) );
	for ( let i = 0; i < 5; i ++ ) {

		const sinLat = Math.sin( lat );
		const N = WGS84_A / Math.sqrt( 1 - WGS84_E2 * sinLat * sinLat );
		lat = Math.atan2( z + WGS84_E2 * N * sinLat, p );

	}

	const sinLat = Math.sin( lat );
	const N = WGS84_A / Math.sqrt( 1 - WGS84_E2 * sinLat * sinLat );
	const alt = p / Math.cos( lat ) - N;

	return [ ( lat * 180 ) / Math.PI, ( lon * 180 ) / Math.PI, alt ];

}

// gui
const params = {
	enabled: true,
	visibleTiles: 0,
	errorTarget: 20,
	minZ: 0,
	maxZ: 0,
};

const gui = new GUI();
gui.add( params, 'enabled' );
gui.add( params, 'visibleTiles' ).name( 'Visible Tiles' ).listen().disable();
gui.add( params, 'errorTarget', 1, 100 );
gui.add( params, 'minZ' ).name( 'Camera MinZ' ).listen().disable();
gui.add( params, 'maxZ' ).name( 'Camera MaxZ' ).listen().disable();

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

camera.checkCollisions = true;
scene.collisionsEnabled = true;

// Fly to close view once tiles load
let hasZoomedIn = false;

// tiles
const tiles = new TilesRenderer( null, scene );
tiles.registerPlugin( new CesiumIonAuthPlugin( {
	apiToken: import.meta.env.VITE_ION_KEY,
	assetId: GOOGLE_TILES_ASSET_ID,
	autoRefreshToken: true,
} ) );
tiles.errorTarget = params.errorTarget;

// Babylon render loop

scene.onBeforeRenderObservable.add( () => {

	if ( params.enabled ) {

		tiles.errorTarget = params.errorTarget;
		tiles.update();
		params.visibleTiles = tiles.visibleTiles.size;
		params.minZ = camera.minZ;
		params.maxZ = camera.maxZ;


		// Once we have some tiles visible, fly in to target
		if ( ! hasZoomedIn && tiles.visibleTiles.size > 5 ) {

			hasZoomedIn = true;
			// camera.flyToAsync( undefined, undefined, 400, undefined, 2000 );

		}

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

// --- Place search functionality ---
const placeSearch = document.getElementById( 'place-search' );
const searchBtn = document.getElementById( 'search-btn' );
const searchResult = document.getElementById( 'search-result' );
const searchResultText = document.getElementById( 'search-result-text' );
const togglePanelBtn = document.getElementById( 'toggle-panel' );
const panelContent = document.getElementById( 'panel-content' );

// Toggle panel collapse
togglePanelBtn.addEventListener( 'click', () => {

	if ( panelContent.style.display === 'none' ) {

		panelContent.style.display = 'block';
		togglePanelBtn.textContent = '−';

	} else {

		panelContent.style.display = 'none';
		togglePanelBtn.textContent = '+';

	}

} );
const coordMode = document.getElementById( 'coord-mode' );
const latlonInputs = document.getElementById( 'latlon-inputs' );
const ecefInputs = document.getElementById( 'ecef-inputs' );
const ecefRadiusRow = document.getElementById( 'ecef-radius-row' );
const latInput = document.getElementById( 'lat' );
const lonInput = document.getElementById( 'lon' );
const altInput = document.getElementById( 'alt' );
const ecefX = document.getElementById( 'ecef-x' );
const ecefY = document.getElementById( 'ecef-y' );
const ecefZ = document.getElementById( 'ecef-z' );
const ecefRadius = document.getElementById( 'ecef-radius' );
const jumpBtn = document.getElementById( 'jump-btn' );

// Initialize input fields with the actual starting coordinates
latInput.value = initialLat.toFixed( 6 );
lonInput.value = initialLon.toFixed( 6 );
altInput.value = initialAlt.toFixed( 0 );

const [ initEcefX, initEcefY, initEcefZ ] = latLonAltToEcef( initialLat, initialLon, 0 );
ecefX.value = initEcefX.toFixed( 2 );
ecefY.value = initEcefY.toFixed( 2 );
ecefZ.value = initEcefZ.toFixed( 2 );
ecefRadius.value = initialAlt.toFixed( 0 );


// place search via Nominatim
searchBtn.addEventListener( 'click', async () => {

	const query = placeSearch.value.trim();
	if ( ! query ) return;

	searchBtn.textContent = '...';
	searchResultText.textContent = '';
	searchResult.style.display = 'none';

	try {

		const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${ encodeURIComponent( query ) }&format=json&limit=1`;
		const url = `https://corsproxy.io/?${ encodeURIComponent( nominatimUrl ) }`;
		const res = await fetch( url );

		if ( ! res.ok ) {

			console.error( 'Search failed:', res.status, res.statusText );
			throw new Error( `HTTP ${ res.status }: ${ res.statusText }` );

		}

		const data = await res.json();

		if ( data.length === 0 ) {

			searchResultText.textContent = 'No results found.';
			searchResult.style.display = 'flex';
			return;

		}

		const place = data[ 0 ];
		const lat = parseFloat( place.lat );
		const lon = parseFloat( place.lon );

		latInput.value = lat.toFixed( 6 );
		lonInput.value = lon.toFixed( 6 );

		const [ x, y, z ] = latLonAltToEcef( lat, lon, 0 );
		ecefX.value = x.toFixed( 2 );
		ecefY.value = y.toFixed( 2 );
		ecefZ.value = z.toFixed( 2 );

		coordMode.value = 'latlon';
		latlonInputs.style.display = 'flex';
		ecefInputs.style.display = 'none';

		searchResultText.textContent = place.display_name;
		searchResult.style.display = 'flex';

	} catch ( e ) {

		console.error( 'Search error:', e );
		searchResultText.textContent = `Error: ${ e.message }`;
		searchResult.style.display = 'flex';

	} finally {

		searchBtn.textContent = 'Search';

	}

} );

placeSearch.addEventListener( 'keydown', ( e ) => {

	if ( e.key === 'Enter' ) searchBtn.click();

} );

// toggle coordinate mode
coordMode.addEventListener( 'change', () => {

	if ( coordMode.value === 'latlon' ) {

		latlonInputs.style.display = 'flex';
		ecefInputs.style.display = 'none';
		ecefRadiusRow.style.display = 'none';
		const [ lat, lon ] = ecefToLatLonAlt(
			parseFloat( ecefX.value ),
			parseFloat( ecefY.value ),
			parseFloat( ecefZ.value )
		);
		latInput.value = lat.toFixed( 6 );
		lonInput.value = lon.toFixed( 6 );
		altInput.value = ecefRadius.value; // Use radius value, not computed alt (which is 0 for surface point)

	} else {

		latlonInputs.style.display = 'none';
		ecefInputs.style.display = 'flex';
		ecefRadiusRow.style.display = 'flex';
		const [ x, y, z ] = latLonAltToEcef(
			parseFloat( latInput.value ),
			parseFloat( lonInput.value ),
			0 // Convert surface point (altitude=0), since camera.center is at surface
		);
		ecefX.value = x.toFixed( 2 );
		ecefY.value = y.toFixed( 2 );
		ecefZ.value = z.toFixed( 2 );
		ecefRadius.value = altInput.value;

	}

} );

// jump to location
jumpBtn.addEventListener( 'click', () => {

	let centerX, centerY, centerZ, radius;

	if ( coordMode.value === 'latlon' ) {

		const lat = parseFloat( latInput.value );
		const lon = parseFloat( lonInput.value );
		const alt = parseFloat( altInput.value ) || 300;

		// Calculate surface point in ECEF
		[ centerX, centerY, centerZ ] = latLonAltToEcef( lat, lon, 0 );
		radius = alt;

	} else {

		// Use ECEF coordinates directly
		centerX = parseFloat( ecefX.value );
		centerY = parseFloat( ecefY.value );
		centerZ = parseFloat( ecefZ.value );
		radius = parseFloat( ecefRadius.value ) || 300;

	}

	// Set camera center and radius
	camera.center = new Vector3( centerX, centerY, centerZ );
	camera.radius = radius;

} );
