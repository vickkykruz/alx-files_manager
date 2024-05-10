import express from 'express';
// eslint-disable-next-line import/no-extraneous-dependencies
import bodyParser from 'body-parser';
import router from './routes/index';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(router);

app.listen(process.env.PORT || 5000, () => {
    console.log('Server is running on port 5000');
});
