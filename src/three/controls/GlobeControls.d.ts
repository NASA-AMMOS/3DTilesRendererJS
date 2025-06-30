import { Group, Matrix4, Object3D, Vector3 } from 'three';
import { Ellipsoid } from '../math/Ellipsoid.js';
import { EnvironmentControls } from './EnvironmentControls.js';

export class GlobeControls extends EnvironmentControls {

	readonly isGlobeControls: true;

	nearMargin: number;
	farMargin: number;

	get ellipsoid(): Ellipsoid;
	get ellipsoidGroup(): Group;
	get ellipsoidFrame(): Matrix4;
	get ellipsoidFrameInverse(): Matrix4;
	get tilesGroup(): Group;

	setEllipsoid( ellipsoid: Ellipsoid | null, ellipsoidGroup: Object3D | null ): void;
	getVectorToCenter( target: Vector3 ): Vector3;
	getDistanceToCenter(): number;

}
