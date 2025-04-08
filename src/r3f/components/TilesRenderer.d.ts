import type { TilesRenderer as TilesRendererImpl, TilesRendererEventMap } from '../../three/TilesRenderer';
import type {
	ReactNode,
	Context,
	ForwardRefExoticComponent,
	RefAttributes,
	JSX,
} from 'react';

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
	Plugin extends new ( ...args: any[] ) => void,
	Params extends any[] = ConstructorParameters<Plugin>,
> {
	plugin: Plugin;
	args?: Params;
	[key: string]: Params | Plugin | any;
}

export declare const TilesPlugin: <
	Plugin extends new ( ...args: any[] ) => void,
	Params extends any[] = ConstructorParameters<Plugin>,
>(
	props: TilesPluginProps<Plugin, Params> & RefAttributes<Plugin>,
) => JSX.Element;

// dynamically mapping keys of TilesRendererEventMap to onCamelCased
type CamelCase<S extends string> = S extends `${infer T}-${infer U}`
	? `${T}${Capitalize<CamelCase<U>>}`
	: S;

type EventHandler<K extends keyof TilesRendererEventMap> = (
	event: TilesRendererEventMap[K],
) => void;

type TilesRendererEventMapForR3f = {
	[K in keyof TilesRendererEventMap as `on${Capitalize<CamelCase<K>>}`]?: EventHandler<K>;
};

interface TilesRendererProps
	extends Partial<TilesRendererImpl>,
	TilesRendererEventMapForR3f {
	url?: string;
	enabled?: boolean;
	dispose?: () => void;
	children?: ReactNode;
}

export declare const TilesRenderer: ForwardRefExoticComponent<
	TilesRendererProps & RefAttributes<TilesRendererImpl>
>;
