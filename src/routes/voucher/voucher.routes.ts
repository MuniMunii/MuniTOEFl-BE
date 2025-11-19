import Express from "express";
import type { Request, Response } from "express";
import { createResponse } from "../../utils/createResponse.js";
import { nanoid } from "nanoid";
import clientPromise from "../../config/mongo_client.js";
import { requireAuth } from "../../middleware/protectedApi.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import { requireRoleAdmin } from "../../middleware/adminOnly.js";
const router = Express.Router();
router.post("/add-voucher",sessionMiddleware,requireAuth,requireRoleAdmin('admin'), async (req: Request, res: Response) => {
  try {
    const { orderLength, duration, typeV } = req.body;
    if (!orderLength || orderLength > 10) {
      return res.status(400).json(createResponse(false, "Max 10 vouchers allowed"));
    }
    const voucher = (await clientPromise).db("studyfirst").collection("vouchers");
    const generateID = () => `STDF-${nanoid(6)}`;
    const vouchersData = Array.from({ length: orderLength }).map(() => ({
      id: generateID(),
      duration,
      typeV,
      used: false,
      createdAt:new Date()
    }));
    await voucher.insertMany(vouchersData);
    return res
      .status(201)
      .json(createResponse(true, "Vouchers created", vouchersData, null));
  } catch (err) {
    res.status(500).json(createResponse(false, "Internal server error", null));
  }
});
router.delete("/delete-voucher",sessionMiddleware,requireAuth,requireRoleAdmin('admin'),async(req:Request,res:Response)=>{
  try{
    const {id}=req.body
    if(!id)return res.status(404).json(createResponse(false,'Cannot find Voucher',null,"Cannot find Voucher"))
    const voucher=(await clientPromise).db('studyfirst').collection('vouchers')
    await voucher.deleteOne({id:id})
    res.status(200).json(createResponse(true,'Successfully delete voucher',null,null))
  }catch(err){
    res.status(500).json(createResponse(false, "Internal server error", null));
  }
})
router.get("/get-all-voucher",sessionMiddleware,requireAuth,requireRoleAdmin('admin'),async (req:Request,res:Response)=>{
    try{
        const voucher = (await clientPromise).db("studyfirst").collection("vouchers");
        const getVoucher=await voucher.find({}).toArray()
        return res.status(200).json({
    success: true,
    data: getVoucher,
  });
    }catch(err){
    res.status(500).json(createResponse(false, "Internal server error", null));
  }
})
export default router;
