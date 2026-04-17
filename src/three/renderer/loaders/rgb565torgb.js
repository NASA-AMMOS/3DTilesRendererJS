// The implementation of rgb565 to rgb888 is from
// https://rgbcolorpicker.com/565

export function rgb565torgb( rgb565 ) {

	// Shift the red value to the right by 11 bits.
	const red5 = rgb565 >> 11;
	// Shift the green value to the right by 5 bits and extract the lower 6 bits.
	const green6 = ( rgb565 >> 5 ) & 0b111111;
	// Extract the lower 5 bits.
	const blue5 = rgb565 & 0b11111;

	// Convert 5-bit red to 8-bit red.
	const red8 = Math.round( ( red5 / 31 ) * 255 );
	// Convert 6-bit green to 8-bit green.
	const green8 = Math.round( ( green6 / 63 ) * 255 );
	// Convert 5-bit blue to 8-bit blue.
	const blue8 = Math.round( ( blue5 / 31 ) * 255 );

	return [ red8, green8, blue8 ];

}
