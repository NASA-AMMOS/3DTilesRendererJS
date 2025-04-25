import { Group, Vector3 } from 'three';
import { Ellipsoid } from '../math/Ellipsoid.js';
import { EnvironmentControls } from './EnvironmentControls.js';

export class GlobeControls extends EnvironmentControls {

	readonly isGlobeControls: true;

	nearMargin: number;
	farMargin: number;

	get ellipsoid(): Ellipsoid;
	get tilesGroup(): Group;

	getVectorToCenter( target: Vector3 ): Vector3;
	getDistanceToCenter(): number;

}
