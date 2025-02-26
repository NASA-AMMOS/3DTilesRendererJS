import { Camera } from 'three';
import { CameraTransitionManager } from '3d-tiles-renderer';

export interface CameraTransitionProps {
    mode?: 'perspective' | 'orthographic';
    onBeforeToggle?: (manager: CameraTransitionManager, targetCamera: Camera) => void;
    perspectiveCamera?: Camera;
    orthographicCamera?: Camera;
    [key: string]: any;
}

// The CameraTransition component itself
export declare const CameraTransition: React.ForwardRefExoticComponent<
    CameraTransitionProps & React.RefAttributes<CameraTransitionManager>
>;