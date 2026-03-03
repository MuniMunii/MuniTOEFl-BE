import Express from "express";
import cookieParser from "cookie-parser"
import {toNodeHandler} from "better-auth/node"
import cors from "cors"
import { auth } from "./routes/auth/auth.routes.js";
import VoucherRoutes from "./routes/voucher/voucher.routes.js"
import AdminVoucherRoutes from "./routes/voucher/admin/voucher.routes.js"
import UsersRoutes from "./routes/auth/users.routes.js"
import TestRoutes from './routes/tests/tests.routes.js'
import AdminTestRoutes from './routes/tests/admin/tests.routes.js'
import TestAttempsRoutes from './routes/tests/testAttemps.routes.js'
import { initIndexes } from "./utils/initIndex.js";
import {rateLimit} from "express-rate-limit"
const app=Express()
const port=3000

// Whitelist for temporary/dev
await initIndexes()
app.use(cors({origin:['http://localhost:5173'],credentials:true}))
app.all('/api/auth/*splat',toNodeHandler(auth))
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(cookieParser())
app.use(
  "/api/voucher",
  rateLimit({ windowMs: 1 * 60 * 1000, limit: 20,
    message: "Too many requests, please try again later.", }),
  VoucherRoutes
);
app.use(
  "/api/admin/voucher",
  rateLimit({ windowMs: 1 * 60 * 1000, limit: 20,
    message: "Too many requests, please try again later.", }),
  AdminVoucherRoutes
);
app.use(
  "/api/user",
  rateLimit({ windowMs: 5 * 60 * 1000, limit: 50,
    message: "Too many requests, please try again later.", }),
  UsersRoutes
);
app.use(
  "/api/test",
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    message: "Too many requests, please try again later.",
  }),
  TestRoutes
);
app.use(
  "/api/admin/test",
  rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 100,
    message: "Too many requests, please try again later.",
  }),
  AdminTestRoutes
);
app.use(
  "/api/test-attempt",
  rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 500,
    message: "Too many requests, please try again later.",
  }),
  TestAttempsRoutes
);

app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')