import type { NextFunction,Response,Request } from "express"
import { ObjectId } from "mongodb"
import clientPromise from "../config/mongo_client.js"
import type{ metaTestDataType } from "../model/testScheme.js"

export function requireTestAccess() {
  return async (req:Request, res:Response, next:NextFunction) => {
    const { testId } = req.params
    if(!testId||!ObjectId.isValid(testId)){
      return res.status(403).end()
    }
    const db = (await clientPromise).db("muniquizNew")
    const test = await db.collection("meta_tests").findOne<metaTestDataType>({ _id: ObjectId.createFromHexString(testId) })
    if (!test) return res.status(404).end()
    if (test.isFree) return next()
      console.log(test)
    const hasVoucher = await db.collection("activated_vouchers").findOne({
      usedBy: ObjectId.createFromHexString(req.user.id),
      typeV: test.type,
      expiredAt: { $gt: new Date() },
    })
    console.log(hasVoucher)
    if (!hasVoucher) return res.status(403).end()
    next()
  }
}
