export class Scheduler {

	static setXRSession( session: XRSession ): void;
	static requestAnimationFrame( cb: Function ): number;
	static cancelAnimationFrame( handle: number ): void;
	static flushPending(): void;

}
