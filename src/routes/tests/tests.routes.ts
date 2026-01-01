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
  type questionType,
} from "../../model/testScheme.js";
import { slugify } from "../../utils/slugify.js";
import { ObjectId } from "mongodb";
const router = Express.Router();
router.post(
  "/create-test",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    const session = (await clientPromise).startSession();
    try {
      const parsed = metaTestDataScheme.safeParse({
        ...req.body,
        titleSlug: slugify(req.body.title),
        published: false,
        time: "120m",
      });
      if (!parsed.success) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid payload", null, parsed.error));
      }
      const db = (await clientPromise).db("muniquizNew");
      const metaTests = db.collection("meta-tests");
      const questions = db.collection("questions-test");
      session.startTransaction();
      const metaTestRes = await metaTests.insertOne(parsed.data, { session });
      const questionData: questionType = {
        testId: metaTestRes.insertedId,
        order: 1,
        qTitle: "Question Title",
        choices: [
          { cTitle: "Title choices 1", correctAnswer: true },
          { cTitle: "Title choices 2", correctAnswer: false },
        ],
      };
      await questions.insertOne(questionData, { session });
      await session.commitTransaction();
      return res
        .status(201)
        .json(createResponse(true, "Successfully Created", parsed.data, false));
    } catch (err: any) {
      await session.abortTransaction();
      // Duplicate key error
      if (err.code === 11000) {
        return res
          .status(409)
          .json(createResponse(false, "Test already exists", null, err));
      }
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    } finally {
      await session.endSession();
    }
  }
);

router.post(
  "/get-metadata-test/:type/:titleSlug",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { type, titleSlug } = req.params;
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
router.post(
  "/get-test/:type",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const db = (await clientPromise).db("muniquizNew");
      const metaTestCollections = db.collection("meta-tests");
      const findTestByType = await metaTestCollections.find({ type }).toArray();
      if (findTestByType.length === 0)
        return res
          .status(204)
          .json(
            createResponse(
              false,
              `Test ${type} by is empty`,
              null,
              "Test is empty"
            )
          );
      res
        .status(200)
        .json(
          createResponse(true, "Successfully fetch data", findTestByType, null)
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  }
);
router.delete(
  "/delete-test",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    const session = (await clientPromise).startSession();
    try {
      const { id } = req.body;
      const db = (await clientPromise).db("muniquizNew");
      const _id = ObjectId.createFromHexString(id);
      const metaTestCollections = db.collection("meta-tests");
      const questionCollections = db.collection("questions-test");
      session.startTransaction();
      const findMetaTest = await metaTestCollections.findOne(
        { _id },
        { session }
      );
      if (!findMetaTest)
        return res
          .status(404)
          .json(
            createResponse(false, "Test not found", null, "Test not found")
          );
      await Promise.all([
        metaTestCollections.deleteOne({ _id }, { session }),
        questionCollections.deleteMany({ testId: _id }, { session }),
      ]);
      await session.commitTransaction();
      res
        .status(200)
        .json(createResponse(true, "Successfully deleted test", null, false));
    } catch (err) {
      await session.abortTransaction();
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    } finally {
      await session.endSession();
    }
  }
);
router.post('/get-question/admin/:testId',
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),async (req:Request,res:Response)=>{
    try{
    const {testId}=req.params
    if(!testId||!ObjectId.isValid(testId))return res.status(400).json(createResponse(false,'Incorrect testId',null,'Incorrect testId'))
    const _id=ObjectId.createFromHexString(testId);
    const questionCollections=(await clientPromise).db('muniquizNew').collection('questions-test')
    const findQuestions=await questionCollections.find({testId:_id}).toArray()
    if(findQuestions.length===0)return res.status(404).json(createResponse(false,"There are no question",null,'There are No question'))
      res.status(200).json(createResponse(true,'Successfully fetch questions',findQuestions,null))
    }
    catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  })
export default router;
