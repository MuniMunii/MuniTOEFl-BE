// Old scheme before using better-auth (not using this scheme again)
import {z}from "zod"
import { ObjectId } from "mongodb";
export const userSchema=z.object({
    ObjectId:z.instanceof(ObjectId).optional(),
    username:z.string({error:'Must be a string'}).min(5,{error:'Must have 5 characters'}).max(16,{error:'Max 16 characters'}),
    image:z.string().nullable().optional(),
    createdAt:z.date(),
    password:z.string(),
    email:z.string(),
    provider:z.enum(['Credentials','Google']),
    role:z.enum(['user','admin']),
    noTelp:z.string().trim()
    .regex(/^\+?\d{6,17}$/, {
      message:
        "Phone number must be 6–17 digits",
    })
})
export type UserType=z.infer<typeof userSchema>