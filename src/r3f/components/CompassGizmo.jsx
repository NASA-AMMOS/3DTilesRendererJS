import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BackSide, Matrix4, OrthographicCamera, Scene, Vector3 } from 'three';
import { TilesRendererContext } from './TilesRenderer';

// Based in part on @pmndrs/drei's Gizmo component

const _vec = /*@__PURE__*/ new Vector3();
const _axis = /*@__PURE__*/ new Vector3();
const _matrix = /*@__PURE__*/ new Matrix4();
const _enuMatrix = /*@__PURE__*/ new Matrix4();
const _cart = {};

// Renders the portal with an orthographic camera
function RenderPortal( props ) {

	const { defaultScene, defaultCamera, overrideRenderLoop = true, renderPriority = 1 } = props;
	const camera = useMemo( () => new OrthographicCamera(), [] );
	const [ set, size, gl, scene ] = useThree( state => [ state.set, state.size, state.gl, state.scene ] );
	useEffect( () => {

		set( { camera } );

	}, [ set, camera ] );

	useEffect( () => {

		camera.left = - size.width / 2;
		camera.right = size.width / 2;
		camera.top = size.height / 2;
		camera.bottom = - size.height / 2;
		camera.near = 0;
		camera.far = 2000;
		camera.position.z = camera.far / 2;
		camera.updateProjectionMatrix();

	}, [ camera, size ] );

	useFrame( () => {

		if ( overrideRenderLoop ) {

			gl.render( defaultScene, defaultCamera );

		}

		const currentAutoClear = gl.autoClear;
		gl.autoClear = false;

		gl.clearDepth();
		gl.render( scene, camera );

		gl.autoClear = currentAutoClear;

	}, renderPriority );

}

// generates an extruded box geometry
function TriangleGeometry() {

	const ref = useRef();
	useEffect( () => {

		const geometry = ref.current;
		const position = geometry.attributes.position;
		for ( let i = 0, l = position.count; i < l; i ++ ) {

			_vec.fromBufferAttribute( position, i );
			if ( _vec.y > 0 ) {

				_vec.x = 0;
				position.setXYZ( i, ..._vec );

			}

		}

	} );

	return <boxGeometry ref={ ref } />;

}

// renders a typical compass graphic with red north triangle, white south, and a tinted circular background
function CompassGraphic( { northColor = 0xEF5350, southColor = 0xFFFFFF } ) {

	const [ lightTarget, setLightTarget ] = useState();
	const groupRef = useRef();
	useEffect( () => {

		setLightTarget( groupRef.current );

	}, [] );

	return (
		<group scale={ 0.5 } ref={ groupRef }>

			{/* Lights */}
			<ambientLight intensity={ 1 } />
			<directionalLight position={ [ 0, 2, 3 ] } intensity={ 3 } target={ lightTarget } />
			<directionalLight position={ [ 0, - 2, - 3 ] } intensity={ 3 } target={ lightTarget } />

			{/* Background */}
			<mesh>
				<sphereGeometry />
				<meshBasicMaterial color={ 0 } opacity={ 0.3 } transparent={ true } side={ BackSide } />
			</mesh>

			{/* Compass shape */}
			<group scale={ [ 0.5, 1, 0.15 ] }>
				<mesh position-y={ 0.5 }>
					<TriangleGeometry />
					<meshStandardMaterial color={ northColor } />
				</mesh>
				<mesh position-y={ - 0.5 } rotation-x={ Math.PI }>
					<TriangleGeometry />
					<meshStandardMaterial color={ southColor } />
				</mesh>
			</group>
		</group>
	);

}

export function CompassGizmo( { children, overrideRenderLoop, mode = '3d', margin = 10, scale = 35, visible = true, ...rest } ) {

	const [ defaultCamera, defaultScene, size ] = useThree( state => [ state.camera, state.scene, state.size ] );
	const tiles = useContext( TilesRendererContext );
	const groupRef = useRef( null );
	const scene = useMemo( () => {

		return new Scene();

	}, [] );

	useFrame( () => {

		if ( tiles === null || groupRef.current === null ) {

			return null;

		}

		const { ellipsoid } = tiles;
		const group = groupRef.current;

		// get the ENU frame in world space
		_matrix.copy( tiles.group.matrixWorld ).invert();
		_vec.setFromMatrixPosition( defaultCamera.matrixWorld ).applyMatrix4( _matrix );
		ellipsoid.getPositionToCartographic( _vec, _cart );
		ellipsoid
			.getRotationMatrixFromAzElRoll( _cart.lat, _cart.lon, 0, 0, 0, _enuMatrix )
			.premultiply( tiles.group.matrixWorld );

		// get the camera orientation in the local ENU frame
		_enuMatrix.invert();
		_matrix.copy( defaultCamera.matrixWorld ).premultiply( _enuMatrix );

		if ( mode.toLowerCase() === '3d' ) {

			group.quaternion.setFromRotationMatrix( _matrix ).invert();

		} else {

			// get the projected facing direction of the camera
			_vec.set( 0, 1, 0 ).transformDirection( _matrix ).normalize();
			_vec.z = 0;
			_vec.normalize();

			if ( _vec.length() === 0 ) {

				// if we're looking exactly top-down
				group.quaternion.identity();

			} else {

				// compute the 2d looking direction
				const angle = _axis.set( 0, 1, 0 ).angleTo( _vec );
				_axis.cross( _vec ).normalize();
				group.quaternion.setFromAxisAngle( _axis, - angle );

			}

		}

	} );

	// default to the compass graphic
	if ( ! children ) {

		children = <CompassGraphic />;

	}

	// remove the portal rendering if not present
	if ( ! visible ) {

		return null;

	}

	return (
		createPortal(
			<>
				<group
					ref={ groupRef }
					scale={ scale }
					position={ [
						size.width / 2 - margin - scale / 2,
						- size.height / 2 + margin + scale / 2,
						0,
					] }

					{ ...rest }
				>{ children }</group>
				<RenderPortal
					defaultCamera={ defaultCamera }
					defaultScene={ defaultScene }
					overrideRenderLoop={ overrideRenderLoop }
					renderPriority={ 10 }
				/>
			</>,
			scene,
			{ events: { priority: 10 } },
		)
	);

}
