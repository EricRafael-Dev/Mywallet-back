import express from "express";
import cors from "cors";
import Joi from "joi";
import { stripHtml } from "string-strip-html";
import dayjs from "dayjs";
import { postRegister, postLogin } from "./controllers/users.controller.js";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL)
try {
    await mongoClient.connect();
    console.log("MongoDB conectado!");
} catch (err) {
    (err) => console.log(err.message);
}

export const db = mongoClient.db();

app.post("/cadastro", postRegister );

app.post("/", postLogin);

app.post("/nova-transacao/:tipo", async (req, res) => {

    const { type } = req.params;

    const { authorization } = req.headers;

    const token = authorization?.replace("Bearer ", "");

    if (!token) return res.sendStatus(401);

    const { value, description } = req.body;

    const schemaUser = Joi.object({
        value: Joi.number().positive().required(),
        description: Joi.string().required()
    })

    const validation = schemaUser.validate(req.body, { abortEarly: false });
    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const sanitizedValue = stripHtml(value).result.trim();
    const sanitizedDescription = stripHtml(description).result.trim();


    try {
        const session = await db.collection("login").findOne({ token });
        if (!session) return res.sendStatus(401);

        const today = dayjs();
        const date = today.format('DD/MM');

        await db.collection("transacoes").insertOne({ value: sanitizedValue, description: sanitizedDescription, data: date, type: type, idUsuario: session.idUsuario });

        res.sendStatus(201);

    } catch (err) {
        res.status(500).send(err.message);
    }
})


const PORT = 5000;
app.listen(PORT, () => console.log(`O servidor está rodando na porta ${PORT}!`))