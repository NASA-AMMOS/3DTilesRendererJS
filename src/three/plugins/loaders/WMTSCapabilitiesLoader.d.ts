import { LoaderBase } from '3d-tiles-renderer/core';

interface WMTSBoundingBox {
	crs: string,
	lowerCorner: [ number, number ],
	upperCorner: [ number, number ],
	bounds: [ number, number, number, number ],
}

interface WMTSServiceIdentification {
	title: string;
	abstract: string;
	serviceType: string;
	serviceTypeVersion: string;
}

export interface WMTSTileMatrixSet {
	title: string;
	identifier: string;
	abstract: string;
	supportedCRS: string;
}

export interface WMTSLayer {
	title: string;
	identifier: string;
	format: string;
	boundingBox: WMTSBoundingBox,
	dimensions: Array<{ identifier: string, values: Array<string>, current: boolean, defaultValue: string }>;
	styles: Array<{ identifier: string, title: string, isDefault: string }>,
	resourceUrls: Array<{ template: string, format: string, resourceType: string }>,
	tileMatrixSets: Array<WMTSTileMatrixSet>,
}

export interface WMTSCapabilitiesResult {
	serviceIdentification: WMTSServiceIdentification,
	tileMatrixSets: Array<WMTSTileMatrixSet>,
	layers: Array<WMTSLayer>,
}

export class WMTSCapabilitiesLoader<Result = WMTSCapabilitiesResult, ParseResult = Result>
	extends LoaderBase<Result, ParseResult> {

}
