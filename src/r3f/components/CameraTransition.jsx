export function CameraTransition( props ) {

    const {
        perspectiveCamera,
        orthographicCamera,
        mode,
        onTransitionStart,
        onTransitionEnd,
     } = props;

    // TODO: assign the camera to the "useThree" object
    // TODO: toggle controls on transition start and end
    // TODO: set the pivot point (use raycast otherwise)
    // TODO: only adjust and sync cameras if setting is true
    const manager = useMemo( () => {

        const manager = new CameraTransitionManager();
        manager.autoSync = false;
        return manager;

    } );

    useEffect( () => {

        const oldPerspectiveCamera = manager.perspectiveCamera;
        const oldOrthographicCamera = manager.orthographicCamera;
        manager.perspectiveCamera = perspectiveCamera || oldPerspectiveCamera;
        manager.orthographicCamera = orthographicCamera || oldOrthographicCamera;
        return () => {

            manager.perspectiveCamera = oldPerspectiveCamera;
            manager.orthographicCamera = oldOrthographicCamera;

        };
        
    }, [ perspectiveCamera, orthographicCamera ] );

    useEffect( () => {

        const toOrtho = mode === 'ortho';
        const isOrtho = manager.camera.isOrthographicCamera;
        if ( toOrtho !== isOrtho ) {

            // TODO: assign the pivot point
            manager.syncCameras();
            // TODO: if env controls then adjust the camera
            manager.toggle();

        }

    }, [ mode ] );  

    useFrame( () => {

        manager.update();

    } );

}
