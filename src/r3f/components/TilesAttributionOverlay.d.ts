import type { CanvasDOMOverlayProps } from '3d-tiles-renderer/r3f';
import type { ReactNode, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { CSSProperties } from 'react';

type Attribution = {
    type: 'string' | 'html' | 'image';
    value: any;
};

interface TilesAttributionOverlayProps extends CanvasDOMOverlayProps {
    style?: CSSProperties;
    generateAttributions?: ( ( attributions: Attribution[], classId: string ) => ReactNode ) | null;
}

export declare const TilesAttributionOverlay: ForwardRefExoticComponent<
    TilesAttributionOverlayProps & RefAttributes<TilesAttributionOverlayProps>
>;