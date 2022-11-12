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
    const userSchema = joi.object({
        name: joi.string()
    });

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

})



app.listen(process.env.PORT, () => {
    console.log(`Server running in port: ${process.env.PORT}`)
})