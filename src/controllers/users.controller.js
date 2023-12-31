import Joi from "joi";
import { stripHtml } from "string-strip-html";
import { db } from "../app.js";
import bcrypt from "bcrypt";
import { v4 as uuid } from 'uuid';

export async function postRegister (req, res) {

    const { name, email, password } = req.body;

    const schemaUser = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(3).required()
    })

    const validation = schemaUser.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const sanitizedName = stripHtml(name).result.trim();
    const sanitizedEmail = stripHtml(email).result.trim();
    const sanitizedPassword = stripHtml(password).result.trim();


    try {
        const user = await db.collection("usuariosCadastrados").findOne({ email: sanitizedEmail });
        if (user) return res.status(409).send("Esse usuário já existe!");

        const hash = bcrypt.hashSync(sanitizedPassword, 10);

        await db.collection("usuariosCadastrados").insertOne({ name: sanitizedName, email: sanitizedEmail, password: hash });

        res.sendStatus(201);

    } catch (err) {
        res.status(500).send(err.message);
    }

}

export async function postLogin (req, res) {

    const { email, password } = req.body;

    const schemaUser = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(3).required()
    })

    const validation = schemaUser.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const sanitizedEmail = stripHtml(email).result.trim();
    const sanitizedPassword = stripHtml(password).result.trim();


    try {
        const user = await db.collection("usuariosCadastrados").findOne({ email: sanitizedEmail });
        if (!user) return res.status(404).send("Usuário não cadastrado");

        const senhaEstaCorreta = bcrypt.compareSync(sanitizedPassword, user.password);
        if (!senhaEstaCorreta) return res.status(401).send("Senha incorreta");

        const token = uuid();
        await db.collection("login").insertOne({ token, idUsuario: user._id });

        return res.status(200).send({token: token, nome: user.name});

    } catch (err) {
        res.status(500).send(err.message)
    }
}