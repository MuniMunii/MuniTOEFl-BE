import { ObjectId } from 'mongodb'
import {z} from 'zod'
export const answersTestAttemptSchema=z.object({
        questionId:z.string(), // referencing _id from questions-test
        choiceId:z.string()
    }).strict()
/**
 * @abstract truth source 
 */
export const testAttemptSchema=z.object({
    _id:z.instanceof(ObjectId).optional(),
    userId:z.instanceof(ObjectId), // referencing user
    testId:z.instanceof(ObjectId), // referencing testid from meta_test
    status:z.enum(['in_progress','submitted','expired']),
    answers:z.array(answersTestAttemptSchema).default([]),
    startedAt:z.date(),
    expiresAt:z.date(),
    // for auditing
    submittedAt:z.date().optional(),
    expiredAt:z.date().optional()
})
export type TestAttemptType=z.infer<typeof testAttemptSchema>
export type answerTestAttemptType=z.infer<typeof answersTestAttemptSchema>