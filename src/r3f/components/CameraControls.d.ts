import type { FC, Ref } from 'react';
import type { Camera, Object3D } from 'three';
import type { EnvironmentControls as EnvironmentControlsImpl } from '../../three/controls/EnvironmentControls';
import type { GlobeControls as GlobeControlsImpl } from '../../three/controls/GlobeControls';
import type { TilesRenderer } from './TilesRenderer';

export interface ControlsBaseProps {
    domElement?: HTMLCanvasElement | null;
    scene?: Object3D | null;
    camera?: Camera | null;
    tilesRenderer?: TilesRenderer | null;
    [key: string]: any; // Allow subproperty flexibility if necessary
}

export type EnvironmentControls = FC<
    ControlsBaseProps & { ref?: Ref<EnvironmentControlsImpl> }
>;

export type GlobeControls = FC<
    ControlsBaseProps & { ref?: Ref<GlobeControlsImpl> }
>;
