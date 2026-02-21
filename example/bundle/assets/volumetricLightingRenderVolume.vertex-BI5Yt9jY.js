import{p as o}from"./lil-gui.esm-B6p285Hr.js";import"./TilesRendererBase-CFsQu8zV.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoaderBase-w5mdSgm-.js";const e="volumetricLightingRenderVolumeVertexShader",r=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`;o.ShadersStore[e]||(o.ShadersStore[e]=r);const c={name:e,shader:r};export{c as volumetricLightingRenderVolumeVertexShader};
//# sourceMappingURL=volumetricLightingRenderVolume.vertex-BI5Yt9jY.js.map
