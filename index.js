import express from "express";
import {  MongoClient } from "mongodb";
import Cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";

dotenv.config();
const PORT = process.env.PORT || 5000;
const MONGO_URL=process.env.MONGO_URL;
const app = express();
app.use(express.json());
const server = http.createServer(app);
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

const mongoClient = new MongoClient(MONGO_URL);
  
export const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST","PUT","DELETE"],
      "allowHeaders":[],
      "credentials":true

    },
  })
  
  
app.use(Cors(corsOptions));

server.listen(PORT,async ()=>{
  try{
    await mongoClient.connect();
    console.log("listerning at *::",PORT)
  }catch(er){
    console.error(er);
  }
 
})

io.on('connection', socket => {
  const id = socket.handshake.query.id
  socket.join(id)

  socket.on('send-message', ({ recipients, text }) => {
    recipients.forEach(recipient => {
      const newRecipients = recipients.filter(r => r !== recipient)
      newRecipients.push(id)
      socket.broadcast.to(recipient).emit('receive-message', {
        recipients: newRecipients, sender: id, text
      })
    })
  })
})

app.get("/", (req, res) => {
  res.send("Welcome to chat Application");
});