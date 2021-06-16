import express from 'express';
import cors from 'cors';
import pg from 'pg';
import joi from 'joi';

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
})

const categoriesSchema = joi.object({
    name: joi.string().min(1).required()
})

//C -> INSERT INTO categories (name) VALUES (a) - ex. INSERT INTO categories (x,y,z) VALUES (a,b,c)
//R -> SELECT * FROM *table* WHERE *parameter* = n LIMIT x
//U -> UPDATE *table* SET *parameter* = n WHERE id = x (sem WHERE da update em TUDO)
//D -> DELETE FROM *table* WHERE id = x (sem WHERE deleta TUDO)

app.get("/categories", async (req, res) => {
    try {
        const categories = await connection.query('SELECT * FROM categories');
        res.send(categories.rows);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/categories", async (req, res) => {
    const { name } = req.body;
    if (categoriesSchema.validate({ name }).error) return res.sendStatus(400);
    try {
        const categories = await connection.query("SELECT name FROM categories WHERE name = $1", [name]);
        if (categories.rows[0]) return res.sendStatus(409);
        const pera = await connection.query('INSERT INTO categories (name) VALUES ($1)', [name]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.listen(4000, () => {
    console.log('On business baby.');
})