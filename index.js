import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import { ObjectId, ObjectID } from "bson";
import cors from "cors";


const app = express()
dotenv.config()
app.use(express.json())
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI)

try {
    await mongoClient.connect()
    console.log("mongo db conectado")
} catch (err) {
    console.log(err)
}

const db = mongoClient.db("uol")

app.post('/participants', async (req, res) => {
    const { name } = req.body
    const userSchema = joi.object({ name: joi.string() })
    const day = dayjs().format('HH:mm:ss')


    try {
        const userExists = await db.collection('participants').findOne({ name: name })
        if (userExists) {
            return res.status(409).send({ message: "usuário já existe" })
        }

        const validation = userSchema.validate({ name }, { abortEarly: false })

        if (validation.error) {
            return res.status(422).send(validation.error.details)
        }

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
    const userSchema = joi.object({
        from: joi.required(),
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.valid("message", "private_message").required(),
        time: joi.required()
    });

    const day = dayjs().format('HH:mm:ss')

    const sendMessage = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: day
    }

    try {
        const userExists = await db.collection('participants').findOne({ name: user })
        if (userExists) {

            const validation = userSchema.validate(sendMessage, { abortEarly: true })

            if (validation.error) {
                return res.status(422).send(validation.error.details)
            }

            return res.sendStatus(201)
        }

    } catch (err) {
        console.log(err)
    }
});

app.get('/messages', async (req, res) => {

    const { limit } = req.query
    const { user } = req.headers
    let userOnline = []

    const messagesUol = await db.collection('messages').find().toArray()
    userOnline = messagesUol.filter((m) => m.from === user || m.to === user || m.to === "Todos")
    console.log("userOnline:", userOnline)

    if (userOnline) {
        try {
            if (limit) {
                const messagesSend = userOnline.slice(-limit)
                res.send(messagesSend)
            } else {
                const messagesSend = userOnline.slice(-100)
                res.send(messagesSend)
            }
        } catch (err) {
            res.send(err)
        }
    }

});

app.post('/status', async (req, res) => {

    const { user } = req.headers
    const day = dayjs().format('HH:mm:ss')

    try {
        const findUser = await db.collection('participants').findOne({ name: user })

        if (findUser) {
            const updateStatus = await db.collection('participants').updateOne({ _id: findUser._id }, { $set: { lastStatus: day } })
            console.log("updateStatus:", updateStatus)
            res.send.status(200)
            return
        } else {
            res.send.status(404)
            return
        }
    } catch (err) {
        res.send(err)
    }
}); 

async function userOffline() {
    const findUser = await db.collection('participants').find().toArray()
    const timeInSeconds = Date.now() / 1000
    const day = dayjs().format('HH:mm:ss')

    const filterTime = findUser.filter((userTime) => {
        (((userTime.lastStatus) / 1000) - timeInSeconds) > 10
    })

    filterTime.map((user) => {
        db.collection('messages').insertOne({
            from: user.name,
            to: 'Todos',
            text: 'saiu da sala...',
            type: 'status',
            time: day
        })
        
        db.collection('participants').deleteOne({ name: user.name })

})};

setInterval(userOffline, 15000);

app.listen(process.env.PORT, () => {
    console.log(`Server running in port: ${process.env.PORT}`)
})