import{r,h as x,j as t}from"./CameraControls-CECE-7o0.js";import{C as y}from"./CanvasDOMOverlay-7T_txGBK.js";function h(){return crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}function j({children:d,style:m,generateAttributions:u,...p}){const s=r.useContext(x),[c,f]=r.useState([]);r.useEffect(()=>{if(!s)return;let i=!1;const e=()=>{i||(i=!0,queueMicrotask(()=>{f(s.getAttributions()),i=!1}))};return s.addEventListener("tile-visibility-change",e),s.addEventListener("load-tileset",e),()=>{s.removeEventListener("tile-visibility-change",e),s.removeEventListener("load-tileset",e)}},[s]);const n=r.useMemo(()=>"class_"+h(),[]),v=r.useMemo(()=>`
		#${n} a {
			color: white;
		}

		#${n} img {
			max-width: 125px;
			display: block;
			margin: 5px 0;
		}
	`,[n]);let o;if(u)o=u(c,n);else{const i=[];c.forEach((e,a)=>{let l=null;e.type==="string"?l=t.jsx("div",{children:e.value},a):e.type==="html"?l=t.jsx("div",{dangerouslySetInnerHTML:{__html:e.value},style:{pointerEvents:"all"}},a):e.type==="image"&&(l=t.jsx("div",{children:t.jsx("img",{src:e.value})},a)),l&&i.push(l)}),o=t.jsxs(t.Fragment,{children:[t.jsx("style",{children:v}),i]})}return t.jsxs(y,{id:n,style:{position:"absolute",bottom:0,left:0,padding:"10px",color:"rgba( 255, 255, 255, 0.75 )",fontSize:"10px",...m},...p,children:[d,o]})}export{j as T};
//# sourceMappingURL=TilesAttributionOverlay-DPDfX7BB.js.map
