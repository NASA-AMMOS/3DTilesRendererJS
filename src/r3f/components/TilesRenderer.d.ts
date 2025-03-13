import type { TilesGroup, TilesRenderer as TilesRendererImpl } from "../../index";
import type { ReactNode, Context, ForwardRefExoticComponent, RefAttributes, JSX } from 'react';
import type { Camera, WebGLRenderer } from 'three';

export declare const TilesRendererContext: Context<TilesRendererImpl | null>;

interface EastNorthUpFrameProps {
    lat?: number;
    lon?: number;
    height?: number;
    az?: number;
    el?: number;
    roll?: number;
    children?: ReactNode;
}

export declare const EastNorthUpFrame: ForwardRefExoticComponent<
    EastNorthUpFrameProps & RefAttributes<any>
>;

interface TilesPluginProps<
    Plugin extends new (...args: any[]) => any,
    Params extends {} = ConstructorParameters<Plugin>[0] extends {}
    ? ConstructorParameters<Plugin>[0]
    : {}
> {
    plugin: Plugin;
    args?: Params | [Params];
    [key: string]: any;
}

export declare const TilesPlugin: <
    Plugin extends new (...args: any[]) => any,
    Params extends {} = ConstructorParameters<Plugin>[0] extends {}
    ? ConstructorParameters<Plugin>[0]
    : {}
>(
    props: TilesPluginProps<Plugin, Params> & RefAttributes<Plugin>
) => JSX.Element;

export interface TilesRendererProps extends Partial<TilesRendererImpl>, DashedProperties<TilesRendererImpl> {
    url?: string;
    group?: TilesGroup;
    enabled?: boolean;
    autoDisableRendererCulling?: boolean;
    cameras?: Camera[];
    setCamera?: (camera: Camera) => boolean;
    deleteCamera?: (camera: Camera) => boolean;
    setResolutionFromRenderer?: (camera: Camera, renderer: WebGLRenderer) => boolean;
    dispose?: () => void;
    onLoadTileSet?: () => void;
    onLoadContent?: () => void;
    onTileVisibilityChange?: (tile: any, visible: boolean) => void;
    children?: ReactNode;
}

export declare const TilesRenderer: ForwardRefExoticComponent<
    TilesRendererProps & RefAttributes<TilesRendererImpl>
>;
