import type { ReactNode, Ref, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Group, Scene, OrthographicCamera } from 'three';

export interface CompassGizmoProps {
    children?: ReactNode;
    mode?: '3d' | '2d';
    visible?: boolean;
    scale?: number;
    margin?: number | [number, number];
    overrideRenderLoop?: boolean;
}

export interface RenderPortalProps {
    defaultScene: Scene;
    defaultCamera: OrthographicCamera;
    overrideRenderLoop?: boolean;
    renderPriority?: number;
}

export interface TriangleGeometryProps {
    ref?: Ref<Group>;
}

export interface CompassGraphicProps {
    northColor?: number;
    southColor?: number;
}

export declare const RenderPortal: ForwardRefExoticComponent<
    RenderPortalProps & RefAttributes<OrthographicCamera>
>;

export declare const TriangleGeometry: ForwardRefExoticComponent<
    TriangleGeometryProps & RefAttributes<Group>
>;

export declare const CompassGraphic: ForwardRefExoticComponent<
    CompassGraphicProps & RefAttributes<Group>
>;

export declare const CompassGizmo: ForwardRefExoticComponent<
    CompassGizmoProps & RefAttributes<Group>
>;
