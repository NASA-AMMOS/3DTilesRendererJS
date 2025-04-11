import { Group, Vector3 } from 'three';
import { Ellipsoid } from '../math/Ellipsoid';
import { EnvironmentControls } from './EnvironmentControls';

export class GlobeControls extends EnvironmentControls {

	readonly isGlobeControls: true;

	nearMargin: number;
	farMargin: number;

	adjustCameraAutomatically: boolean;

	get ellipsoid(): Ellipsoid;
	get tilesGroup(): Group;

	getVectorToCenter( target: Vector3 ): Vector3;
	getDistanceToCenter(): number;

}
