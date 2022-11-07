import express from "express";
import {
  getUserById,
  updateContactById,
} from "./helper.js";
import { authorizedUser } from "../middleware/auth.js";

const router = express.Router();
  router.put("/updateContacts/:id", authorizedUser, async function (request, response) {
    const { id } = request.params;
    const data =request.body;
    const result = await updateContactById(id, data);
    response.send(result);
  });

  router.get("/getContacts/:id", authorizedUser, async function (request, response) {
    const { id } = request.params;
    const userData = await getUserById(id);
    userData
      ? response.send(userData.contacts)
      : response.status(404).send({ msg: "Id not found" });
  });

export const userRouter = router;