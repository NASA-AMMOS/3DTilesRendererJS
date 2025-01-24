export class PerformanceScalingPlugin {

	constructor( options = {} ) {

		const {
			maxErrorTarget = 100,
			targetUpdateMs = 4,
			errorIncrement = 0.05,
		} = options;

		this.maxErrorTarget = maxErrorTarget;
		this.targetUpdateMs = targetUpdateMs;
		this.errorIncrement = errorIncrement;

	}

	init( tiles ) {

		window.TILES = tiles;
		let start;
		this._onUpdateBefore = () => {

			start = performance.now();

		};

		this._onUpdateAfter = () => {

			const delta = performance.now() - start;
			if ( delta > this.targetUpdateMs || tiles.lruCache.isFull() ) {

				console.log('SCALING', tiles.errorTarget, tiles.lruCache.cachedBytes )
				tiles.errorTarget = Math.min( this.maxErrorTarget, tiles.errorTarget + this.errorIncrement * tiles.errorTarget );

			}

		};

		tiles.addEventListener( 'update-before', this._onUpdateBefore );
		tiles.addEventListener( 'update-after', this._onUpdateAfter );

	}

	dispose() {

		const tiles = this.tiles;
		tiles.removeEventListener( 'update-before', this._onUpdateBefore );
		tiles.removeEventListener( 'update-after', this._onUpdateAfter );

	}

}
