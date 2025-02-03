import { useState } from 'react';

export function useForceUpdate() {

	const [ value, setValue ] = useState( 0 );
	return [ value, () => setValue( value + 1 ) ];

}
