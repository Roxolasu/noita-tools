import Tesseract from 'tesseract.js';

import genCanvases, { IFontCanvases } from './getFontCanvases';
import { copyImage, crop, enhance, stretch, diff, invert } from './imageActions';

const startCapture = async (
  displayMediaOptions: DisplayMediaStreamConstraints
): Promise<MediaStream | null> => {
  let captureStream: MediaStream;
  try {
    captureStream = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );
  } catch (err) {
    console.error('Error: ' + err);
    return null;
  }
  return captureStream;
};

interface OCRConfig {
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onUpdate?: () => void;
}
class OCRHandler extends EventTarget {
  ready = false;
  loop = false;

  mediaStream?: MediaStream;
  lastBitmap?: ImageBitmap;
  tesseractWorker!: Tesseract.Worker;

  fontData!: IFontCanvases;

  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onUpdate: () => void;

  constructor(config: OCRConfig) {
    super();
    if (config.canvasRef) {
      this.canvasRef = config.canvasRef;
    }
    if (
      config.onUpdate
    ) {
      this.onUpdate = config.onUpdate;
    } else {
      this.onUpdate = () => { };
    }
    const init = async () => {
      await this.startTesseract();
      await this.genCanvases();

      this.ready = true;
      this.onUpdate();
    };
    init();
  }

  async genCanvases() {
    this.fontData = await genCanvases();
  }

  async startTesseract() {
    const worker = Tesseract.createWorker({
      errorHandler: (e) => {
        console.error(e);
        this.startTesseract();
      },
      logger: this.canvasRef ? console.log : () => { },
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    await worker.setParameters({
      tessedit_ocr_engine_mode: Tesseract.OEM.TESSERACT_ONLY,
      tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY, // https://github.com/tesseract-ocr/tesseract/blob/4.0.0/src/ccstruct/publictypes.h#L163
      tessjs_create_hocr: '0',
      tessjs_create_tsv: '0',
      tessjs_create_box: '0',
    });

    this.tesseractWorker = worker;
  }

  async startCapture(displayMediaOptions: DisplayMediaStreamConstraints = {}) {
    const ms = await startCapture(displayMediaOptions);
    if (ms) {
      this.mediaStream = ms;
      this.loop = true;
      this.captureLoop();
      this.onUpdate();
    }
  }

  async stopCapture() {
    this.mediaStream?.getTracks().forEach(track => {
      track.stop();
    });
    this.loop = false;
    delete this.mediaStream;
    this.onUpdate();
  }

  async captureLoop() {
    while (this.loop) {
      if (this.canvasRef) { // to debug
        console.log('One-time capture');
        await new Promise(res => setTimeout(res, 5000)).then(() => { this.loop = false });
      }
      await this.getBitmap();
      if (!this.lastBitmap) {
        throw new Error('Cannot get bitmap');
      }
      const seed = await this.getSeedFromImage();
      if (!seed) {
        continue;
      }
      if (parseInt(seed, 10) > 4294967295) {
        continue;
      }
      if (seed) {
        this.dispatchEvent(new CustomEvent('seed', { detail: { seed } }));
      }
    }
  }

  async getBitmap() {
    const track = this.mediaStream?.getVideoTracks()[0];
    if (!track) {
      return;
    }
    const imageCapture = new ImageCapture(track);
    this.lastBitmap = await imageCapture.grabFrame();
    this.onUpdate();
    return this.lastBitmap;
  }

  getDisplayParams() {
    return ({
      width: this.lastBitmap!.width,
      height: this.lastBitmap!.height
    });
  }

  async getSeedFromImage() {
    const bm = this.lastBitmap;
    if (!bm) {
      console.error("Could not get current screencap");
      return;
    }

    const displayParams = this.getDisplayParams();
    const img = invert(enhance(crop(
      copyImage(bm),
      20,
      displayParams.height - displayParams.height / 8,
      displayParams.width / 2.3,
      displayParams.height / 8
    )));

    if (this.canvasRef) { // to debug
      const ctx = this.canvasRef.current!.getContext('2d')!;
      // ctx.fillStyle = "#000000";
      // ctx.fillRect(0, 0, 1000, 1000);
      ctx.drawImage(img, 40, 0);
    }

    const res = await this.tesseractWorker.recognize(img);
    const secondLine = res.data.lines[1]; // seed is on the second line always
    if (!secondLine) {
      return;
    }
    if (!secondLine.words[0].text.includes('eed')) {
      return;
    }
    let i = 0; // to debug
    const text = secondLine.words[1].symbols.reduce<string>((t, s) => {
      const letter = (crop(img, s.bbox.x0, s.bbox.y0, s.bbox.x1 - s.bbox.x0, s.bbox.y1 - s.bbox.y0));
      const char = this.getBestFitChar(letter, i);
      t += char;
      i++;
      return t;
    }, '').replace(/\s/g, '');
    this.onUpdate();
    return text;
  }

  getBestFitChar = (char: HTMLCanvasElement, debugOffset = 0): string => {
    let maxFit = Number.MAX_SAFE_INTEGER;
    let bestChar = '';
    let i = 0;
    for (const [fontChar, fontCharCanvas] of Object.entries(this.fontData)) {
      const stretched = stretch(fontCharCanvas, char.width, char.height);
      const d = diff(char, stretched);

      if (maxFit > d) {
        if (this.canvasRef) { // to debug
          const ctx = this.canvasRef.current!.getContext('2d')!;
          ctx.drawImage(char, 1 + (20 * (i)), 20 * (debugOffset));
          ctx.drawImage(stretched, 1 + (20 * (i)), 40 * (debugOffset));
          // ctx.drawImage(fontCharCanvas, 1 + 20 * i, 60 * debugOffset);
        }
        maxFit = d;
        bestChar = fontChar;
      }
      i++;
    }
    return bestChar;
  }
}

export const useOCRHandler = (config: OCRConfig) => {
  const ocrHandler = new OCRHandler(config);

  return ocrHandler;
}

export default OCRHandler;
