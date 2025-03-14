import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, RefAttributes, ReactNode } from 'react';

interface CanvasDOMOverlayProps extends ComponentPropsWithoutRef<'div'> {
    children?: ReactNode;
}

declare const CanvasDOMOverlay: ForwardRefExoticComponent<
    CanvasDOMOverlayProps & RefAttributes<HTMLDivElement>
>;
