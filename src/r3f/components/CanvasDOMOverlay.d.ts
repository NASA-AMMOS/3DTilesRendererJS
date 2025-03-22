import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface CanvasDOMOverlayProps extends ComponentPropsWithoutRef<'div'> {
    children?: ReactNode;
}
