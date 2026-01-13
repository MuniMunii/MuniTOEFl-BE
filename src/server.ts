import Express from "express";
import cookieParser from "cookie-parser"
import {toNodeHandler} from "better-auth/node"
import cors from "cors"
import { auth } from "./routes/auth/auth.routes.js";
import VoucherRoutes from "./routes/voucher/voucher.routes.js"
import UsersRoutes from "./routes/auth/users.routes.js"
import TestRoutes from './routes/tests/tests.routes.js'
import { initIndexes } from "./utils/initIndex.js";
import {rateLimit} from "express-rate-limit"
const app=Express()
const port=3000

// Whitelist for temporary/dev
await initIndexes()
app.use(cors({origin:['http://localhost:5173'],credentials:true}))
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use('/api/auth/*splat',toNodeHandler(auth))
app.use(
  "/api/voucher",
  rateLimit({ windowMs: 1 * 60 * 1000, limit: 20 }),
  VoucherRoutes
);
app.use(
  "/api/user",
  rateLimit({ windowMs: 5 * 60 * 1000, limit: 50 }),
  UsersRoutes
);
app.use(
  "/api/test",
//   rateLimit({
//     windowMs: 1 * 60 * 1000,
//     limit: 100,
//     message: "Too many requests, please try again later.",
//   }),
  TestRoutes
);
app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')