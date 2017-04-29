import express from 'express';
import gangplank from 'gangplank';
import swaggerizeUI from 'swaggerize-ui';

import packageController from './package-controller';

import spec from '../swagger.json';

const app = express();

app.get('/', (req, res) => {
	res.json({ message: 'visit /docs for project documentation' });
});

// Enable documentation
app.use('/docs.json', (req, res) => res.json(require('./swagger')));
app.use('/docs', swaggerizeUI({ docs: '/docs.json' }));

app.use(gangplank.requests({
	swaggerDefinition: spec,
	exceptions: ['^/favicon\.ico$']
}));

app.use('/packages', packageController);

app.use(gangplank.errorHandler);

app.use((err, req, res, next) => {
	if (!res.headersSent) {
		res.status(500).send({
			code: 'UNHANDLED_ERROR',
			title: 'Unhandled Error',
			details: err.message,
			meta: err
		});
	}
});

const port = 3001;
app.listen(port, function () {
	console.log(`npmgraph API listening on port ${port}!`);
});
