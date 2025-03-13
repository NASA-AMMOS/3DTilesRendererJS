import type { ReactNode, Ref, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Group, Scene, OrthographicCamera } from 'three';

interface CompassGizmoProps {
    children?: ReactNode;
    mode?: '3d' | '2d';
    visible?: boolean;
    scale?: number;
    margin?: number | [number, number];
    overrideRenderLoop?: boolean;
}

interface RenderPortalProps {
    defaultScene: Scene;
    defaultCamera: OrthographicCamera;
    overrideRenderLoop?: boolean;
    renderPriority?: number;
}

interface TriangleGeometryProps {
    ref?: Ref<Group>;
}

interface CompassGraphicProps {
    northColor?: number;
    southColor?: number;
}

declare const RenderPortal: ForwardRefExoticComponent<
    RenderPortalProps & RefAttributes<OrthographicCamera>
>;

declare const TriangleGeometry: ForwardRefExoticComponent<
    TriangleGeometryProps & RefAttributes<Group>
>;

declare const CompassGraphic: ForwardRefExoticComponent<
    CompassGraphicProps & RefAttributes<Group>
>;

export declare const CompassGizmo: ForwardRefExoticComponent<
    CompassGizmoProps & RefAttributes<Group>
>;
