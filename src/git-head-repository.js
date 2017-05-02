import request from 'superagent';

export default class GitHeadRepository {
	constructor(registryHost) {
		this.registryHost = registryHost;
	}

	async getGitHeadData(packageVersions) {
		const result = {};

		for (let packageVersion in packageVersions) {
			result[packageVersion.packageId] = result[packageVersion.packageId] || {};

			result[packageVersion.packageId][packageVersion.version] = result[packageVersion.packageId][packageVersion.version] || {};
		}

		await Object.keys(updatedVersions).map(packageId => {
			return new Promise((resolve, reject) => {
				request.get(`https://${this.registryHost}/${packageId}`, (err, res) => {
					if (err) {
						reject(err);
					} else {
						const versions = Object.keys(result[packageId]);

						for (let version in versions) {
							result[packageId][version] = getVersionData(res.body, version);
						}
						resolve();
					}
				});
			});
		});

		return result;
	}

	getVersionData(packageData, version) {
		if (packageData && version && packageData.versions && packageData.versions[version]) {
			return {
				repository: packageData.versions[version].repository,
				gitHead: packageData.versions[version].gitHead,
				time: packageData.time && packageData.time[version] ? new Date(packageData.time[version]) : undefined
			};
		}
	}

	// isGitHubRepo(repoData) {
	// 	switch (typeof (repoData)) {
	// 		case 'string':
	// 			return ~repoData.indexOf('github.com/');
	// 		case 'object':
	// 			return repoData.url && ~repoData.url.indexOf('github.com/');
	// 		default:
	// 			return false;
	// 	}
	// }
}
