import { BoxHelper } from 'three';
import { EllipsoidRegionHelper, EllipsoidRegionLineHelper } from './EllipsoidRegionHelper.js';
import { SphereHelper } from './SphereHelper.js';

export class TileBoundingVolumeHelper extends Group {

	get isDisplayingSomething() {

		return this.children.length !== 0;

	}

	set displaySphere( v ) {

		if ( ! this._sphere ) return;

		if ( v ) this.add( this._sphere );
		else this.remove( this._sphere );

	}

	get displaySphere() {

		if ( ! this._sphere ) return false;

		return ! ! this._sphere.parent;

	}

	set displayObb( v ) {

		if ( ! this._obb ) return;

		if ( v ) this.add( this._sphere );
		else this.remove( this._sphere );

	}

	get displayObb() {

		if ( ! this._obb ) return false;

		return ! ! this._obb.parent;

	}

	set displayRegion( v ) {

		if ( ! this._region ) return;

		if ( v ) this.add( this._region, this._regionSolid );
		else this.remove( this._region, this._regionSolid );

	}

	get displayRegion() {

		if ( ! this._region ) return;

		return ! ! this._region.parent;

	}

	constructor( boundingVolume, color ) {

		this._boundingVolume = boundingVolume;

		this._sphere = null;
		this._obb = null;
		this._region = null;
		this._regionSolid = null;

		const { sphere, obb, region } = boundingVolume;
		if ( sphere ) {

			this._sphere = new SphereHelper( sphere, color );

		}

		if ( obb ) {

			const obbHelper = new BoxHelper( obb.box, color );
			obb.transform.deconstruct(
				obbHelper.position,
				obbHelper.quaternion,
				obbHelper.scale,
			);
			this._obb = obbHelper;

		}

		if ( region ) {

			this._regionSolid = new EllipsoidRegionHelper( region );
			this._region = new EllipsoidRegionLineHelper( region, color );

		}

	}

	setColor( c ) {

		if ( this._sphere ) this._sphere.material.color.set( c );
		if ( this._obb ) this._obb.material.color.set( c );
		if ( this._region ) this._region.material.color.set( c );
		if ( this._regionSolid ) this._regionSolid.material.color.set( c );

	}

}
