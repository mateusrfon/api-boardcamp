import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Joi from 'joi';
import dayjs from 'dayjs';

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

const categorieSchema = Joi.object({
    name: Joi.string().min(1).required()
})

const customerSchema = Joi.object({
    name: Joi.string().min(1).required(),
    phone: Joi.string().min(10).max(11).regex(/^[0-9]+$/).required(),
    cpf: Joi.string().length(11).regex(/^[0-9]+$/).required(),
    birthday: Joi.date()
})
//const rentalSchema =

const gameSchema = Joi.object({
    name: Joi.string().min(1).required(),
    image: Joi.string().uri(),
    stockTotal: Joi.number().integer().min(1).required(),
    categoryId: Joi.number().integer().required(),
    pricePerDay: Joi.number().integer().min(1).required()
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
app.get("/customers", async (req, res) => {
    const query = req.query.cpf ? req.query.cpf + '%' : '%';
    
    try {
        const customers = await connection.query('SELECT * FROM customers WHERE cpf LIKE $1', [query]);
        res.send(customers.rows);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.get("/customers/:id", async (req, res) => {
    const id = req.params.id;
    
    try {
        const customer = await connection.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (!customer.rows[0]) return res.sendStatus(404);
        res.send(customer.rows[0]);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/customers", async (req, res) => {
    const { name, phone, cpf, birthday } = req.body;
    if (customerSchema.validate(req.body).error) return res.sendStatus(400);

    try {
        const repeated = await connection.query('SELECT cpf FROM customers WHERE cpf = $1', [cpf]);
        if (repeated.rows[0]) return res.sendStatus(409);
        await connection.query('INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1,$2,$3,$4)',
            [name, phone, cpf, birthday]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.put("/customers/:id", async (req, res) => {
    const id = req.params.id;
    const { name, phone, cpf, birthday } = req.body;
    if (customerSchema.validate(req.body).error) return res.sendStatus(400);
    try {
        const customer = await connection.query('SELECT cpf FROM customers WHERE id = $1', [id]);
        if (customer.rows[0].cpf !== cpf) {
            const repeated = await connection.query('SELECT cpf FROM customers WHERE cpf = $1', [cpf]);
            if (repeated.rows[0]) return res.sendStatus(409);
        }
        await connection.query('UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4 WHERE id = $5',
            [name, phone, cpf, birthday, id]);
        res.sendStatus(200);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

//----------------------------------RENTALS----------------------------------//
app.get("/rentals", async (req, res) => {
    try {
        const rentals = await connection.query('SELECT * FROM rentals');
        res.send(rentals.rows);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/rentals", async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const rentDate = dayjs().format('YYYY-MM-DD');
    
    if (daysRented <= 0) return res.sendStatus(400);
    try {
        const customer = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if (!customer.rows[0]) return res.sendStatus(400);
        const game = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (!game.rows[0]) return res.sendStatus(400);
        const originalPrice = game.rows[0].pricePerDay * daysRented;
        const rentals = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1', [gameId]);
        if (rentals.rows.length >= game.rows[0].stockTotal) return res.sendStatus(400);
        await connection.query(
            `INSERT INTO 
            rentals
                ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee")
            VALUES
                ($1,$2,$3,$4,$5,$6,$7)`
                ,[ customerId, gameId, rentDate + ' ', daysRented, null, originalPrice, null ]);
                
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/rentals/:id/return", async (req, res) => {
    try {

    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.delete("/rentals/:id", async (req, res) => {
    try {

    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.listen(4000, () => {
    console.log('On business baby.');
})