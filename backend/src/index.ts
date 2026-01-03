import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('LifeFlow Backend is running!');
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
