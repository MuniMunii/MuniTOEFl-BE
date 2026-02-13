import Express from "express";
import type { Response, Request } from "express";
import { requireAuth } from "../../middleware/protectedApi.js";
import { requireRoleAdmin } from "../../middleware/adminOnly.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import clientPromise from "../../config/mongo_client.js";
import { createResponse } from "../../utils/createResponse.js";
import {
  ALLOWED_META_PROPS,
  metaTestDataScheme,
  type AllowedMetaProp,
  type Content,
  type metaTestDataType,
  type QuestionType,
} from "../../model/testScheme.js";
import { slugify } from "../../utils/slugify.js";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
const router = Express.Router();
router.post(
  "/create-test",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    const session = (await clientPromise).startSession();
    try {
      const now=new Date()
      const parsed = metaTestDataScheme.safeParse({
        ...req.body,
        titleSlug: slugify(req.body.title),
        published: false,
        time: "120m",
        createdAt:now
      });
      if (!parsed.success) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid payload", null, parsed.error));
      }
      const db = (await clientPromise).db("muniquizNew");
      const metaTests = db.collection("meta_tests");
      const questions = db.collection("questions_test");
      const EMPTY_DESCRIPTION_STATE: Content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              textAlign: null,
              level: 1,
            },
            content: [
              {
                type: "text",
                text: "Getting started",
              },
            ],
          },
        ],
      };
      session.startTransaction();
      const metaTestRes = await metaTests.insertOne(parsed.data, { session });
      const questionData: QuestionType = {
        testId: metaTestRes.insertedId,
        order: 1,
        qTitle: "Question Title",
        qDescription: EMPTY_DESCRIPTION_STATE,
        choices: [
          { cTitle: "Title choices 1", correctAnswer: true,choiceId:nanoid(10) },
          { cTitle: "Title choices 2", correctAnswer: false,choiceId:nanoid(10)},
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
  },
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
router.post(
  "/get-test/:type",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const db = (await clientPromise).db("muniquizNew");
      const metaTestCollections = db.collection("meta_tests");
      const findTestByType = await metaTestCollections.find({ type }).toArray();
      if (findTestByType.length === 0)
        return res
          .status(200)
          .json(
            createResponse(
              true,
              `Test ${type} by is empty`,
              [],
              "Test is empty",
            ),
          );
      res
        .status(200)
        .json(
          createResponse(true, "Successfully fetch data", findTestByType, null),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
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
      const metaTestCollections = db.collection("meta_tests");
      const questionCollections = db.collection("questions_test");
      session.startTransaction();
      const findMetaTest = await metaTestCollections.findOne(
        { _id },
        { session },
      );
      if (!findMetaTest)
        return res
          .status(404)
          .json(
            createResponse(false, "Test not found", null, "Test not found"),
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
  },
);
router.post(
  "/get-question/admin/:testId",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId || !ObjectId.isValid(testId))
        return res
          .status(400)
          .json(
            createResponse(false, "Incorrect testId", null, "Incorrect testId"),
          );
      const _id = ObjectId.createFromHexString(testId);
      const questionCollections = (await clientPromise)
        .db("muniquizNew")
        .collection("questions_test");
      const findQuestions = await questionCollections
        .find({ testId: _id })
        .toArray();
      if (findQuestions.length === 0)
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "There are no question",
              null,
              "There are No question",
            ),
          );
      res
        .status(200)
        .json(
          createResponse(
            true,
            "Successfully fetch questions",
            findQuestions,
            null,
          ),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
router.post(
  "/add-question/:testId",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId)
        return res
          .status(403)
          .json(createResponse(false, "Need testId", null, "Need testId"));
      const questionsTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection("questions_test");
      const metaTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection("meta_tests");
      const _id = ObjectId.createFromHexString(testId);
      const findMetaTest = await metaTestCollection.findOne({ _id });
      if (!findMetaTest)
        return res
          .status(404)
          .json(
            createResponse(false, "Test not found", null, "Test not found"),
          );
      const EMPTY_DESCRIPTION_STATE: Content = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              textAlign: null,
              level: 1,
            },
            content: [
              {
                type: "text",
                text: "Getting started",
              },
            ],
          },
        ],
      };
      const lastQuestion = await questionsTestCollection.findOne(
        { testId: findMetaTest._id },
        { sort: { order: -1 } },
      );
      const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;
      const questionData: QuestionType = {
        testId: findMetaTest._id,
        order: nextOrder,
        qTitle: "Question Title",
        qDescription: EMPTY_DESCRIPTION_STATE,
        choices: [
          { cTitle: "Title choices 1", correctAnswer: true,choiceId:nanoid(10)},
          { cTitle: "Title choices 2", correctAnswer: false,choiceId:nanoid(10)},
        ],
      };
      await questionsTestCollection.insertOne(questionData);
      res
        .status(201)
        .json(
          createResponse(true, "Success created question", questionData, false),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
router.delete(
  "/delete-question/:testId/:_id",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { testId, _id } = req.params;
      if (!testId || !_id)
        return res
          .status(403)
          .json(
            createResponse(
              false,
              "Must have testId and _id",
              null,
              "Must have testId and _id",
            ),
          );
      const questionsTest = (await clientPromise)
        .db("muniquizNew")
        .collection("questions_test");
      const id = ObjectId.createFromHexString(_id);
      const testIdToObjectId = ObjectId.createFromHexString(testId);
      const findQuestion = await questionsTest.findOne({
        testId: testIdToObjectId,
        _id: id,
      });
      if (!findQuestion)
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "Question not found",
              null,
              "Question not found",
            ),
          );
      await questionsTest.deleteOne({ testId: testIdToObjectId, _id: id });
      return res
        .status(200)
        .json(
          createResponse(true, "Question Successfully deleted", null, false),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
router.patch(
  "/save-questions/:testId/save",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    const session = (await clientPromise).startSession();
    try {
      const { testId } = req.params;
      const { questions } = req.body as {
        questions: (QuestionType & { _id: string })[];
      };
      if (!Array.isArray(questions) || !testId) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid payload", null));
      }
      const questionsTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection("questions_test");
      session.startTransaction();
      await questionsTestCollection.bulkWrite(
        questions.map((q, i) => ({
          updateOne: {
            filter: {
              _id: ObjectId.createFromHexString(q._id),
              testId: ObjectId.createFromHexString(testId),
            },
            update: {
              $set: {
                order: i + 1,
                qTitle: q.qTitle,
                qDescription: q.qDescription,
                choices: q.choices,
              },
            },
          },
        })),
        { session },
      );
      await session.commitTransaction();
      res
        .status(200)
        .json(
          createResponse(true, "Successfully updated questions", null, false),
        );
    } catch (err) {
      await session.abortTransaction();
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    } finally {
      await session.endSession();
    }
  },
);

