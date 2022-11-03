import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";

const app = express();
dotenv.config();
const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
  };
app.use(cors(corsOptions));
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;
export const io = new Server(server, {
    cors: {
      origin: `${process.env.CLIENT_URL}`,
      methods: ["GET", "POST"],
    },
  });


app.listen(PORT, () => console.log("Server started in port number:", PORT));

// const io=require("socket.io")(4000);
io.on("connection",socket=>{
    const id=socket.handshake.query.id;
    socket.join(id);
    socket.on("send-message",({recipients,text})=>{
        recipients.forEach(recipient=>{
            const newRecipients=recipients.filter(r=>r!==recipient)
            newRecipients.push(id)
            socket.broadcast.to(recipient).emit("receive-message",{
                recipients:newRecipients,sender:id,text
            })
        })
    })
})

app.get("/", (req, res) => {
    //   console.log("default request");
    res.send("Welcome to the chat Application");
  });
  