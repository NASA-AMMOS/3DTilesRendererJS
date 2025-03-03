import { ReactNode } from 'react';
import { Vector3, Ray } from 'three';
import { Camera } from '@react-three/fiber';

interface AnimatedSettledObjectProps {
    interpolationFactor?: number;
    onQueryUpdate?: (hit: any) => void;
    lat?: number | null;
    lon?: number | null;
    rayorigin?: Vector3 | null;
    raydirection?: Vector3 | null;
    [key: string]: any;
}

interface SettledObjectProps {
    component?: ReactNode;
    lat?: number | null;
    lon?: number | null;
    rayorigin?: Vector3 | null;
    raydirection?: Vector3 | null;
    onQueryUpdate?: (hit: any) => void;
    [key: string]: any;
}

interface SettledObjectsProps {
    scene?: any;
    children?: ReactNode;
    [key: string]: any;
}

interface QueryManagerContextType {
    registerLatLonQuery(lat: number, lon: number, callback: Function): number;
    unregisterQuery(index: number): void;
    registerRayQuery(ray: Ray, callback: Function): number;
    setScene(scene: any[]): void;
    addCamera(camera: Camera): void;
    setEllipsoidFromTilesRenderer(tiles: any): void;
    dispose(): void;
}

export const QueryManagerContext: React.Context<QueryManagerContextType | null>;

export const AnimatedSettledObject: React.ForwardRefExoticComponent<
    AnimatedSettledObjectProps & React.RefAttributes<any>
>;

export const SettledObject: React.ForwardRefExoticComponent<
    SettledObjectProps & React.RefAttributes<any>
>;

export const SettledObjects: React.ForwardRefExoticComponent<
    SettledObjectsProps & React.RefAttributes<any>
>;
