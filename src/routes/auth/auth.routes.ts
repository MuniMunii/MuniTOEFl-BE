import { ExpressAuth,type ExpressAuthConfig } from "@auth/express";
import  Express from "express";
import Credentials from "@auth/express/providers/credentials"
import bcrypt from "bcrypt"
import clientPromise from "../../config/mongo_client.js";
import type { Db } from "mongodb";
const app=Express()
let db: Db;
// Immediately-invoked async setup
(async () => {
  try {
    const client = await clientPromise;
    db = client.db("studyfirst");
  } catch (err) {
    console.log("database error", err);
  }
})();
app.set("trust proxy",true)
export const authConfig:ExpressAuthConfig={
    secret:process.env.AUTH_SECRET!,
    debug:true,
    session:{strategy:'jwt'},
    // for temporary remove it when in prod
    // skipCSRFCheck:true as any,
    providers:[
    Credentials({
        credentials:{
            email:{label:'Email',type:'email'},
            password:{label:'Password',type:'password'}
        },
        authorize:async(credentials)=>{
            if (!credentials?.email || !credentials?.password) {
            console.log('Missing credentials');
            return null;
          }
            const { email, password } = credentials;
            let user=null
            let findUser=await db.collection('users').findOne({email:email})
            if(!findUser)throw new Error('User not found')
            const pwHash=await bcrypt.compare(password as string,findUser.password)
            if(!pwHash)throw new Error('Password is wrong')
            user=findUser
            return {
            _id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            provider: user.provider,
            image: user.image ?? null,
            noTelp: user.noTelp,
            createAt: user.createAt.toISOString(), 
          }
        }
    })
],
callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.username = user.username;
        }
        return token;
      },
      async session({ session, token }) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.username = token.username;
        return session;
      },
    },}
