import type {
    TilesGroup,
    TilesRenderer as TilesRendererImpl
} from "../../index";
import type {
    ReactNode,
    Context,
    FC,
    RefAttributes,
    JSX
} from 'react';

export type TilesRendererContext = Context<TilesRendererImpl | null>;

export interface EastNorthUpFrameProps {
    lat?: number;
    lon?: number;
    height?: number;
    az?: number;
    el?: number;
    roll?: number;
    children?: ReactNode;
}

export type EastNorthUpFrame = FC<EastNorthUpFrameProps>;

export type TilesPluginProps<
    Plugin extends new (...args: any[]) => any,
    Params extends {} = ConstructorParameters<Plugin>[0] extends {}
    ? ConstructorParameters<Plugin>[0]
    : {}
> = Partial<Params> & {
    plugin: Plugin;
    args?: Params | [Params];
};

export type TilesPlugin = <
    Plugin extends new (...args: any[]) => any,
    Params extends {} = ConstructorParameters<Plugin>[0] extends {}
    ? ConstructorParameters<Plugin>[0]
    : {}
>(
    props: TilesPluginProps<Plugin, Params> & RefAttributes<Plugin>
) => JSX.Element;

export interface TilesRendererProps extends Partial<TilesRendererImpl> {
    url?: string;
    group?: TilesGroup;
    children?: ReactNode;
}

export type TilesRenderer = FC<
    TilesRendererProps & RefAttributes<TilesRendererImpl>
>;
