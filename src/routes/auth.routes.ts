import { ExpressAuth } from "@auth/express";
import  Express from "express";
import Credentials from "@auth/express/providers/credentials"
const app=Express()
app.set("trust proxy",true)
app.use("auth/*",ExpressAuth({providers:[
    Credentials({
        credentials:{
            email:{},
            password:{}
        },
        authorize:async(credentials)=>{
            return null
        }
    })
]}))