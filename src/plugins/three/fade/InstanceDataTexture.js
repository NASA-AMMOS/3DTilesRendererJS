import { DataTexture } from 'three';

export class InstanceDataTexture extends DataTexture {

	setValueAt( instance, ...values ) {

		const { data, width, height } = this.image;
		const itemSize = Math.floor( data.length / ( width * height ) );
		let needsUpdate = false;
		for ( let i = 0; i < itemSize; i ++ ) {

			const index = instance * itemSize + i;
			const prevValue = data[ index ];
			const newValue = values[ i ] || 0;
			if ( prevValue !== newValue ) {

				data[ index ] = newValue;
				needsUpdate = true;

			}

		}

		if ( needsUpdate ) {

			this.needsUpdate = true;

		}

	}

}
