export class SubtreeTile {

	constructor(parentTile, childMortonIndex) {

		this.parent = parentTile;
		this.children = [];


		// Number of leaves in the subtree	(should go from 0 to 4 (Quadtree) or 8 (Octree)
		this.__level = (parentTile.__depth ?? parentTile.__level) + 1;

		//index inside of the tree
		this.__subtreeIdx = childMortonIndex;


		this.__basePath = parentTile.__basePath;

		let coord = getSubtreeCoordinates(this, parentTile);
		this.__x = coord.x;
		this.__y = coord.y;


	}


}

function getSubtreeCoordinates(tile, parentTile) {

	if (!parentTile) {
		return {x: 0, y: 0}
	}

	const x = 2 * parentTile.__x + (tile.__subtreeIdx % 2);
	const y = 2 * parentTile.__y + (Math.floor(tile.__subtreeIdx / 2) % 2);
	//TODO z coord

	return {x, y};

}


