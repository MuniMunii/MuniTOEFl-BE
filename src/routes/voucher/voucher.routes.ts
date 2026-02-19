import Express from "express";
import type { Request, Response } from "express";
import { createResponse } from "../../utils/createResponse.js";
import clientPromise from "../../config/mongo_client.js";
import { requireAuth } from "../../middleware/protectedApi.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import type { ActivatedVoucherType } from "../../model/voucherScheme.js";
import { ObjectId } from "mongodb";
import { activatedVoucherFromParam } from "../../middleware/activatedVoucher.js";
const router = Express.Router();
router.post(
  "/activate-voucher",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.body;
      const voucher = (await clientPromise)
        .db("muniquizNew")
        .collection("vouchers");
      const findVoucher = await voucher.findOne({ id: id });
      console.log(id);
      if (!findVoucher) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "Voucher not found",
              null,
              "Voucher not found"
            )
          );
      }
      await voucher.updateOne({ id }, { $set: { used: true } });
      const activateVoucher = (await clientPromise)
        .db("muniquizNew")
        .collection("activated_vouchers");
      const months = Number(findVoucher.duration);
      const expiredAt = new Date();
      expiredAt.setMonth(expiredAt.getMonth() + months);
      const activatedVoucherObject: ActivatedVoucherType = {
        id: id,
        typeV: findVoucher.typeV,
        activatedAt: new Date(),
        expiredAt,
        usedBy: ObjectId.createFromHexString(req.user.id),
      };
      await activateVoucher.insertOne(activatedVoucherObject);
      res
        .status(201)
        .json(
          createResponse(
            true,
            "Voucher Activated",
            activatedVoucherObject,
            null
          )
        );
    } catch (err) {
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
  }
);
router.get(
  "/active-vouchers",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.user;
      const activatedVoucher = (await clientPromise)
        .db("muniquizNew")
        .collection("activated_vouchers");
      const findActivatedVoucherByUser =await activatedVoucher
        .find({ usedBy: ObjectId.createFromHexString(id) })
        .toArray();
      if (findActivatedVoucherByUser.length===0) {
        return res
          .status(404)
          .json(createResponse(false, "Dont have active voucher", null));
      }
      const now = new Date();
      const activeVouchers = (await findActivatedVoucherByUser).filter(
        (v) => new Date(v.expiredAt).getTime() > now.getTime()
      );
      if (activeVouchers.length === 0) {
        return res
          .status(404)
          .json(createResponse(false, "All vouchers expired", null));
      }
      res
        .status(200)
        .json(createResponse(true, "Successfully fetch", activeVouchers));
    } catch (err) {
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
  }
);
// router.get('/get-active-voucher-test',sessionMiddleware,requireAuth,async (req:Request,res:Response)=>{
//   try{
//   const {name}=req.user
//   const dateNow=new Date()
//   const activeVouchers=(await clientPromise).db('muniquizNew').collection("activated_vouchers")
//   const metaTest=(await clientPromise).db('muniquizNew').collection("meta_tests")
//   const getActivatedVoucherByUser=await activeVouchers.find({usedBy:name,expiredAt:{$gt:dateNow}}).toArray()
//   // ambil types yang udah di activasi sama user dengan mapping typeV
//   const unlockedTypes=new Set(getActivatedVoucherByUser.map(v=>v.typeV))
//   // return data yang test free dan type yang sudah di unlock sama user dengan di compare sama set di atas
//   const getTest=await metaTest.find({$or:[
//     {free:true},
//     {type:{$in:unlockedTypes}}
//   ]}).toArray()
//   return res.json(createResponse(true,'Successfully fetch',getTest,false,))
// }catch(err){
//       res
//         .status(500)
//         .json(createResponse(false, "Internal server error", null));
//     }
// })

// for loader endpoint and check user test session and its only for UX
router.get('/voucher-session/:type/:testId',sessionMiddleware,requireAuth,activatedVoucherFromParam(),async(req:Request,res:Response)=>{
  try{
    const {testId}=req.params
    if(!testId||!ObjectId.isValid(testId)){
      return res.status(403).json(createResponse(false,'test id not found'))
    }
    const attemptTestsCollection=(await clientPromise).db('muniquizNew').collection('attempt_tests');
    const findTestSession=await attemptTestsCollection.findOne({
      testId:ObjectId.createFromHexString(testId),
      userId:ObjectId.createFromHexString(req.user.id),
      expiresAt:{$gt:new Date()}
    })
    res.status(200).json(createResponse(true,'success',findTestSession?findTestSession:'no session'))
  }
  catch(err){
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
})
export default router;
