const fs = require("fs");
const path = require("path");

const sampleRate = 44100;
const beeps = [
  { frequency: 880, duration: 0.22 },
  { frequency: 1046, duration: 0.22 },
  { frequency: 1318, duration: 0.34 }
];
const gap = 0.12;
const totalDuration =
  0.1 + beeps.reduce((sum, beep) => sum + beep.duration + gap, 0);
const samples = new Int16Array(Math.ceil(totalDuration * sampleRate));

let offset = Math.floor(0.1 * sampleRate);

beeps.forEach(({ frequency, duration }) => {
  const length = Math.floor(duration * sampleRate);

  for (let index = 0; index < length; index += 1) {
    const envelope = Math.min(1, index / 200, (length - index) / 400);
    const value =
      Math.sin((2 * Math.PI * frequency * index) / sampleRate) *
      0.35 *
      envelope;
    samples[offset + index] = Math.round(value * 32767);
  }

  offset += length + Math.floor(gap * sampleRate);
});

const dataSize = samples.length * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

samples.forEach((sample, index) => {
  buffer.writeInt16LE(sample, 44 + index * 2);
});

const target = path.join(
  __dirname,
  "..",
  "src",
  "assets",
  "reminder-alarm.wav"
);
fs.writeFileSync(target, buffer);
console.log(`Generado ${target} (${buffer.length} bytes)`);
