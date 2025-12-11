import { EnvironmentControls } from '3d-tiles-renderer/r3f';
import React from 'react';

// EnvironmentControls taking valid props, not expect ts error.
<EnvironmentControls enableDamping={ true } />;

// EnvironmentControls taking invalid props, expect ts error. tsc test will fail if ts-expect-error directive failed to capture error.
// @ts-expect-error - enableDamping should be boolean, not string
<EnvironmentControls enableDamping={ 'incorrect type' }/>;

// @ts-expect-error - foo is not a valid prop for EnvironmentControls
<EnvironmentControls foo={ 'bar' } />;
