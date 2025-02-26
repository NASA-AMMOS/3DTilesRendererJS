import { CanvasDOMOverlayProps } from "3d-tiles-renderer/r3f";
import { ReactNode } from "react";
import { CSSProperties } from "react";

export type Attribution = {
    type: 'string' | 'html' | 'image';
    value: any;
};

export interface TilesAttributionOverlayProps extends CanvasDOMOverlayProps {
    style?: CSSProperties;
    generateAttributions?: ((attributions: Attribution[], classId: string) => ReactNode) | null;
}

export type TilesAttributionOverlay = FC<TilesAttributionOverlayProps>;
