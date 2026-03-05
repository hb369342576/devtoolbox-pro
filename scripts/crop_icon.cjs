const { Jimp } = require('jimp');

async function processIcon() {
    try {
        console.log('Reading image...');
        const image = await Jimp.read('src-tauri/icons/icon.png');
        const width = image.bitmap.width; // Should be 512
        
        // The crop area
        const cropFactor = 0.76;
        const newSize = Math.floor(width * cropFactor);
        const offset = Math.floor((width - newSize) / 2);
        
        console.log(`Manual crop and scale: offset=${offset}, size=${newSize}`);
        
        // Read original pixels into an array first to avoid overwriting ourselves during interpolation
        const origPixels = new Uint32Array(width * width);
        for(let y = 0; y < width; y++) {
            for(let x = 0; x < width; x++) {
                origPixels[y * width + x] = image.getPixelColor(x, y);
            }
        }
        
        const radius = Math.floor(512 * 0.22); // 22% border radius
        
        const getRGBA = (hex) => {
            return {
                r: (hex >>> 24) & 255,
                g: (hex >>> 16) & 255,
                b: (hex >>> 8) & 255,
                a: hex & 255
            };
        };
        
        for (let x = 0; x < 512; x++) {
            for (let y = 0; y < 512; y++) {
                // Map x,y (0-511) to original image patch using nearest neighbor
                const srcX = Math.floor(offset + (x / 512) * newSize);
                const srcY = Math.floor(offset + (y / 512) * newSize);
                
                let rx = -1, ry = -1;
                if (x < radius && y < radius) { rx = radius; ry = radius; }
                else if (x >= 512 - radius && y < radius) { rx = 512 - radius; ry = radius; }
                else if (x < radius && y >= 512 - radius) { rx = radius; ry = 512 - radius; }
                else if (x >= 512 - radius && y >= 512 - radius) { rx = 512 - radius; ry = 512 - radius; }
                
                const origColor = origPixels[srcY * width + srcX];
                
                if (rx !== -1 && ry !== -1) {
                    const dist = Math.sqrt((x - rx)*(x - rx) + (y - ry)*(y - ry));
                    if (dist > radius) {
                        image.setPixelColor(0x00000000, x, y); 
                    } else if (dist > radius - 1.5) {
                        const color = getRGBA(origColor);
                        const alpha = Math.floor(color.a * (radius - dist));
                        const finalAlpha = Math.max(0, Math.min(255, alpha));
                        const newHex = (((color.r << 24) | (color.g << 16) | (color.b << 8) | finalAlpha) >>> 0);
                        image.setPixelColor(newHex, x, y);
                    } else {
                        image.setPixelColor(origColor, x, y);
                    }
                } else {
                    image.setPixelColor(origColor, x, y);
                }
            }
        }
        
        // Write it safely
        if (typeof image.writeAsync === 'function') {
            await image.writeAsync('src-tauri/icons/icon.png');
        } else {
            image.write('src-tauri/icons/icon.png');
        }
        console.log('Successfully applied manual crop & rounded corners!');
    } catch(e) {
        console.error("Processing error:", e.message || String(e));
    }
}
processIcon();
