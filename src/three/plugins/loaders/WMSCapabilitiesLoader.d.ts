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
    boundingBoxes: WMSBoundingBox[];
    exGeographicBoundingBox: { bounds: [number, number, number, number] } | null;
    styles: WMSStyle[];
    subLayers: WMSLayer[];
}

export interface WMSCapabilitiesResult {
    service: WMSService;
    layers: WMSLayer[];
}

export class WMSCapabilitiesLoader<Result = WMSCapabilitiesResult, ParseResult = Result>
    extends LoaderBase<Result, ParseResult> {}