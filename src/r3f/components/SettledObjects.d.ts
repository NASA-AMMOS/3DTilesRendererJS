import { ReactNode } from 'react';
import { Vector3, Ray } from 'three';
import { Camera } from '@react-three/fiber';

interface SettledObjectProps {
    component?: ReactNode;
    lat?: number | null;
    lon?: number | null;
    rayorigin?: Vector3 | null;
    raydirection?: Vector3 | null;
    onQueryUpdate?: ( hit: any ) => void;
    [key: string]: any;
}

interface AnimatedSettledObjectProps extends SettledObjectProps {
    interpolationFactor?: number;
}

interface SettledObjectsProps {
    scene?: any;
    children?: ReactNode;
    [key: string]: any;
}

interface QueryManagerContextType {
    registerLatLonQuery( lat: number, lon: number, callback: Function ): number;
    unregisterQuery( index: number ): void;
    registerRayQuery( ray: Ray, callback: Function ): number;
    setScene( scene: any[] ): void;
    addCamera( camera: Camera ): void;
    setEllipsoidFromTilesRenderer( tiles: any ): void;
    dispose(): void;
}

export const QueryManagerContext: React.Context<QueryManagerContextType | null>;

export const AnimatedSettledObject: React.ForwardRefExoticComponent<
    AnimatedSettledObjectProps & React.RefAttributes<AnimatedSettledObjectProps>
>;

export const SettledObject: React.ForwardRefExoticComponent<
    SettledObjectProps & React.RefAttributes<SettledObjectProps>
>;

export const SettledObjects: React.ForwardRefExoticComponent<
    SettledObjectsProps & React.RefAttributes<SettledObjectsProps>
>;
