import Express,{type Request,type Response} from 'express'
import { sessionMiddleware } from '../../../middleware/sessionMiddleware.js';
import { requireAuth } from '../../../middleware/protectedApi.js';
import { requireRoleAdmin } from '../../../middleware/adminOnly.js';
import clientPromise from '../../../config/mongo_client.js';
import { createResponse } from '../../../utils/createResponse.js';
import { nanoid } from 'nanoid';
const router=Express.Router()
/**
 * @body {orderLength,duration,typeV}
 *  -orderLength:
 *   Purpose:how many voucher that will be generate
 *   Max order: 10
 * 
 *  -duration:
 *   Allowed:'1'|'3'|'5'
 *   format: in month
 * 
 *  -typeV:
 *   Allowed: "reading" | "listening" | "writing" | "speaking"
 * 
 * Purpose:
 *  - create Vouchers
 *
 * Required Auth
 * Only Admin
 */
router.post(
  "/vouchers",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { orderLength, duration, typeV } = req.body;
      if (!orderLength || orderLength > 10) {
        return res
          .status(400)
          .json(createResponse(false, "Max 10 vouchers allowed"));
      }
      const voucher = (await clientPromise)
        .db("muniquizNew")
        .collection("vouchers");
      const generateID = () => `STDF-${nanoid(6)}`;
      const allowedDuration=['1','3','5']
      if(!allowedDuration.includes(duration)){
        return res.status(403).json(createResponse(false,'Invalid duration'))
      }
      const vouchersData = Array.from({ length: orderLength }).map(() => ({
        id: generateID(),
        duration,
        typeV,
        used: false,
        createdAt: new Date(),
      }));
      await voucher.insertMany(vouchersData);
      return res
        .status(201)
        .json(createResponse(true, "Vouchers created", vouchersData, null));
    } catch (err) {
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
  }
);

/**
 * @Param :id
 *  -id:
 *  Reference: id from vouchers
 * 
 * Purpose:
 *  - delete specific voucher
 *
 * Required Auth
 * Only Admin
 */
router.delete(
  "/vouchers/:id",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id)
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "Cannot find Voucher",
              null,
              "Cannot find Voucher"
            )
          );
      const voucher = (await clientPromise)
        .db("muniquizNew")
        .collection("vouchers");
      await voucher.deleteOne({ id: id });
      res
        .status(200)
        .json(createResponse(true, "Successfully delete voucher", null, null));
    } catch (err) {
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
  }
);

/**
 * Purpose:
 *  - get all vouchers
 *
 * PS: adding query for filtering in future
 * Required Auth
 * Only Admin
 */
router.get(
  "/vouchers",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const voucher = (await clientPromise)
        .db("muniquizNew")
        .collection("vouchers");
      const getVoucher = await voucher.find({}).toArray();
      return res.status(200).json({
        success: true,
        data: getVoucher,
      });
    } catch (err) {
      res
        .status(500)
        .json(createResponse(false, "Internal server error", null));
    }
  }
);
export default router