import Express from "express";
import type { Response, Request } from "express";
import { requireAuth } from "../../middleware/protectedApi.js";
import { requireRoleAdmin } from "../../middleware/adminOnly.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import clientPromise from "../../config/mongo_client.js";
import { createResponse } from "../../utils/createResponse.js";
import {
  metaTestDataScheme,
  type metaTestDataType,
} from "../../model/testScheme.js";
import { slugify } from "../../utils/slugify.js";
import { initIndexes } from "../../utils/initIndex.js";
const router = Express.Router();
router.post(
  "/create-test",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { type, title, description, isFree } = req.body;
      console.log(type, title);
      if (!type || !description || !title ||typeof isFree!=='boolean')
        return res
          .status(403)
          .json(
            createResponse(
              false,
              "All values must be inputed",
              null,
              "All values must be inputed"
            )
          );
      const db = (await clientPromise).db("muniquizNew");
      const collectionMetaTest = db.collection("meta-tests");
      const data: metaTestDataType = {
        title,
        titleSlug: slugify(title),
        type,
        time: "120m",
        description,
        isFree,
        published: false,
      };
      if (!metaTestDataScheme.safeParse(data).success)
        return res.json(
          createResponse(false, "Incorrect payload", null, "Incorrect payload")
        );
      const isTestAlreadyExist = await collectionMetaTest.findOne({
        type: type,
        title,
      });
      if (isTestAlreadyExist)
        return res
          .status(403)
          .json(
            createResponse(
              false,
              "Test already exist",
              null,
              "Test already exist"
            )
          );
      await collectionMetaTest.insertOne(data);
      res
        .status(201)
        .json(createResponse(true, "Successfully Created", data, false));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  }
);
router.post(
  "/get-metadata-test",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { type, titleSlug } = req.body;
      if (!type || !titleSlug)
        return res
          .status(403)
          .json(createResponse(false, "Type or Title is empty", null));
      const db = (await clientPromise).db("muniquizNew");
      const metaDataTestCollection = db.collection("meta-tests");
      const findMetaTest = await metaDataTestCollection.findOne({
        type,
        titleSlug,
      });
      if (!findMetaTest)
        return res
          .status(404)
          .json(
            createResponse(false, "Item not found", null, "Item not found")
          );
      res
        .status(200)
        .json(
          createResponse(true, "Successfully fetch data", findMetaTest, false)
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  }
);
export default router;
