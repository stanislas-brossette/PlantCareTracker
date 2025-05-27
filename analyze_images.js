const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Jimp = require('jimp');

function getJpegSize(buffer) {
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) return null;
  let i = 2;
  while (i < buffer.length) {
    if (buffer[i] === 0xFF) {
      const marker = buffer[i+1];
      const len = buffer.readUInt16BE(i+2);
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        const height = buffer.readUInt16BE(i+5);
        const width = buffer.readUInt16BE(i+7);
        return {width, height};
      }
      i += 2 + len;
    } else {
      i++;
    }
  }
  return null;
}

const dir = path.join(__dirname, 'public', 'images');
const result = [];
fs.readdirSync(dir).forEach(file => {
  const buffer = fs.readFileSync(path.join(dir, file));
  const size = getJpegSize(buffer);
  if (size) {
    result.push({file, ...size});
  }
});

let totalWidth = 0, totalHeight = 0;
result.forEach(r => { totalWidth += r.width; totalHeight += r.height; });
const avgWidth = Math.round(totalWidth / result.length);
const avgHeight = Math.round(totalHeight / result.length);
console.log('count', result.length);
console.log('avgWidth', avgWidth, 'avgHeight', avgHeight);
console.log(result.map(r => `${r.file}: ${r.width}x${r.height}`).join('\n'));

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(/^y(es)?$/i.test(answer.trim()));
  }));
}

(async () => {
  const confirm = await ask('Crop and scale all images to 600x600? (y/N) ');
  if (!confirm) return;
  for (const { file } of result) {
    const imgPath = path.join(dir, file);
    try {
      const img = await Jimp.read(imgPath);
      img.cover(600, 600).quality(80);
      await img.writeAsync(imgPath);
      console.log('Resized', file);
    } catch (err) {
      console.error('Failed to resize', file, err.message);
    }
  }
})();
