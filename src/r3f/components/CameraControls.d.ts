import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Camera, Object3D } from 'three';
import type { EnvironmentControls as EnvironmentControlsImpl, GlobeControls as GlobeControlsImpl } from '3d-tiles-renderer/three';
import type { TilesRenderer } from './TilesRenderer.jsx';

interface ControlsBaseProps {
	domElement?: HTMLCanvasElement | null;
	scene?: Object3D | null;
	camera?: Camera | null;
	tilesRenderer?: typeof TilesRenderer | null;
}

type EnvironmentControlsProps = Partial<
	InstanceType<typeof EnvironmentControlsImpl>
> &
	ControlsBaseProps;

type GlobeControlsProps = Partial<InstanceType<typeof GlobeControlsImpl>> &
	ControlsBaseProps;

export declare const EnvironmentControls: ForwardRefExoticComponent<
	EnvironmentControlsProps & RefAttributes<EnvironmentControlsImpl>
>;

export declare const GlobeControls: ForwardRefExoticComponent<
	GlobeControlsProps & RefAttributes<GlobeControlsImpl>
>;
