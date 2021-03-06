import request from 'superagent';

export default class Neo4jClient {
	constructor(neo4jHost, username, password) {
		this.endpoint = `http://${neo4jHost}:7474/db/data/transaction/commit`;
		this.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
	}

	/**
	 * @param {string} statement
	 * @param {object} parameters
	 * @returns {Promise<[object]>}
	 */
	async query(statement, parameters) {
		const body = {
			statements: [{
				statement,
				parameters,
				resultDataContents: ['row'],
				includeStats: false
			}]
		};

		// TODO: add circuit breaker
		const result = await request
			.post(this.endpoint)
			.send(body)
			.set('Authorization', this.authorization)
			.set('Content-Type', 'application/json');

		if (result.body.errors && result.body.errors.length) {
			throw result.body.errors;
		}

		return mapResults(result.body.results[0]);

		function mapResults(result) {
			return result.data.map(rowData => {
				let rowObject = {};

				result.columns.forEach((columnName, i) => {
					rowObject[columnName] = rowData.row[i];
				});

				return rowObject;
			});
		}
	}
}
