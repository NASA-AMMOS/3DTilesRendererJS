import type {
	ReactNode,
	ForwardRefExoticComponent,
	RefAttributes,
} from 'react';
import type { Group } from 'three';

interface CompassGizmoProps {
	children?: ReactNode;
	mode?: '3d' | '2d';
	visible?: boolean;
	scale?: number;
	margin?: number | [number, number];
	overrideRenderLoop?: boolean;
}

export declare const CompassGizmo: ForwardRefExoticComponent<
	CompassGizmoProps & RefAttributes<Group>
>;
