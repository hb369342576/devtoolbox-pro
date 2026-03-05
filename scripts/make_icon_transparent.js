const fs = require('fs');
const Jimp = require('jimp');

async function processIcon() {
    try {
        console.log('Reading image...');
        const image = await Jimp.read('src-tauri/icons/icon.png');
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        
        console.log('Width:', width, 'Height:', height);
        
        // Find background color from top-left pixel
        const bgColorHex = image.getPixelColor(0, 0);
        console.log('Background color:', bgColorHex.toString(16));
        
        const getRGBA = (hex) => {
            return {
                r: (hex >> 24) & 255,
                g: (hex >> 16) & 255,
                b: (hex >> 8) & 255,
                a: hex & 255
            };
        };
        
        const targetBg = getRGBA(bgColorHex);
        
        const colorDist = (c1, c2) => {
            return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
        };
        
        let modified = 0;
        
        // Queue based flood fill from the edges
        const queue = [];
        
        // Add all distinct edge pixels
        for (let x = 0; x < width; x++) {
            queue.push({x: x, y: 0});
            queue.push({x: x, y: height - 1});
        }
        for (let y = 0; y < height; y++) {
            queue.push({x: 0, y: y});
            queue.push({x: width - 1, y: y});
        }
        
        const visited = new Uint8Array(width * height);
        // A bit of tolerance for anti-aliasing edge
        const tolerance = 40; 
        
        while(queue.length > 0) {
            const {x, y} = queue.shift();
            
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            
            const idx = y * width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            
            const curColor = getRGBA(image.getPixelColor(x, y));
            if (colorDist(curColor, targetBg) <= tolerance) {
                // If it's close to background, make it entirely transparent
                image.setPixelColor(0x00000000, x, y);
                modified++;
                
                queue.push({x: x+1, y: y});
                queue.push({x: x-1, y: y});
                queue.push({x: x, y: y+1});
                queue.push({x: x, y: y-1});
            } else if (colorDist(curColor, targetBg) <= tolerance + 40) {
                // For anti-aliasing edges, make it semi-transparent based on distance
                // We'll skip complex alpha blending for now and just set strict boundary
                // or just leave it. Leaving it might create a tiny white border.
                // Let's just use a moderate tolerance.
            }
        }
        
        console.log('Background pixels removed:', modified);
        
        await image.writeAsync('src-tauri/icons/icon.png');
        console.log('Saved transparent icon over src-tauri/icons/icon.png');
        
    } catch (e) {
        console.error('Error:', e);
    }
}
processIcon();
