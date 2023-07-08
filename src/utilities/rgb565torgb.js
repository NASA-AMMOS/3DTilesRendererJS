export function rgb565torgb( rgb565 ) {

	let r = ( rgb565 & 0xF800 ) >> 11;
	let g = ( rgb565 & 0x07E0 ) >> 5;
	let b = rgb565 & 0x001F;
	r = ( r << 3 ) | ( r >> 2 ); // Scale up red component
	g = ( g << 2 ) | ( g >> 4 ); // Scale up green component
	b = ( b << 3 ) | ( b >> 2 ); // Scale up blue component
	return [ r, g, b ];

}
