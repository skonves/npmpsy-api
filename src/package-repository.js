import Neo4jClient from './neo4j-client';

export default class PackageRepository {
	/** @param {Neo4jClient} neo4jClient */
	constructor(neo4jClient) {
		this.client = neo4jClient;
	}

	async findPackages(q, offset, limit) {
		const statement = `
		MATCH (p:Package)-[:RELEASED_AS]->(v:Version) WHERE p.id STARTS WITH {q}
		RETURN DISTINCT p.id AS packageId, collect({name: v.name, ts: v.ts}) AS versions
		ORDER BY packageId SKIP {offset} LIMIT {limit}`;

		const results = await this.client.query(statement, { q, offset, limit });

		return results.map(d => {
			return {
				id: d.packageId,
				versions: d.versions ? d.versions.sort((a, b) => b.ts - a.ts) : []
			};
		});
	}

	async getVersions(packageId, offset, limit) {
		const statement = `
		MATCH (n:Package)-[r:RELEASED_AS]->(v:Version) where n.id = {packageId}
		RETURN v.name AS name, v.ts AS ts
		ORDER BY ts DESC SKIP {offset} LIMIT {limit}`;

		const results = await this.client.query(statement, { packageId, offset, limit });

		return results.map(d => {
			return { version: d.name, ts: d.ts };
		});
	}

	async getTree(packageId, version, ts) {
		const versionId = `${packageId}@${version}`;

		const statement = `
			MATCH path=(:Version {id: {versionId}})-[ds:SATISFIED_BY*..100 {type: ""}]->(v:Version)
			WHERE ALL (d IN ds WHERE d.effective <= {ts} < d.superceded)
			RETURN tail(nodes(path)) AS tail`;

		const results = await this.client.query(statement, { versionId, ts });

		return map(version, results.map(r => r.tail));
	}
}

// TODO: consider moving out of repository
function map(version, results) {
	let obj = {
		version,
		dependencies: {}
	};

	results.forEach(result => {
		let cache = obj.dependencies;

		result.forEach(level => {

			const name = level.id.split('@')[0];
			const version = level.id.split('@')[1];

			cache[name] = cache[name] || { version, dependencies: {} };
			cache = cache[name].dependencies;
		});
	});

	return obj;
}
