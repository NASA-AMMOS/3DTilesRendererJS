import { ReactNode, Ref } from 'react';
import { Group, Scene, OrthographicCamera } from 'three';

export interface CompassGizmoProps {
    children?: ReactNode;
    overrideRenderLoop?: boolean;
    mode?: '3d' | '2d';
    margin?: number;
    scale?: number;
    visible?: boolean;
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

declare function RenderPortal(props: RenderPortalProps): ReactNode;
declare function TriangleGeometry(props: TriangleGeometryProps): ReactNode;
declare function CompassGraphic(props: CompassGraphicProps): ReactNode;
declare function CompassGizmo(props: CompassGizmoProps): ReactNode;

export { RenderPortal, TriangleGeometry, CompassGraphic, CompassGizmo };
