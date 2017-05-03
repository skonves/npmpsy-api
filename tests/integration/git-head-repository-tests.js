import GitHeadRepository from '../../src/git-head-repository';
import { assert } from 'chai';

describe('GitHeadRepository', function () {
	it('works', function (done) {
		// ARRANGE
		const sut = new GitHeadRepository('registry.npmjs.com');

		const packageId = 'express';
		const version1 = '4.7.3';
		const version2 = '4.15.1';

		const expectedResult = {
			express: {
				'4.7.3':
				{
					repository: { type: 'git', url: 'https://github.com/visionmedia/express' },
					gitHead: '52775a52ad9e00fbd38056af6ed0cddb4286d3d2',
					time: new Date('2014-08-04T20:13:29.114Z')
				},
				'4.15.1':
				{
					repository: { type: 'git', url: 'git+https://github.com/expressjs/express.git' },
					gitHead: 'd32ed68b2995e0322100ace29d86e7a86b9c6378',
					time: new Date('2017-03-06T05:08:33.474Z')
				}
			}
		};

		// ACT
		sut.getGitHeadData([{ packageId, version: version1 }, { packageId, version: version2 }])
			.then(result => {

				// ASSERT
				assert.deepEqual(result, expectedResult);
				done();

			})
			.catch(error => {
				assert.fail(error);
				done();
			});

	});
});
