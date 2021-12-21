export const capitalize = (s: string) =>
	s
		.toLowerCase()
		.split(' ')
		.map(word => word[0].toUpperCase() + word.substring(1))
		.join(' ');

export const includesAll = (set: string[], test: string[]) =>
	set.length ? test.every(v => set.includes(v)) : true;

export const includesSome = (set: string[], test: string[]) =>
	set.length ? test.some(v => set.includes(v)) : false;

type CommonKeys<T> = keyof T;
type AllKeys<T> = T extends any ? keyof T : never;
type Subtract<A, C> = A extends C ? never : A;
type NonCommonKeys<T> = Subtract<AllKeys<T>, CommonKeys<T>>;

type PickType<T, K extends AllKeys<T>> = T extends { [k in K]?: any }
	? T[K]
	: undefined;

export type Merge<T> = {
	[k in CommonKeys<T>]: PickTypeOf<T, k>;
} &
	{
		[k in NonCommonKeys<T>]?: PickTypeOf<T, k>;
	};

type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T>
	? PickType<T, K>
	: never;

export type UnionToIntersection<U> = (U extends any
	? (k: U) => void
	: never) extends ((k: infer I) => void)
	? I
	: never;

export type Objectify<T> = { [id: string]: Merge<T[keyof T]> };
