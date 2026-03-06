import{by as e}from"./lil-gui.esm-BefRRnNM.js";import"./helperFunctions-Dy59XMeY.js";import"./TilesRendererBase-DGV8eoZf.js";import"./constants-JFoaxC9y.js";import"./BatchTable-CRr3zuRk.js";import"./B3DMLoaderBase-w5mdSgm-.js";const r="rgbdEncodePixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;e.ShadersStore[r]||(e.ShadersStore[r]=o);const S={name:r,shader:o};export{S as rgbdEncodePixelShader};
//# sourceMappingURL=rgbdEncode.fragment-C6F7Y3Xq.js.map
