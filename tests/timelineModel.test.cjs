const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const sourcePath = path.join(__dirname, '..', 'components', 'video-editor', 'timelineModel.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  require: (id) => {
    if (id === '@/types/editor') return {};
    return require(id);
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });

const {
  calculateTimelineDuration,
  clampPlayhead,
  getRenderableClips,
  getTimelineStackItems,
  moveClip,
  reorderTimelineStack,
  resizeImageClipEnd,
  sourceTimeForClip,
  trimClipEnd,
  trimClipStart,
} = sandbox.module.exports;

function clip(overrides = {}) {
  return {
    id: 'clip-a',
    assetId: 'asset-a',
    canvasObjectId: 'object-a',
    type: 'video',
    timelineStart: 0,
    sourceStart: 0,
    sourceEnd: 40,
    duration: 40,
    muted: false,
    volume: 0.75,
    selected: false,
    ...overrides,
  };
}

function object(overrides = {}) {
  return {
    id: 'object-a',
    assetId: 'asset-a',
    clipId: 'clip-a',
    type: 'video',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    selected: false,
    drawOrder: 2,
    ...overrides,
  };
}

function layer(overrides = {}) {
  return {
    id: 'layer-a',
    type: 'text',
    x: 10,
    y: 10,
    width: 30,
    height: 10,
    zIndex: 1,
    name: 'Text 1',
    startTime: 0,
    endTime: 10,
    text: 'Hello',
    ...overrides,
  };
}

assert.equal(calculateTimelineDuration([clip({ duration: 40 }), clip({ id: 'clip-b', duration: 20 })]), 40);
assert.equal(calculateTimelineDuration([clip({ duration: 40 }), clip({ id: 'clip-b', timelineStart: 30, duration: 20 })]), 50);
assert.equal(calculateTimelineDuration([]), 0);
assert.equal(calculateTimelineDuration([clip({ duration: 20 })]), 20);

const trimmedEnd = trimClipEnd(clip(), 25);
assert.equal(trimmedEnd.sourceEnd, 25);
assert.equal(trimmedEnd.duration, 25);
const reExtendedEnd = trimClipEnd(trimmedEnd, 50, 40);
assert.equal(reExtendedEnd.sourceEnd, 40);
assert.equal(reExtendedEnd.duration, 40);

const trimmedStart = trimClipStart(clip(), 10);
assert.equal(trimmedStart.sourceStart, 10);
assert.equal(trimmedStart.duration, 30);
assert.equal(trimmedStart.timelineStart, 10);

const trimmedThreeToSeven = trimClipEnd(
  trimClipStart(clip({ sourceEnd: 10, duration: 10 }), 3),
  7,
  10
);
assert.equal(trimmedThreeToSeven.sourceStart, 3);
assert.equal(trimmedThreeToSeven.sourceEnd, 7);
assert.equal(trimmedThreeToSeven.duration, 4);
assert.equal(trimmedThreeToSeven.timelineStart, 3);

const shrinkBothSides = trimClipEnd(trimClipStart(clip(), 2), 5);
assert.equal(shrinkBothSides.sourceStart, 2);
assert.equal(shrinkBothSides.duration, 3);
assert.equal(shrinkBothSides.sourceEnd, 5);
const trimmedWindow = trimClipEnd(shrinkBothSides, shrinkBothSides.sourceStart + 3);
assert.equal(trimmedWindow.sourceStart, 2);
assert.equal(trimmedWindow.sourceEnd, 5);
assert.equal(trimmedWindow.duration, 3);

const zeroDuration = trimClipEnd(shrinkBothSides, shrinkBothSides.sourceStart);
assert.equal(zeroDuration.duration, 3);

assert.equal(trimClipEnd(clip(), 0).duration, 3);
assert.equal(trimClipStart(clip(), 40).duration, 3);
assert.equal(trimClipStart(clip({ sourceEnd: Number.POSITIVE_INFINITY, duration: 5 }), 3).duration, 3);
assert.equal(trimClipEnd(clip({ sourceEnd: Number.POSITIVE_INFINITY, duration: 5 }), 4).duration, 4);

const imageDurationTen = resizeImageClipEnd(clip({ type: 'image', sourceEnd: 5, duration: 5 }), 10);
assert.equal(imageDurationTen.sourceEnd, 10);
assert.equal(imageDurationTen.duration, 10);
const imageDurationTwenty = resizeImageClipEnd(imageDurationTen, 20);
assert.equal(imageDurationTwenty.sourceEnd, 20);
assert.equal(imageDurationTwenty.duration, 20);
assert.equal(resizeImageClipEnd(imageDurationTwenty, 0).duration, 1);

const clipA = clip({ id: 'a', assetId: 'same', muted: true });
const clipB = clip({ id: 'b', assetId: 'same', muted: false });
assert.equal(clipA.muted, true);
assert.equal(clipB.muted, false);

const assets = [
  { id: 'deployed', type: 'video', url: '/ok.mp4', originalFileName: 'ok.mp4', width: 10, height: 10, duration: 10, status: 'deployed', createdAt: 1, metadataLoaded: true },
  { id: 'uploading', type: 'video', url: '', originalFileName: 'pending.mp4', width: 0, height: 0, duration: 10, status: 'uploading', createdAt: 1, metadataLoaded: false },
  { id: 'failed', type: 'video', url: '', originalFileName: 'bad.mp4', width: 0, height: 0, duration: 10, status: 'failed', createdAt: 1, metadataLoaded: false },
];
assert.deepEqual(
  getRenderableClips([
    clip({ id: 'ok', assetId: 'deployed', duration: 10, sourceEnd: 10 }),
    clip({ id: 'pending', assetId: 'uploading', duration: 10, sourceEnd: 10 }),
    clip({ id: 'bad', assetId: 'failed', duration: 10, sourceEnd: 10 }),
  ], assets, 2).map((item) => item.id),
  ['ok']
);

const mixedStack = getTimelineStackItems(
  [layer({ id: 'text-low', zIndex: 1 }), layer({ id: 'text-high', zIndex: 3 })],
  [clip({ id: 'video-mid', canvasObjectId: 'object-mid' })],
  [object({ id: 'object-mid', clipId: 'video-mid', drawOrder: 2 })]
);
assert.deepEqual([...mixedStack.map((item) => `${item.kind}:${item.id}`)], [
  'layer:text-high',
  'clip:video-mid',
  'layer:text-low',
]);

const reorderedStack = reorderTimelineStack(
  'layer',
  'text-low',
  0,
  [layer({ id: 'text-low', zIndex: 1 }), layer({ id: 'text-high', zIndex: 3 })],
  [clip({ id: 'video-mid', canvasObjectId: 'object-mid' })],
  [object({ id: 'object-mid', clipId: 'video-mid', drawOrder: 2 })]
);
assert.ok(reorderedStack);
assert.equal(reorderedStack.layers.find((item) => item.id === 'text-low').zIndex, 3);
assert.equal(reorderedStack.layers.find((item) => item.id === 'text-high').zIndex, 2);
assert.equal(reorderedStack.canvasObjects.find((item) => item.id === 'object-mid').drawOrder, 1);

assert.equal(sourceTimeForClip(clip({ timelineStart: 5, sourceStart: 12 }), 8), 15);
assert.equal(clampPlayhead(50, 20), 20);
assert.equal(moveClip(clip({ sourceStart: 10, sourceEnd: 20, duration: 10 }), 30).sourceStart, 10);
assert.equal(calculateTimelineDuration([moveClip(clip({ duration: 20 }), 30)]), 50);

console.log('timelineModel tests passed');
