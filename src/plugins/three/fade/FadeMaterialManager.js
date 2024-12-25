import { wrapFadeMaterial } from './wrapFadeMaterial.js';

// Class for managing and updating extended fade parameters
export class FadeMaterialManager {

	constructor() {

		this._fadeParams = new WeakMap();
		this.fading = 0;

	}

	// Set the fade parameters for the given scene
	setFade( scene, fadeIn, fadeOut ) {

		if ( ! scene ) {

			return;

		}

		// traverse the scene and update the fade parameters of all materials
		const fadeParams = this._fadeParams;
		scene.traverse( child => {

			const material = child.material;
			if ( material ) {

				const params = fadeParams.get( material );
				params.fadeIn.value = fadeIn;
				params.fadeOut.value = fadeOut;

				const fadeInComplete = fadeIn === 0 || fadeIn === 1;
				const fadeOutComplete = fadeOut === 0 || fadeOut === 1;
				const value = Number( ! fadeInComplete || ! fadeOutComplete );
				if ( material.defines.FEATURE_FADE !== value ) {

					this.fading += value === 1 ? 1 : - 1;
					material.defines.FEATURE_FADE = value;
					material.needsUpdate = true;

				}

			}

		} );

	}

	// initialize materials in the object
	prepareScene( scene ) {

		scene.traverse( child => {

			if ( child.material ) {

				this.prepareMaterial( child.material );

			}

		} );

	}

	// delete the object from the fade, reset the material data
	deleteScene( scene ) {

		if ( ! scene ) {

			return;

		}

		// revert the materials
		const fadeParams = this._fadeParams;
		scene.traverse( child => {

			const material = child.material;
			if ( material ) {

				fadeParams.delete( material );
				material.onBeforeCompile = () => {};
				material.needsUpdate = true;

			}

		} );

	}

	// initialize the material
	prepareMaterial( material ) {

		const fadeParams = this._fadeParams;
		if ( fadeParams.has( material ) ) {

			return;

		}

		fadeParams.set( material, wrapFadeMaterial( material ) );

	}

}
