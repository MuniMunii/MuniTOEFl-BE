import {betterAuth}from 'better-auth'
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import clientPromise from '../../config/mongo_client.js';
import {admin}from 'better-auth/plugins'
const db=(await clientPromise).db('studyfirst') 
const client=await clientPromise
export const auth=betterAuth({
  plugins:[admin()],
  database:mongodbAdapter(db,{client:client}),
  // nanti di change ke origin asli saat di deploy
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
  session: {cookieCache:{
    enabled:true,
    maxAge:60 * 5 //5 menit
  },
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24
    }
    
})