import { EnvironmentControls } from '3d-tiles-renderer/r3f';
import React from 'react';
import { test, expect } from 'vitest';

test( 'EnvironmentControls types should compile correctly', () => {

	// EnvironmentControls taking valid props, not expect ts error.
	const element1 = <EnvironmentControls enableDamping={ true } />;
	expect( element1 ).toBeDefined();

	// EnvironmentControls taking invalid props, expect ts error. tsc test will fail if ts-expect-error directive failed to capture error.
	// @ts-expect-error - enableDamping should be boolean, not string
	const element2 = <EnvironmentControls enableDamping={ 'incorrect type' } />;
	expect( element2 ).toBeDefined();

	// @ts-expect-error - foo is not a valid prop for EnvironmentControls
	const element3 = <EnvironmentControls foo={ 'bar' } />;
	expect( element3 ).toBeDefined();

} );
