import {betterAuth}from 'better-auth'
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import clientPromise from '../../config/mongo_client.js';
const db=(await clientPromise).db('studyfirst') 
const client=await clientPromise
export const auth=betterAuth({
  database:mongodbAdapter(db,{client:client}),
  trustedOrigins:['http://localhost:5173'],

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
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24
    }
})