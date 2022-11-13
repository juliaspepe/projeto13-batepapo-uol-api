import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";

const app = express();
dotenv.config();
app.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI)

try {
    await mongoClient.connect();
    console.log("mongo db conectado")
} catch (err) {
    console.log(err)
}

const db = mongoClient.db("uol")

app.post('/participants', async (req, res) => {
    const { name } = req.body;
    const userSchema = joi.object({ name: joi.string() });

    try {
        const userExists = await db.collection('participants').findOne({ name: name })
        if (userExists) {
            return res.status(409).send({ message: "usuário já existe" })
        }

        const validation = userSchema.validate({ name }, { abortEarly: false });

        if (validation.error) {
            return res.status(422).send(validation.error.details)
        }

        const day = dayjs().format('HH:mm:ss');

        const saveMessage = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: day
        }

        await db.collection('participants').insertOne({ name, lastStatus: Date.now() })
        await db.collection('messages').insertOne(saveMessage)
        res.sendStatus(201)
        console.log('nome inserido com sucesso')

    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

});

app.get('/participants', async (req, res) => {
    try {
        const participantsUol = await db.collection('participants').find().toArray()
        res.send(participantsUol)
    } catch (err) {
        console.log(err)
    }
});

app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers
    console.log("user:", user)
    const userSchema = joi.object({
        from: joi.required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.valid("message", "private_message").required(),
        time: joi.required()
    });

    const day = dayjs().format('HH:mm:ss');

    const sendMessage = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: day
    }

    try {
        const userExists = await db.collection('participants').findOne( { name: user })
        console.log("userExists:", userExists)
        if (userExists) {
            
            const validation = userSchema.validate(sendMessage, { abortEarly: true });

            if (validation.error) {
                return res.status(422).send(validation.error.details)
            }

            return res.sendStatus(201)
        }

    } catch (err) {
        console.log(err)
    }
});




app.listen(process.env.PORT, () => {
    console.log(`Server running in port: ${process.env.PORT}`)
})