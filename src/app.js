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

const categorieSchema = joi.object({
    name: joi.string().min(1).required()
})

const gameSchema = joi.object({
    name: joi.string().min(1).required(),
    image: joi.string().uri(),
    stockTotal: joi.number().integer().min(1).required(),
    categoryId: joi.number().integer().required(),
    pricePerDay: joi.number().integer().min(1).required()
})

//C -> INSERT INTO categories (name) VALUES (a) - ex. INSERT INTO categories (x,y,z) VALUES (a,b,c)
//R -> SELECT * FROM *table* WHERE *parameter* = n LIMIT x
//U -> UPDATE *table* SET *parameter* = n WHERE id = x (sem WHERE da update em TUDO)
//D -> DELETE FROM *table* WHERE id = x (sem WHERE deleta TUDO)

//----------------------------------CATEGORIES----------------------------------//
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
    if (categorieSchema.validate({ name }).error) return res.sendStatus(400);
    try {
        const repeated = await connection.query("SELECT name FROM categories WHERE name ILIKE $1", [name]);
        if (repeated.rows[0]) return res.sendStatus(409);
        const pera = await connection.query('INSERT INTO categories (name) VALUES ($1)', [name]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

//----------------------------------GAMES----------------------------------//
app.get("/games", async (req, res) => {
    const name = req.query.name + '%';

    try {
        const games = req.query.name    ? await connection.query("SELECT * FROM games WHERE name ILIKE $1", [name])
                                        : await connection.query('SELECT * FROM games');
        const categories = await connection.query('SELECT * FROM categories');
        games.rows.forEach(e => {
            for (let i = 0; i < categories.rows.length; i++) {
                if (e.categoryId === categories.rows[i].id) {
                    return e.categoryName = categories.rows[i].name;
                }
            }
        })
        res.send(games.rows);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/games", async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

    if (gameSchema.validate(req.body).error) return res.sendStatus(400);

    try {
        const category = await connection.query("SELECT * FROM categories WHERE id = $1", [categoryId]);
        if (!category.rows[0]) return res.sendStatus(400);
        const repeated = await connection.query("SELECT * FROM games WHERE name ILIKE $1", [name]);
        if (repeated.rows[0]) return res.sendStatus(409);
        await connection.query('INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1,$2,$3,$4,$5)',
            [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

//----------------------------------CLIENTS----------------------------------//
//----------------------------------RENTALS----------------------------------//

app.listen(4000, () => {
    console.log('On business baby.');
})