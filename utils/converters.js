import Image from "image-js";

export function uint8ArrayToBase64(uint8Array) {
	let string = '';

	// Convert each byte in the Uint8Array to a character
	uint8Array.forEach(byte => {
		string += String.fromCharCode(byte);
	});

	// Convert the binary string to Base64
	return btoa(string);
}

/**
 * Convert BASE64 to BLOB
 * @param base64Image Pass Base64 image data to convert into the BLOB
 */
export function convertBase64ToBlob(base64Image) {
	// Split into two parts
	const parts = base64Image.split(';base64,');
  
	// Hold the content type
	const imageType = parts[0].split(':')[1];
  
	// Decode Base64 string
	const decodedData = atob(parts[1]);
  
	// Create UNIT8ARRAY of size same as row data length
	const uInt8Array = new Uint8Array(decodedData.length);
  
	// Insert all character code into uInt8Array
	for (let i = 0; i < decodedData.length; ++i) {
	  uInt8Array[i] = decodedData.charCodeAt(i);
	}
  
	// Return BLOB image after conversion
	// return new Blob([uInt8Array], { type: imageType });
	return uInt8Array;
  }

  /**
 * Convert BASE64 to BLOB
 * @param base64Image Pass Base64 image data to convert into the BLOB
 */
export function convertBase64ToArray(base64Image) {
	// Split into two parts
	const parts = base64Image.split(';base64,');
  
	// Hold the content type
	const imageType = parts[0].split(':')[1];
  
	// Decode Base64 string
	const decodedData = atob(parts[1]);
  
	// Create UNIT8ARRAY of size same as row data length
	const uInt8Array = new Uint8Array(decodedData.length);
  
	// Insert all character code into uInt8Array
	for (let i = 0; i < decodedData.length; ++i) {
	  uInt8Array[i] = decodedData.charCodeAt(i);
	}
  
	// Return BLOB image after conversion
	// return new Blob([uInt8Array], { type: imageType });
	return Array.from(uInt8Array);
  }

export async function to2png(base64Image) {
	if(!base64Image.startsWith('data:image/png;base64,')){
		console.log("Not a PNG");
		const uint8Array = convertBase64ToBlob(base64Image);
		const image = await Image.load(uint8Array);
		const pngBuff = image.toBuffer('image/png');
		return  Array.from(pngBuff);
	}
	return convertBase64ToArray(base64Image);
}