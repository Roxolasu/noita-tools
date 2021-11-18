// import { MaterialPicker } from '../services/Calculator2';
import GameInfoHandler from '../services/SeedInfo/infoHandler';

const includesAll = (arr: string[], target: string[]) =>
	arr.length ? target.every(v => arr.includes(v)) : true;

interface ISeedSolverConfig {
	apIngredients?: string[];
	lcIngredients?: string[];
	currentSeed?: number;
}
export class SeedSolver {
	gameInfoHandler = new GameInfoHandler({ seed: 0 }); // we will use the provider itself but later on we will use the whole thing
	apIngredients!: string[];
	lcIngredients!: string[];
	AP!: string[];
	LC!: string[];
	shouldCancel = false;
	foundSeed?: number;
	running = false;
	count = 0;
	currentSeed = 0;
	offset = 0;
	step = 1;
	infoFreq = 100;

	infocb?: (info: ReturnType<SeedSolver['getInfo']>) => void;

	constructor(offset: number = 0, step: number = 1) {
		this.init(offset, step);
	}

	init(offset: number, step: number) {
		this.offset = offset;
		this.step = step;
	}

	async work() {
		this.running = true;
		this.shouldCancel = false;
		while (!this.shouldCancel && this.currentSeed < 4_294_967_294) {
			while (!this.gameInfoHandler.ready) {
				// Free the event loop to check for stop
				await new Promise(res => setTimeout(res, 0));
			}
			if (this.count && this.count % this.infoFreq === 0) {
				this.sendInfo();
				// Free the event loop to check for stop
				await new Promise(res => setTimeout(res, 0));
			}
			let found = false;
			const { LC, AP } = this.gameInfoHandler.providers!.alchemy.provide(
				this.currentSeed
			);
			const allLC = includesAll(this.lcIngredients, LC);
			const allAP = includesAll(this.apIngredients, AP);
			if (allLC && allAP) {
				found = true;
			}
			if (found) {
				this.foundSeed = +this.currentSeed;
				this.LC = LC;
				this.AP = AP;
				break;
			}
			this.currentSeed += this.step;
			this.count++;
		}
		this.running = false;
		this.sendInfo();
		this.currentSeed += this.step;
	}

	async start() {
		this.foundSeed = undefined;
		return this.work();
	}

	async update(config: ISeedSolverConfig = {}) {
		if (typeof config.currentSeed === 'number') {
			this.currentSeed = config.currentSeed + this.offset;
		}
		if (config.apIngredients) {
			this.apIngredients = config.apIngredients || [];
		}
		if (config.lcIngredients) {
			this.lcIngredients = config.lcIngredients || [];
		}
	}

	async stop() {
		this.shouldCancel = true;
		this.running = false;
	}

	onInfo(cb: (info: ReturnType<SeedSolver['getInfo']>) => void) {
		this.infocb = cb;
		// return cb(this.getInfo());
	}
	sendInfo() {
		if (this.infocb) {
			this.infocb(this.getInfo());
		}
	}
	getInfo() {
		return Object.assign(
			{},
			{
				count: this.count,
				currentSeed: this.currentSeed,
				foundSeed: this.foundSeed,
				running: this.running,
				LC: this.LC,
				AP: this.AP,
				apIngredients: this.apIngredients,
				lcIngredients: this.lcIngredients
			}
		);
	}

	async getCount() {
		return this.count;
	}

	async getCurrentSeed() {
		return this.currentSeed;
	}

	async getFoundSeed() {
		return this.foundSeed;
	}
}
