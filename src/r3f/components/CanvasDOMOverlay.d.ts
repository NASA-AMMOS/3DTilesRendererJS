import { ComponentProps, FC, Ref } from "react";

export interface CanvasDOMOverlayProps extends ComponentProps<'div'> {}

export type CanvasDOMOverlay = FC<CanvasDOMOverlayProps & { ref?: Ref<HTMLDivElement> }>;
