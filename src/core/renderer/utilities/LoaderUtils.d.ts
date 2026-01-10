export function readMagicBytes( bufferOrDataView: ArrayBufferLike | DataView ): string | null;

export function arrayToString( array: AllowSharedBufferSource ): string;

// Returns a working path with a trailing slash
export function getWorkingPath( url: string ): string;