router.patch(
  "/update-meta/:prop/:testId",
  sessionMiddleware,
  requireAuth,
  requireRoleAdmin("admin"),
  async (req: Request, res: Response) => {
    try {
      const { prop, testId } = req.params;
      const value = req.body.value;
      if (!testId || !prop)
        return res
          .status(400)
          .json(
            createResponse(
              false,
              "Test Id cannot be empty",
              null,
              "Test Id cannot be empty",
            ),
          );
      if (!ALLOWED_META_PROPS.includes(prop as AllowedMetaProp)) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid property", null));
      }
      if (value === undefined) {
        return res
          .status(400)
          .json(createResponse(false, "Value is required", null));
      }
      const metaTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection("meta_tests");
      const _id = ObjectId.createFromHexString(testId);
      const findMetaTestCollection = await metaTestCollection.findOne({ _id });
      if (!findMetaTestCollection) return res.sendStatus(204);
        await metaTestCollection.updateOne(
          { _id },
          prop === "published"
            ? {
                $set: value
                  ? { published: true, publishedAt: new Date() }
                  : { published: false },
                $unset: value ? {} : { publishedAt: "" },
              }
            : { $set: { [prop]: value } }
        );      res.status(200).json(createResponse(true, "Updated successfully", null));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
router.get('/get-published-lesson/:type',async (req:Request,res:Response)=>{
  try{
    const {type}=req.params
    const page = Math.max(Number(req.query.page) || 1, 1);
    const PAGE_SIZE = 6;
    const skip = (page - 1) * PAGE_SIZE;
    const metaTestDataCollection=(await clientPromise).db('muniquizNew').collection('meta_tests')
    const [items,total]=await Promise.all(
      [
      metaTestDataCollection.find({published:true,type},{sort:{createdAt:-1},skip:skip,limit:PAGE_SIZE}).toArray(),
      metaTestDataCollection.countDocuments({published:true,type})
    ])
    if(!items)return res.status(204)
      res.status(200).json(createResponse(true,'Successfully fetch lesson',items,false,{page:PAGE_SIZE,total}))
  }
  catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
})
export default router;
