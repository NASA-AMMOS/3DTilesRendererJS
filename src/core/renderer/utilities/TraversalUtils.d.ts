import { Tile } from '../tiles/Tile.js';

// Helper function for traversing a tile set. If `beforeCb` returns `true` then the
// traversal will end early.
export function traverseSet(
	tile: Tile,
	beforeCb?: ( (
		tile: Tile,
		parent: Tile | null,
		depth: number,
	) => boolean | void ) | null,
	afterCb?: ( ( tile: Tile, parent: Tile | null, depth: number ) => void ) | null,
): void;

// Traverses the ancestry of the tile up to the root tile.
export function traverseAncestors(
	tile: Tile,
	callback?: ( ( current: Tile, parent: Tile | null, depth: number ) => void ) | null,
): void;
