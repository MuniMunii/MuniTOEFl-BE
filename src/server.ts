import Express from "express";
import cookieParser from "cookie-parser"
import {toNodeHandler} from "better-auth/node"
import cors from "cors"
import { auth } from "./routes/auth/auth.routes.js";
import VoucherRoutes from "./routes/voucher/voucher.routes.js"
import UsersRoutes from "./routes/auth/users.routes.js"
const app=Express()
const port=3000
 
// Whitelist for temporary/dev
app.use(cors({origin:['http://localhost:5173'],credentials:true}))
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use('/api/auth/*splat',toNodeHandler(auth))
app.use('/api/voucher',VoucherRoutes)
app.use('/api/user',UsersRoutes)
app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')