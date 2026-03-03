import {betterAuth, type BetterAuthOptions}from 'better-auth'
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import clientPromise from '../../config/mongo_client.js';
import {admin}from 'better-auth/plugins';
import { expo } from "@better-auth/expo";
const client = await clientPromise
const db = client.db("muniquizNew")
export const auth=betterAuth({
  plugins:[admin(),expo({disableOriginOverride:true})],
  rateLimit:{enabled:true,window:15 * 60 * 1000,max:5},
  database:mongodbAdapter(db,{client:client}),
  // nanti di change ke origin asli saat di deploy
  trustedOrigins:[
"myapp://",
 "myapp://*",
 "exp://**",
 "exp://", 
  "exp://**", 
 "http://localhost:5173",
 "http://192.168.1.*",
"exp://192.168.*.*:*/**",],
  emailAndPassword:{enabled:true}, 
  user:{additionalFields:{
    role:{type:"string",input:false,defaultValue:'user'},
    noTelp:{type:'string',input:true}
  }},
  socialProviders:{
    google:{
      clientId:process.env.AUTH_GOOGLE_ID as string,
      clientSecret:process.env.AUTH_GOOGLE_SECRET as string,
    }
  },
  session: {
    cookieCache:{
    enabled:true,
    maxAge:60 * 5 //5 menit
  },
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24
    },
})