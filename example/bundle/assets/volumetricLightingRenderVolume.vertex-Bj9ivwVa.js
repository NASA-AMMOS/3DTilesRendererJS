import{p as t}from"./lil-gui.esm-B6p285Hr.js";import"./TilesRendererBase-CFsQu8zV.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoaderBase-w5mdSgm-.js";const e="volumetricLightingRenderVolumeVertexShader",o=`#include<sceneUboDeclaration>
#include<meshUboDeclaration>
attribute position : vec3f;varying vWorldPos: vec4f;@vertex
fn main(input : VertexInputs)->FragmentInputs {let worldPos=mesh.world*vec4f(vertexInputs.position,1.0);vertexOutputs.vWorldPos=worldPos;vertexOutputs.position=scene.viewProjection*worldPos;}
`;t.ShadersStoreWGSL[e]||(t.ShadersStoreWGSL[e]=o);const d={name:e,shader:o};export{d as volumetricLightingRenderVolumeVertexShaderWGSL};
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-Bj9ivwVa.js.map
