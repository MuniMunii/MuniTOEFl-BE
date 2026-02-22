import type { NextFunction,Response,Request } from "express";
import { createResponse } from "../utils/createResponse.js";
import clientPromise from "../config/mongo_client.js";
import { VALID_VOUCHER_TYPEV, type VOUCHER_TYPEV } from "../model/voucherScheme.js";
import { ObjectId } from "mongodb";
/**
 * @returns find active voucher from user if free ignored
 */
export function activatedVoucherFromParam() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
    const db = (await clientPromise).db("muniquizNew");
      const type = req.query.type as VOUCHER_TYPEV;
      const {testId}=req.params
      if(!testId || !ObjectId.isValid(testId)){
        return res
          .status(400)
          .json(createResponse(false, "TestId is Invalid"));
      }
      const isTestFree=await db.collection('meta_tests').findOne({_id:ObjectId.createFromHexString(testId),isFree:true})
      if(isTestFree){
        return next()
      }
      if (!VALID_VOUCHER_TYPEV.includes(type)) {
        return res
          .status(404)
          .json(createResponse(false, "Voucher type doesn't exist"));
      }
      const activatedVoucher = db.collection("activated_vouchers");
      // console.log(ObjectId.createFromHexString(req.user.id),type)
      const voucher = await activatedVoucher.findOne({
        typeV: type,
        usedBy: ObjectId.createFromHexString(req.user.id),
      expiredAt: { $gt: new Date() }});
      if (!voucher) {
        return res
          .status(403)
          .json(createResponse(false, "Voucher invalid/Expired", null, "Voucher Invalid/Expired"));
      }
      next();
    } catch {
      return res
        .status(500)
        .json(createResponse(false, "Voucher validation failed"));
    }
  };
}
