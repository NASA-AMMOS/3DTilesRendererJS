import { LoaderBase } from '3d-tiles-renderer/core';

export interface WMSService {
    name: string;
    title: string;
    abstract: string;
    keywords: string[];
}

export interface WMSStyle {
    name: string;
    title: string;
    legendUrl: string;
	legendFormats?: string[];
    legendWidth?: number | null;
    legendHeight?: number | null;
}

export interface WMSBoundingBox {
    crs: string;
    bounds: [number, number, number, number];
}

export interface WMSLayer {
    name: string;
    title: string;
    abstract: string;
    queryable: boolean;
    opaque: boolean;
    keywords: string[];
    crs: string[];
    boundingBox: WMSBoundingBox;
    contentBoundingBox: [ number, number, number, number ];
    styles: WMSStyle[];
    subLayers: WMSLayer[];
}

export interface WMSDCPType {
    type: 'HTTP';
    get: string;
    post: string;
}

export interface WMSRequestOperation {
    formats: string[];
    dcp: WMSDCPType[];
	href: string;
}

export type WMSRequestMap = {
	[operationName: string]: WMSRequestOperation;
};

export interface WMSCapabilitiesResult {
    service: WMSService;
    layers: WMSLayer[];
    layerMap: { [ key: string ]: WMSLayer };
	request: WMSRequestMap;
}

export class WMSCapabilitiesLoader<Result = WMSCapabilitiesResult, ParseResult = Result>
	extends LoaderBase<Result, ParseResult> {}
