import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes, ReactNode } from 'react';

export interface CanvasDOMOverlayProps extends ComponentPropsWithoutRef<'div'> {
    /**
     * Elements to be rendered inside the overlay.
     */
    children?: ReactNode;
}

/**
 * CanvasDOMOverlay component for overlaying DOM elements on top of the Three.js canvas.
 * Forwards a ref to the underlying HTMLDivElement.
 */
export declare const CanvasDOMOverlay: ForwardRefExoticComponent<
    CanvasDOMOverlayProps & RefAttributes<HTMLDivElement>
>;
