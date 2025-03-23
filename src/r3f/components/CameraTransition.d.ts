import { Camera } from 'three';
import { CameraTransitionManager } from '../../three/controls/CameraTransitionManager';

interface CameraTransitionProps {
    mode?: 'perspective' | 'orthographic';
    onBeforeToggle?: ( manager: CameraTransitionManager, targetCamera: Camera ) => void;
    perspectiveCamera?: Camera;
    orthographicCamera?: Camera;
}

export declare const CameraTransition: React.ForwardRefExoticComponent<
    CameraTransitionProps & React.RefAttributes<CameraTransitionManager>
>;
