import { render } from "@testing-library/react";
import { EnvironmentControls, GlobeControls } from "../../src/r3f";
import { TilesRenderer, TilesPlugin } from "../../src/r3f";
import { DeepZoomImagePlugin } from "../../src/plugins";
import { Camera } from "three";
import React from "react";

describe("CameraControls Typing", () => {
	test("EnvironmentControls accepts valid props", () => {
		render(
			<EnvironmentControls domElement={document.createElement("canvas")} />,
		);
	});

	test("GlobeControls rejects invalid props", () => {
		render(<GlobeControls foo={"bar"} />);
	});
});
TilesRenderer;

describe("TilesRenderer Typing", () => {
	test("TilesRenderer accepts correct props", () => {
		render(
			<TilesRenderer
				url="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json"
				enabled
				cameras={[new Camera()]}
			/>,
		);
	});

	test("TilesPlugin correctly infers plugin constructor parameters", () => {
		render(<TilesPlugin plugin={DeepZoomImagePlugin} args={{ foo: "bar" }} />);
	});

	test("DashedProperties allows kebab-case props", () => {
		render(
			<TilesRenderer
				url="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json"
				lruCache-minBytesSize={0.25 * 1e6}
			/>,
		);
	});
	test("DashedProperties rejects invalid props", () => {
		render(
			<TilesRenderer
				url="https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json"
				foo={"bar"}
			/>,
		);
	});
});
