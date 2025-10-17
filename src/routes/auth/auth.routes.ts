import { ExpressAuth,type ExpressAuthConfig } from "@auth/express";
import  Express from "express";
import Credentials from "@auth/express/providers/credentials"
import bcrypt from "bcrypt"
import clientPromise from "../../config/mongo_client.js";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { Db } from "mongodb";
const app=Express()

app.set("trust proxy",true)
export const authConfig:ExpressAuthConfig={
    secret:process.env.AUTH_SECRET!,
    adapter:MongoDBAdapter(clientPromise),
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
            const db=(await clientPromise).db('studyfirst')
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
            createdAt: user.createdAt.toISOString(), 
          }
        }
    })
],
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: false, // IMPORTANT: allow HTTP for localhost
    },
  },
},
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
