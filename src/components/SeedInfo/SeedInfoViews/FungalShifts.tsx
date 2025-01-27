import React from 'react';
import classnames from 'classnames';
import { Stack } from 'react-bootstrap';

import { FungalInfoProvider } from '../../../services/SeedInfo/infoHandler';
import GameInfoProvider from '../../../services/SeedInfo/infoHandler';
import { capitalize } from '../../../services/helpers';

const Flask = () => {
	return <b className='text-info'>Flask</b>;
};

interface IShiftProps {
	key: string | number;
	data: ReturnType<FungalInfoProvider['provide']>[number];
	getMaterial: (s: string) => any;
}

const Shift = (props: IShiftProps) => {
	const { data, getMaterial } = props;

	return (
		<tr
			className={classnames([
				// (data.flaskTo || data.flaskFrom) && 'text-body',
				// !(data.flaskTo || data.flaskFrom) && 'text-muted',
				// ''
			])}
		>
			<td className="col-auto">
				<Stack>
					{data.flaskFrom && <Flask />}
					{data.from.map(s => (
						<div key={s}>{capitalize(getMaterial(s).translated_name)}</div>
					))}
				</Stack>
			</td>
			<td className="col-auto">
				<Stack>
					{data.flaskTo && <Flask />}
					<div>{capitalize(getMaterial(data.to).translated_name)}</div>
				</Stack>
			</td>
		</tr>
	);
};

interface IFungalShiftsProps {
	fungalData: ReturnType<FungalInfoProvider['provide']>;
	infoProvider: GameInfoProvider;
}

const FungalShifts = (props: IFungalShiftsProps) => {
	const { fungalData, infoProvider } = props;

	return (
		<table className="table table-sm align-middle table-responsive">
			<tbody>
				{fungalData.map((data, i) => {
					return (
						<Shift
							key={i}
							data={data}
							getMaterial={s => infoProvider.providers.material.provide(s)}
						/>
					);
				})}
			</tbody>
		</table>
	);
};

export default FungalShifts;
