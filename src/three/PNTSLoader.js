import { PNTSLoaderBase } from "../base/PNTSLoaderBase.js";
import {
	Points,
	PointsMaterial,
	BufferGeometry,
	BufferAttribute,
	DefaultLoadingManager,
} from "three";

const DRACO_ATTRIBUTE_MAP = {
	RGB: "color",
	POSITION: "position",
};
export class PNTSLoader extends PNTSLoaderBase {
	constructor(manager = DefaultLoadingManager) {
		super();
		this.manager = manager;

		// very hacky way of getting the draco loader
		this.dracoLoader = this.manager.getHandler("test.drc");
	}

	parse(buffer) {
		return super.parse(buffer).then(async (result) => {
			const { featureTable } = result;

			const geometry = new BufferGeometry();
			const material = new PointsMaterial();

			if (featureTable.isDraco()) {
				const dracoIDs = featureTable.getDracoProperties();
				const attributeIDs = {};

				for (let [key, value] of Object.entries(dracoIDs)) {
					attributeIDs[DRACO_ATTRIBUTE_MAP[key]] = value;
				}

				const taskConfig = {
					attributeIDs,
					attributeTypes: {
						position: "Float32Array",
						color: "Uint8Array",
					},
					useUniqueIDs: true,
				};

				const buffer = featureTable.getDracoBuffer();

				if (this.dracoLoader == null) {
					throw new Error("PNTSLoader: dracoLoader not available.");
				}

				const dracoGeometry = await this.dracoLoader
					.decodeGeometry(buffer, taskConfig)
					.catch(() => new BufferGeometry());

				geometry.copy(dracoGeometry);

				if (geometry.attributes.color) {
					geometry.attributes.color.normalized = true;
					material.vertexColors = true;
				}
			} else {
				const POINTS_LENGTH = featureTable.getData("POINTS_LENGTH");
				POSITION = featureTable.getData(
					"POSITION",
					POINTS_LENGTH,
					"FLOAT",
					"VEC3"
				);
				geometry.setAttribute(
					"position",
					new BufferAttribute(POSITION, 3, false)
				);

				RGB = featureTable.getData(
					"RGB",
					POINTS_LENGTH,
					"UNSIGNED_BYTE",
					"VEC3"
				);

				if (RGB !== null) {
					geometry.setAttribute("color", new BufferAttribute(RGB, 3, true));
					material.vertexColors = true;
				}
			}

			[
				"QUANTIZED_VOLUME_OFFSET",
				"QUANTIZED_VOLUME_SCALE",
				"CONSTANT_RGBA",
				"BATCH_LENGTH",
				"POSITION_QUANTIZED",
				"RGBA",
				"RGB565",
				"NORMAL",
				"NORMAL_OCT16P",
			].forEach((feature) => {
				if (feature in featureTable.header) {
					console.warn(
						`PNTSLoader: Unsupported FeatureTable feature "${feature}" detected.`
					);
				}
			});

			const object = new Points(geometry, material);
			result.scene = object;
			result.scene.featureTable = featureTable;

			const rtcCenter = featureTable.getData("RTC_CENTER");

			if (rtcCenter) {
				result.scene.position.x += rtcCenter[0];
				result.scene.position.y += rtcCenter[1];
				result.scene.position.z += rtcCenter[2];
			}

			return result;
		});
	}
}
