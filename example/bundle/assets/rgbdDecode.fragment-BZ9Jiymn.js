import{by as r}from"./lil-gui.esm-BefRRnNM.js";import"./helperFunctions-Dy59XMeY.js";import"./TilesRendererBase-DGV8eoZf.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoaderBase-w5mdSgm-.js";const e="rgbdDecodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;r.ShadersStore[e]||(r.ShadersStore[e]=o);const n={name:e,shader:o};export{n as rgbdDecodePixelShader};
//# sourceMappingURL=rgbdDecode.fragment-BZ9Jiymn.js.map
