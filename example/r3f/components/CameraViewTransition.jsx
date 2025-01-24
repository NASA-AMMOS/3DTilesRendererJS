import { forwardRef, useCallback, useContext } from 'react';
import { CameraTransition, TilesRendererContext } from '3d-tiles-renderer/r3f';
import { useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Raycaster, Vector3, MathUtils } from 'three';
import { makeRotateAroundPoint } from './makeRotateAroundPoint.js';

const raycaster = /* @__PURE__ */ new Raycaster();
const downVector = /* @__PURE__ */ new Vector3();
const axis = /* @__PURE__ */ new Vector3();
const quat = /* @__PURE__ */ new Quaternion();
const matrix = /* @__PURE__ */ new Matrix4();

export const CameraViewTransition = forwardRef( function CameraViewTransition( props, ref ) {

	const tiles = useContext( TilesRendererContext );
	const controls = useThree( ( { controls } ) => controls );
	const scene = useThree( ( { scene } ) => scene );

	const onBeforeToggleCallback = useCallback( ( manager, targetCamera ) => {

		if ( ! manager.animating ) {

			targetCamera.updateMatrixWorld();

			// Force the fixed point to be in the camera center
			raycaster.ray.direction.set( 0, 0, - 1 ).transformDirection( manager.camera.matrixWorld );
			raycaster.ray.origin.setFromMatrixPosition( manager.camera.matrixWorld );

			const hit = raycaster.intersectObject( scene )[ 0 ];
			if ( hit ) {

				manager.fixedPoint.copy( hit.point );
				manager.syncCameras();

			} else {

				controls.getPivotPoint( manager.fixedPoint );
				manager.syncCameras();

			}

			// get the normal at the target point
			if ( tiles ) {

				matrix.copy( tiles.group.matrixWorld ).invert();
				downVector.copy( manager.fixedPoint ).applyMatrix4( matrix );
				tiles.ellipsoid.getPositionToNormal( downVector, downVector ).multiplyScalar( - 1 ).transformDirection( tiles.group.matrixWorld );

			} else {

				downVector.set( 0, - 1, 0 );

			}

			if ( targetCamera.isOrthographicCamera ) {

				// transition the camera view to the top down while retaining same general pointing direction
				const angle = downVector.angleTo( raycaster.ray.direction );
				axis.crossVectors( downVector, raycaster.ray.direction );
				quat.setFromAxisAngle( axis, - angle ).normalize();

				makeRotateAroundPoint( manager.fixedPoint, quat, matrix );
				targetCamera.matrixWorld.premultiply( matrix );
				targetCamera.matrixWorld.decompose(
					targetCamera.position,
					targetCamera.quaternion,
					targetCamera.scale,
				);

				// TODO: it's possible if the fixed point isn't in the middle of the screen that
				// the "down" vector isn't well aligned with the ellipsoid normal. Trying to
				// find the middle point again after rotation and then adjusting the camera again
				// could help this?

			} else {

				// TODO: expose _isNearControls in a better way
				// don't tilt the camera if we're outside the "near controls" behavior so we
				// don't rotate the camera while out in space
				if ( ! controls.isGlobeControls || controls._isNearControls() ) {

					// tilt the perspective down slightly
					let angle = downVector.angleTo( raycaster.ray.direction );
					angle = Math.max( 65 * MathUtils.DEG2RAD - angle, 0 );

					axis.set( 1, 0, 0 ).transformDirection( targetCamera.matrixWorld );
					quat.setFromAxisAngle( axis, angle ).normalize();

					makeRotateAroundPoint( manager.fixedPoint, quat, matrix );
					targetCamera.matrixWorld.premultiply( matrix );
					targetCamera.matrixWorld.decompose(
						targetCamera.position,
						targetCamera.quaternion,
						targetCamera.scale,
					);

				}

			}

		}

		controls.adjustCamera( manager.perspectiveCamera );
		controls.adjustCamera( manager.orthographicCamera );

	}, [ tiles, controls, scene ] );

	return <CameraTransition { ...props } ref={ ref } onBeforeToggle={ onBeforeToggleCallback } />;

} );
