import Express from "express";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import clientPromise from "../../config/mongo_client.js";
import { createResponse } from "../../utils/createResponse.js";
import { userSchema} from "../../model/userScheme.js";
const router = Express.Router();
router.post("/create-user", async (req: Request, res: Response) => {
  try {
    const { password, username, email, noTelp } = req.body;
    if (!password || !username || !email || !noTelp)
      return res
        .status(403)
        .json(
          createResponse(
            false,
            "Must fill all input form",
            null,
            "Must fill all input form"
          )
        );
    const hashedPassword = await bcrypt.hash(password, 10);
    const db=(await clientPromise).db('studyfirst')
    const user = db.collection("users");
    if(await user.findOne({email})){return res.status(403).json(createResponse(false,'Email already Registered',null,'Email already Registered'))}
    const userStructure = {
      createdAt: new Date(),
      noTelp,
      password: hashedPassword,
      provider: "Credentials",
      username,
      role: "user",
      email,
      image: null,
    };
    const parsedUser = userSchema.safeParse(userStructure);
    if (!parsedUser.success) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            "Invalid user data",
            null,
            parsedUser.error.flatten()
          )
        );
    }
    await user.insertOne(parsedUser.data);
    res.status(201).json(createResponse(true,'Successfull created account',parsedUser.data))
  } catch (err) {
    return res
      .status(500)
      .json(createResponse(false, "Internal Server Error", null, err));
  }
});
export default router;
