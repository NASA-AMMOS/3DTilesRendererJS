import{p as r}from"./lil-gui.esm-B6p285Hr.js";import"./TilesRendererBase-CFsQu8zV.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoaderBase-w5mdSgm-.js";const o="oitFinalSimpleBlendPixelShader",e=`precision highp float;uniform sampler2D uFrontColor;void main() {ivec2 fragCoord=ivec2(gl_FragCoord.xy);vec4 frontColor=texelFetch(uFrontColor,fragCoord,0);glFragColor=frontColor;}
`;r.ShadersStore[o]||(r.ShadersStore[o]=e);const d={name:o,shader:e};export{d as oitFinalSimpleBlendPixelShader};
//# sourceMappingURL=oitFinalSimpleBlend.fragment-CbUwPmuG.js.map
