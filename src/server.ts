import Express from "express";
import type { Request,Response,NextFunction } from "express";
import { ExpressAuth } from "@auth/express";
import usersRoute from "./routes/auth/users.routes.js"
import { getSession } from "@auth/express"
import { authConfig } from "./routes/auth/auth.routes.js";
import cookieParser from "cookie-parser"
const app=Express()
const port=3000
 
export async function authSession(req: Request, res: Response, next: NextFunction) {
  res.locals.session = await getSession(req,authConfig)
  next()
}
 
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(authSession)
app.use(`/user`, usersRoute);
app.use("/auth",ExpressAuth(authConfig))
app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')