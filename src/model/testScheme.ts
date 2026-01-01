import { ObjectId } from 'mongodb'
import {z}from 'zod'
export const metaTestDataScheme=z.object({
    type:z.enum(['listening','reading','speaking','writing'],'type does not exist'),
    titleSlug:z.string(),
    title:z.string().min(8,'Must be atleast 8 characters').max(20,'No more than 20 characters'),
    description:z.string().min(8,'Must be atleast 8 characters').max(300,'No more than 300 characters'),
    isFree:z.boolean(),
    time:z.enum(['30m','60m','120m','180m']),
    published:z.boolean()
})
export const questionScheme=z.object({
    testId:z.instanceof(ObjectId),//Ref from meta test
    order:z.number(),
    qTitle:z.string(),
    choices:z.array(z.object({
        cTitle:z.string(),
        correctAnswer:z.boolean()
    })).min(2,'Must contain atleast 2 elements').max(5,'5 is max elements')
})
export type metaTestDataType=z.infer<typeof metaTestDataScheme>
export type questionType=z.infer<typeof questionScheme>