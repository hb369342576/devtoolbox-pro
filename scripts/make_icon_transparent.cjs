const { Jimp } = require('jimp');

async function processIcon() {
    try {
        console.log('Reading image...');
        const image = await Jimp.read('src-tauri/icons/icon.png');
        
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        
        let modified = 0;
        
        const getRGBA = (hex) => {
            return {
                r: (hex >> 24) & 255,
                g: (hex >> 16) & 255,
                b: (hex >> 8) & 255,
                a: hex & 255
            };
        };

        // This function determines if a pixel is part of the white/cream background or shadow
        const isBackground = (rgba) => {
            if (rgba.a < 5) return true; // Already virtually transparent
            
            const max = Math.max(rgba.r, rgba.g, rgba.b);
            const min = Math.min(rgba.r, rgba.g, rgba.b);
            const diff = max - min;
            
            // If the color lacks saturation (greys, whites, creams, blacks/shadows)
            if (diff < 50) return true;
            
            // If it is very bright overall
            if (min > 200) return true;
            
            // Catch anti-aliased fuzzy edges blending into the cream
            if (max > 210 && diff < 80) return true;
            
            return false;
        };

        const queue = [];
        const visited = new Uint8Array(width * height);
        
        // Start from all edge pixels
        for (let x = 0; x < width; x++) {
            queue.push({x: x, y: 0});
            queue.push({x: x, y: height - 1});
        }
        for (let y = 0; y < height; y++) {
            queue.push({x: 0, y: y});
            queue.push({x: width - 1, y: y});
        }
        
        // Perform flood fill to erase the background from the outside inwards
        while(queue.length > 0) {
            const {x, y} = queue.shift();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            
            const hex = image.getPixelColor(x, y);
            const curColor = getRGBA(hex);
            
            // If it's already transparent, skip over it freely
            if (curColor.a === 0) {
                 queue.push({x: x+1, y: y});
                 queue.push({x: x-1, y: y});
                 queue.push({x: x, y: y+1});
                 queue.push({x: x, y: y-1});
                 continue;
            }
            
            if (isBackground(curColor)) {
                image.setPixelColor(0x00000000, x, y);
                modified++;
                
                queue.push({x: x+1, y: y});
                queue.push({x: x-1, y: y});
                queue.push({x: x, y: y+1});
                queue.push({x: x, y: y-1});
            }
        }
        
        // Second pass: Clean up any isolated background artifacts or fuzzy borders
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const hex = image.getPixelColor(x, y);
                const curColor = getRGBA(hex);
                if (curColor.a > 0 && curColor.a < 255) {
                    if (isBackground(curColor)) {
                        image.setPixelColor(0x00000000, x, y);
                    }
                }
            }
        }

        console.log('Inner white/cream pixels removed:', modified);
        
        await image.write('src-tauri/icons/icon.png');
        console.log('Success! Saved fully transparent icon to src-tauri/icons/icon.png');
        
    } catch (e) {
        console.error('Processing Error:', e);
    }
}
processIcon();
