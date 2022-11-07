import express from "express";
import {  MongoClient } from "mongodb";
import Cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import {userRouter} from "./routes/user.js";
import { ObjectId } from "mongodb";
import {
  createUser,
  getUserByName,
  getUserByEmail,
  getUserById,
} from "./routes/helper.js";

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


  
export const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST","PUT","DELETE"],
      "allowHeaders":[],
      "credentials":true

    },
  })
  
  
app.use(Cors(corsOptions));
async function createConnection() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  console.log("Mongo is connected ");
  return client;
}
export const client = await createConnection();

server.listen(PORT,async ()=>{
  try{
    console.log("listerning at PORT ::",PORT)
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
export async function generateHashedPassword(password) {
  const NO_OF_ROUNDS = 10; //Number of rounds of salting
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

app.use("/user",userRouter);

app.get("/", (req, res) => {
  res.send("Welcome to chat Application");
});


app.post("/signup", async function (request, response) {
  const { FirstName, LastName, Email, Password } = request.body;
  const userFromDB = await getUserByName(Email);

  if (userFromDB) {
    response.status(400).send({ message: "User already exists" });
  } else {
    const hashedPassword = await generateHashedPassword(Password);
    const result = await createUser({
      FirstName: FirstName,
      LastName: LastName,
      Email: Email,
      Password: hashedPassword,
      contacts:[],
      conversations:[]
    });  
    response.send({ message: "successful Signup" });
  }
});



app.post("/login", async function (request, response) {
  const { Email, Password } = request.body;
  const userFromDB = await getUserByName(Email);

  if (!userFromDB) {
    response.status(400).send({ message: "Invalid Credential" });
    return;
  } else {
    
    // check password
    const storedPassword = userFromDB.Password;
    const isPasswordMatch = await bcrypt.compare(Password, storedPassword);
    if (isPasswordMatch) {
      
      const secret = process.env.SECRET_KEY;
      const payload = {
        Email: Email,
      };
      
    let token = jwt.sign(payload, secret, { expiresIn: "1h" });
    let userData={
      id:userFromDB._id,
      FirstName:userFromDB.FirstName,
      LastName:userFromDB.LastName,
      Email:userFromDB.Email,
      }
    response.status(200).send({ code: 0, message: 'ok', data: token, user: userData });

      
    } else {
      response.status(400).send({ message: "Invalid Credential" });
      return;
    }
  }
});


app.post("/forgetPassword", async function (request, response) {
  const { Email } = request.body;
  const userFromDB = await getUserByEmail(Email);

  if (!userFromDB) {
    response.status(400).send({ message: "This is not a registered E-mail" });
  } else {
    //generate random string
    let randomString = randomstring.generate();

    //send a mail using nodemailer

    //Create Transporter
    const linkForUser = `${process.env.FRONTEND_URL}/reset-password/${userFromDB._id}/${randomString}`;
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        // type: 'OAUTH2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        // clientId: process.env.OAUTH_CLIENTID,
        // clientSecret: process.env.OAUTH_CLIENT_SECRET,
        // refreshToken: process.env.OAUTH_REFRESH_TOKEN
      },
    });
    //Mail options
    let mailOptions = {
      from: "no-reply@noreply.com",
      to: Email,
      subject: "Reset Password",
      html: `<h4>Hello User,</h4><br><p> You can reset the password by clicking the link below.</p><br><u><a href=${linkForUser}>${linkForUser}</a></u>`,
    };
    //Send mail
    transporter.sendMail(mailOptions, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log("email sent successfully");
      }
    });
    //Expiring date
    const expiresin = new Date();
    expiresin.setHours(expiresin.getHours() + 1);
    //store random string
    await client
      .db("chat-app")
      .collection("user")
      .findOneAndUpdate(
        { Email: Email },
        {
          $set: {
            resetPasswordToken: randomString,
            resetPasswordExpires: expiresin,
          },
        }
      );
    //Close the connection
    response.send({
      message: "User exists and password reset mail is sent",
    });
  }
});

app.post("/verifyToken", async function (request, response) {
  const { id, token } = request.body;
  const userFromDB = await getUserById(id);
  const currTime = new Date();
  currTime.setHours(currTime.getHours());
  try {
    if (currTime <= userFromDB.resetPasswordExpires) {
      if (token === userFromDB.resetPasswordToken) {
        response.send({ message: "Changing Password Approved" });
      } else {
        response.status(400).send({ message: "Token not valid" });
      }
    } else {
      response.status(400).send({ message: "Time expired" });
    }
  } catch (error) {
    response.status(500).send({
      message: "Something went wrong!",
    });
  }
});

app.put("/changePassword", async function (request, response) {
  const { Password, id } = request.body;
  
  try {
    // check password
    const hashedPassword = await generateHashedPassword(Password);
    await client
      .db("chat-app")
      .collection("user")
      .findOneAndUpdate(
        { _id: ObjectId(id) },
        { $set: { Password: hashedPassword } }
      );
    //db.users.insertOne(data);
    response.send({ message: "Password updated successfully" });
  } catch (error) {
    response.send({ message: "Unexpected error in password updation" });
  }
});