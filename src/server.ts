import Express from "express";
import { ExpressAuth } from "@auth/express";
const app=Express()
const port=3000
app.listen(port,()=>{return console.log(`app listen to port ${port}`)})
console.log('testing node-ts')