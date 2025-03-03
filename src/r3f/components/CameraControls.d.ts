import type { FC, Ref } from 'react';
import type { Camera, Object3D } from 'three';
import type { EnvironmentControls as EnvironmentControlsImpl } from '../../three/controls/EnvironmentControls';
import type { GlobeControls as GlobeControlsImpl } from '../../three/controls/GlobeControls';
import type { TilesRenderer } from './TilesRenderer';

export interface ControlsBaseComponentProps {
    controlsConstructor: new () => any;
    domElement?: HTMLCanvasElement | null;
    scene?: Object3D | null;
    camera?: Camera | null;
    tilesRenderer?: TilesRenderer | null;
}

export interface EnvironmentControlsProps
    extends Omit<ControlsBaseComponentProps, 'controlsConstructor'> { }

export interface GlobeControlsProps
    extends Omit<ControlsBaseComponentProps, 'controlsConstructor'> { }

// Export the controls as type aliases (React Functional Components)
export type EnvironmentControls = FC<
    EnvironmentControlsProps & { ref?: Ref<EnvironmentControlsImpl> }
>;

export type GlobeControls = FC<
    GlobeControlsProps & { ref?: Ref<GlobeControlsImpl> }
>;
