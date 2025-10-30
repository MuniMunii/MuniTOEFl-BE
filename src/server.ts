import Express from "express";
import type { Request,Response,NextFunction } from "express";
import { ExpressAuth } from "@auth/express";
import usersRoute from "./routes/auth/users.routes.js"
import { getSession } from "@auth/express"
import { authConfig } from "./routes/auth/auth.routes.js";
import cookieParser from "cookie-parser"
import cors from "cors"
const app=Express()
const port=3000
 
export async function authSession(req: Request, res: Response, next: NextFunction) {
  res.locals.session = await getSession(req,authConfig)
  next()
}
// Whitelist for temporary/dev
app.use(cors({origin:['http://localhost:5173'],credentials:true}))
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(authSession)
app.use(`/user`, usersRoute);
app.use('/auth',ExpressAuth({...authConfig,pages:{signIn:'http://localhost:5173/auth/login'}}))
app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')