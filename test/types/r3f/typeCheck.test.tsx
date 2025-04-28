import { EnvironmentControls } from '../../../src/r3f/index.js';
import React from 'react';

// EnvironmentControls taking valid props, not expect ts error.
<EnvironmentControls enableDamping={ true } />;

// EnvironmentControls taking invalid props, expect ts error. tsc test will fail if ts-expect-error directive failed to capture error.
//@ts-expect-error
<EnvironmentControls enableDamping={ 'incorrect type' }/>;

//@ts-expect-error
<EnvironmentControls foo={ 'bar' } />;
