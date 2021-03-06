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

//----------------------------------SCHEMAS----------------------------------//
const categorieSchema = Joi.object({
    name: Joi.string().min(1).required()
})

const customerSchema = Joi.object({
    name: Joi.string().min(1).required(),
    phone: Joi.string().min(10).max(11).regex(/^[0-9]+$/).required(),
    cpf: Joi.string().length(11).regex(/^[0-9]+$/).required(),
    birthday: Joi.date()
})

const gameSchema = Joi.object({
    name: Joi.string().min(1).required(),
    image: Joi.string().uri(),
    stockTotal: Joi.number().integer().min(1).required(),
    categoryId: Joi.number().integer().required(),
    pricePerDay: Joi.number().integer().min(1).required()
})

//----------------------------------CATEGORIES----------------------------------//
app.get("/categories", async (req, res) => {
    const offset = req.query.offset ? req.query.offset : 0;
    const limit = req.query.limit ? req.query.limit : null;

    try {
        const categories = await connection.query(`
        SELECT * FROM categories 
        OFFSET $1 ROWS
        LIMIT $2
        `, [offset, limit]);
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
        await connection.query('INSERT INTO categories (name) VALUES ($1)', [name]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

//----------------------------------GAMES----------------------------------//
app.get("/games", async (req, res) => {
    const name = req.query.name ? req.query.name + '%' : '%';
    const offset = req.query.offset ? req.query.offset : 0;
    const limit = req.query.limit ? req.query.limit : null;

    try {
        const games = await connection.query(`
        SELECT games.*, categories.name AS "categoryName"
        FROM games
        JOIN categories ON games."categoryId" = categories.id
        WHERE games.name ILIKE $1
        OFFSET $2 ROWS
        LIMIT $3`
        , [name, offset, limit]);
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

//----------------------------------CUSTOMERS----------------------------------//
app.get("/customers", async (req, res) => {
    const cpf = req.query.cpf ? req.query.cpf + '%' : '%';
    const offset = req.query.offset ? req.query.offset : 0;
    const limit = req.query.limit ? req.query.limit : null;
    
    try {
        const customers = await connection.query(`
        SELECT * FROM customers
        WHERE cpf LIKE $1
        OFFSET $2 ROWS
        LIMIT $3
        `, [cpf, offset, limit]);
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
    const customerQuery = req.query.customerId ? req.query.customerId : null;
    const gameQuery = req.query.gameId ? req.query.gameId : null;
    const offset = req.query.offset ? req.query.offset : 0;
    const limit = req.query.limit ? req.query.limit : null;
    const status = req.query.status ? req.query.status : null;

    try {
        const rentals = await connection.query(`
        SELECT rentals.*,
            customers.name AS "customerName",
            games.name AS "gameName",
            games."categoryId" AS "categoryId",
            categories.name AS "categoryName"
        FROM rentals
        JOIN customers ON rentals."customerId" = customers.id
        JOIN games ON rentals."gameId" = games.id
        JOIN categories ON games."categoryId" = categories.id
        WHERE (${customerQuery} IS NULL OR rentals."customerId" = $1)
        AND (${gameQuery} IS NULL OR rentals."gameId" = $2)
        OFFSET $3 ROWS
        LIMIT $4
        `, [customerQuery, gameQuery, offset, limit]);
        const data = rentals.rows.map(e => {
            const { id, customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee } = e;
            const rental = { id, customerId, gameId, rentDate, daysRented, returnDate, originalPrice, delayFee };
            rental.customer = {
                id: e.customerId,
                name: e.customerName
            }
            rental.game = {
                id: e.gameId,
                name: e.gameName,
                categoryId: e.categoryId,
                categoryName: e.categoryName
            }
            return rental;
        });
        res.send(data);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.post("/rentals", async (req, res) => {
    const { customerId, gameId, daysRented } = req.body;
    const rentDate = dayjs().format('YYYY-MM-DD');
    
    if (daysRented <= 0 || typeof daysRented !== 'number') return res.sendStatus(400);
    try {
        const customer = await connection.query('SELECT * FROM customers WHERE id = $1', [customerId]);
        if (!customer.rows[0]) return res.sendStatus(400);
        const game = await connection.query('SELECT * FROM games WHERE id = $1', [gameId]);
        if (!game.rows[0]) return res.sendStatus(400);
        const originalPrice = game.rows[0].pricePerDay * daysRented;
        const rentals = await connection.query('SELECT * FROM rentals WHERE "gameId" = $1', [gameId]);
        const unreturned = rentals.rows.filter(e => e.returnDate === null);
        if (unreturned.length >= game.rows[0].stockTotal) return res.sendStatus(400);
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
    const id = req.params.id;
    const returnDate = dayjs().format('YYYY-MM-DD');
    
    try {
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (!rental.rows[0]) return res.sendStatus(404);
        if (rental.rows[0].returnDate !== null) return res.sendStatus(400);
        
        const rentDate = new Date(rental.rows[0].rentDate);
        const msRentDate = rentDate.getTime();
        const elapsedDays = parseInt((Date.now() - msRentDate) / 86400000);
        const delayFee = elapsedDays * rental.rows[0].originalPrice / rental.rows[0].daysRented;
        
        await connection.query('UPDATE rentals SET "returnDate" = $1, "delayFee" = $2 WHERE id = $3', [returnDate, delayFee, id]);
        res.sendStatus(201);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

app.delete("/rentals/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const rental = await connection.query('SELECT * FROM rentals WHERE id = $1', [id]);
        if (!rental.rows[0]) return res.sendStatus(404);
        if (rental.rows[0].returnDate !== null) return res.sendStatus(400);
        await connection.query('DELETE FROM rentals WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})

//----------------------------------RENTALS/METRICS----------------------------------//
app.get("/rentals/metrics", async (req, res) => {
    const startDate = req.query.startDate ? req.query.startDate : dayjs(0).format('YYYY-MM-DD');
    const endDate = req.query.endDate ? req.query.endDate : dayjs().format('YYYY-MM-DD');
    
    try {
        const rentals = await connection.query(`
        SELECT
            SUM("originalPrice" + "delayFee") AS revenue,
            COUNT(id) AS rentals,
            AVG("originalPrice" + "delayFee") AS average
        FROM rentals
        WHERE "delayFee" >= 0 AND "rentDate" >= $1 AND "rentDate" <= $2
        `, [startDate, endDate]);
        res.send(rentals.rows[0]);
    } catch(err) {
        console.log(err);
        res.sendStatus(500);
    }
})


app.listen(4000, () => {
    console.log('On business baby.');
})