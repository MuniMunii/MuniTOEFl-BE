import Express from "express";
import type { Response, Request } from "express";
import { requireAuth } from "../../middleware/protectedApi.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import clientPromise from "../../config/mongo_client.js";
import { createResponse } from "../../utils/createResponse.js";
import {
  VALID_VOUCHER_TYPEV,
  type VOUCHER_TYPEV,
} from "../../model/voucherScheme.js";
const router = Express.Router();
/**
 * @Param :type
 * - type:
 *   Allowed: "reading" | "listening" | "writing" | "speaking"
 *
 * @Param :testId
 * - testId:
 *     reference: testId from questions_test
 *
 * Purpose:
 *  - get one specific lesson content from metadata
 *
 * Required Auth
 */
router.get(
  "/metadata/:type/:titleSlug",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { type, titleSlug } = req.params;
      if (!type || !titleSlug)
        return res
          .status(403)
          .json(createResponse(false, "Type or Title is empty", null));
      if (!VALID_VOUCHER_TYPEV.includes(type as VOUCHER_TYPEV)) {
        return res
          .status(403)
          .json(createResponse(false, "Type not found", null));
      }
      const db = (await clientPromise).db("muniquizNew");
      const metaDataTestCollection = db.collection("meta_tests");
      const findMetaTest = await metaDataTestCollection.findOne({
        type,
        titleSlug,
      });
      if (!findMetaTest)
        return res
          .status(404)
          .json(
            createResponse(false, "Item not found", null, "Item not found"),
          );
      res
        .status(200)
        .json(
          createResponse(true, "Successfully fetch data", findMetaTest, false),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);

/**
 * @Query {type,page}
 * - type (string|optional):
 *   Allowed: "reading" | "listening" | "writing" | "speaking"
 *   default: "reading"
 *
 * - page (number|optional):
 *   default: 1
 *   page_size: max 6
 *
 * @Param :testId
 * - testId:
 *     reference: testId from questions_test
 *
 * Purpose:
 *  - get all published lesson
 *
 */
router.get("/metadata/published", async (req: Request, res: Response) => {
  try {
    const type = req.query.type as VOUCHER_TYPEV;
    if (!VALID_VOUCHER_TYPEV.includes(type)) {
      return res.status(403).json(createResponse(false, "type is not found"));
    }
    const page = Math.max(Number(req.query.page) || 1, 1);
    const PAGE_SIZE = 6;
    const skip = (page - 1) * PAGE_SIZE;
    const metaTestDataCollection = (await clientPromise)
      .db("muniquizNew")
      .collection("meta_tests");
    const [items, total] = await Promise.all([
      metaTestDataCollection
        .find(
          { published: true, type },
          { sort: { createdAt: -1 }, skip: skip, limit: PAGE_SIZE },
        )
        .toArray(),
      metaTestDataCollection.countDocuments({ published: true, type }),
    ]);
    if (!items) return res.status(204);
    res
      .status(200)
      .json(
        createResponse(true, "Successfully fetch lesson", items, false, {
          page: PAGE_SIZE,
          total,
        }),
      );
  } catch (err) {
    return res
      .status(500)
      .json(createResponse(false, "Internal Server Error", null, err));
  }
});
export default router;
