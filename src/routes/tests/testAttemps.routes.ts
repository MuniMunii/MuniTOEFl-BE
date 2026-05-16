import Express, { type Request, type Response } from "express";
import { requireAuth } from "../../middleware/protectedApi.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import { activatedVoucherFromParam } from "../../middleware/activatedVoucher.js";
import clientPromise from "../../config/mongo_client.js";
import { createResponse } from "../../utils/createResponse.js";
import { ObjectId } from "mongodb";
import {
  type answerTestAttemptType,
  type TestAttemptType,
} from "../../model/testAttemptScheme.js";
import parseDurationToMs from "../../utils/parseTimeDateToMs.js";
import { requireTestAccess } from "../../middleware/requireTestAccess.js";
import {
  type metaTestDataType,
  type MetaTestDoc,
  type QuestionType,
} from "../../model/testScheme.js";
import {
  VALID_VOUCHER_TYPEV,
  type VOUCHER_TYPEV,
  type VoucherType,
} from "../../model/voucherScheme.js";
const router = Express.Router();
/**
 * @query {type}
 * - type:
 *   Allowed: "reading" | "listening" | "writing" | "speaking"
 *   FilterPurpose: for middleware activatedVoucherFromParam
 *
 * @Param :testId
 * - testId:
 *     reference: testId from questions_test
 *
 * Purpose:
 *  - get all question from collections questions_test
 *
 * Required Auth
 * Required active voucher if pay content, ignored if free
 */
router.get(
  "/test/:testId/questions",
  sessionMiddleware,
  requireAuth,
  activatedVoucherFromParam(),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId || !ObjectId.isValid(testId)) {
        return res
          .status(400)
          .json(createResponse(false, "Voucher type doesn't exist"));
      }
      const db = (await clientPromise).db("muniquizNew");
      const Questions = await db
        .collection("questions_test")
        .find(
          { testId: ObjectId.createFromHexString(testId) },
          { projection: { "choices.correctAnswer": 0 } },
        )
        .sort({ order: 1 })
        .toArray();
      if (!Questions || Questions.length === 0) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "Questions not found",
              null,
              "Questions not found",
            ),
          );
      }
      res
        .status(200)
        .json(createResponse(true, "Successfully fetch", Questions, false));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
/**
 * @Param :testId
 * - testId:
 *     reference: _id from meta_tests
 *
 * Purpose:
 *  - Create first attempt test for saving answers etc
 *  - Simple description is like giving paper to you when doing exams
 *
 * Required Auth
 * Required active voucher if pay content, ignored if free
 */
router.post(
  "/test/:testId/attempts",
  sessionMiddleware,
  requireAuth,
  requireTestAccess(),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      const { id } = req.user;
      if (!testId || !ObjectId.isValid(testId)) {
        return res
          .status(400)
          .json(createResponse(false, "Voucher type doesn't exist"));
      }
      const now = new Date();
      const db = (await clientPromise).db("muniquizNew");
      const metaTestCollection = db.collection("meta_tests");
      const attemptTestsCollection =
        db.collection<TestAttemptType>("attempt_tests");
      const metaTest = await metaTestCollection.findOne({
        _id: ObjectId.createFromHexString(testId),
      });
      if (!metaTest) {
        return res
          .status(404)
          .json(
            createResponse(
              false,
              "Test referencing not found",
              null,
              "Test referencing not found",
            ),
          );
      }
      const durationMs = parseDurationToMs(metaTest.time);
      const AttemptTestData: TestAttemptType = {
        status: "in_progress",
        userId: ObjectId.createFromHexString(id),
        testId: metaTest._id,
        expiresAt: new Date(now.getTime() + durationMs),
        startedAt: now,
        answers: [],
      };
      // First check if the user has duplicate in_progress and has expires time it will change status
      await attemptTestsCollection.updateMany(
        {
          userId: ObjectId.createFromHexString(id),
          testId: metaTest._id,
          status: "in_progress",
          expiresAt: { $lte: now },
        },
        {
          $set: { status: "expired", expiredAt: now },
        },
      );
      // this const for searching if user already has session if it has it will continue if not it will create document
      const existingAttempt = await attemptTestsCollection.findOneAndUpdate(
        {
          userId: ObjectId.createFromHexString(id),
          testId: metaTest._id,
          status: "in_progress",
          expiresAt: { $gt: now },
        },
        {
          $setOnInsert: AttemptTestData,
        },
        {
          upsert: true,
          returnDocument: "before",
        },
      );
      console.log(existingAttempt);
      if (!existingAttempt) {
        return res
          .status(201)
          .json(createResponse(true, "Successfully created", null));
      }
      res
        .status(200)
        .json(
          createResponse(false, "Attempt already in progress", existingAttempt),
        );
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);

/**
 * Purpose:
 *  - Get all active session
 *
 * Required Auth
 */
router.get(
  "/test/active-session",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const db = (await clientPromise).db("muniquizNew");
      const attemptTestCollection =
        db.collection<TestAttemptType>("attempt_tests");
      const findActiveSession = await attemptTestCollection
        .find({
                userId: ObjectId.createFromHexString(req.user.id),
                status: "in_progress",
                expiresAt: { $gt: now },
        },{projection:{_id:1,testId:1,status:1,expires_at:1}})
        .toArray();
        if(!findActiveSession||findActiveSession.length ===0 ){
          return res.status(200).json(createResponse(true, "Fetch Success", null));
        }
        console.log('active Session: ',findActiveSession,"userId: ",req.user.id)
        const sessionTestId=[...new Set(findActiveSession.map(v=>v.testId))]
        console.log(sessionTestId,sessionTestId.map(v=>ObjectId.isValid(v)))
        const findMetaTest=await db.collection<metaTestDataType>('meta_tests').find({_id:{$in:sessionTestId}},{projection:{_id:1,title:1,titleSlug:1,type:1}}).toArray()
        console.log(findMetaTest)
        const data=findActiveSession.map(v=>{
          const metaTest=findMetaTest.find(meta=>meta._id.equals(v.testId))
          console.log(metaTest)
          return {...v,title:metaTest?.title,titleSlug:metaTest?.titleSlug,type:metaTest?.type}
        })
        console.log(data)
        res.status(200).json(createResponse(true,"Success fetch active session",data))
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
/**
 * @Param :testId
 * - testId:
 *     reference: testId from collection attempt_tests
 *
 * Purpose:
 *  - Get saved answer/session and give to Frontend for button,etc
 *
 * Required Auth
 * Required active voucher if pay content, ignored if free
 */
router.get(
  "/test/:testId/active-session",
  sessionMiddleware,
  requireAuth,
  requireTestAccess(),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId || !ObjectId.isValid(testId)) {
        return res
          .status(400)
          .json(createResponse(false, "Test Id Invalid", null));
      }
      const AttemptTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection("attempt_tests");
      const now = new Date();
      const findActiveSession = await AttemptTestCollection.findOne(
        {
          userId: ObjectId.createFromHexString(req.user.id),
          testId: ObjectId.createFromHexString(testId),
          status: "in_progress",
          expiresAt: { $gt: now },
        },
        {
          projection: {
            testId: 1,
            status: 1,
            answers: 1,
            userId: 1,
            expiresAt: 1,
          },
        },
      );
      if (!findActiveSession) {
        return res.status(200).json(createResponse(true, "Fetch Success", null));
      }
      res
        .status(200)
        .json(createResponse(true, "Fetch Success", findActiveSession));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
/**
 * @Param :testId
 * - testId:
 *     reference: testId from collection attempt_tests
 *
 * Required Auth
 * Required active voucher if pay content, ignored if free
 */
router.patch(
  "/answer-question/:testId",
  sessionMiddleware,
  requireAuth,
  requireTestAccess(),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId || !ObjectId.isValid(testId)) {
        return res
          .status(400)
          .json(createResponse(false, "Voucher type doesn't exist"));
      }
      const { questionId, choiceId, saved } = req.body;
      const now = new Date();
      if (!questionId || !choiceId) {
        return res.status(400).json(createResponse(false, "Invalid payload"));
      }
      const db = (await clientPromise).db("muniquizNew");
      const attemptTestsCollection =
        db.collection<TestAttemptType>("attempt_tests");
      // Return false if test is expired
      const expiredRes = await attemptTestsCollection.findOneAndUpdate(
        {
          testId: ObjectId.createFromHexString(testId),
          userId: ObjectId.createFromHexString(req.user.id),
          status: "in_progress",
          expiresAt: { $lte: now },
        },
        {
          $set: { status: "expired", expiredAt: now },
        },
        { returnDocument: "after", includeResultMetadata: true },
      );
      // double guard
      const activeSession = await attemptTestsCollection.findOne({
        testId: ObjectId.createFromHexString(testId),
        userId: ObjectId.createFromHexString(req.user.id),
        status: "in_progress",
        expiresAt: { $gt: now },
      });
      // console.log(expiredRes.value)
      if (expiredRes.value?.status === "expired" || !activeSession) {
        return res
          .status(403)
          .json(createResponse(false, "Session Expired", null));
      }
      const result = await attemptTestsCollection.updateOne(
        {
          testId: ObjectId.createFromHexString(testId),
          userId: ObjectId.createFromHexString(req.user.id),
          status: "in_progress",
          expiresAt: { $gt: now },
          "answers.questionId": questionId,
        },
        {
          $set: {
            "answers.$.choiceId": choiceId,
            "answers.$.saved": saved,
          },
        },
      );
      if (result.matchedCount === 0) {
        await attemptTestsCollection.updateOne(
          {
            testId: ObjectId.createFromHexString(testId),
            userId: ObjectId.createFromHexString(req.user.id),
            status: "in_progress",
            expiresAt: { $gt: now },
          },
          {
            $push: {
              answers: {
                questionId,
                choiceId,
                saved,
              },
            },
          },
        );
      }
      return res.status(200).json(createResponse(true, "Answer saved"));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);

/**
 * @Param :testId
 * - testId:
 *     reference: testId from collection attempt-tests
 *
 * Required Auth
 * Required active voucher if pay content, ignored if free
 */
router.post(
  "/test/:testId/submit",
  sessionMiddleware,
  requireAuth,
  requireTestAccess(),
  async (req: Request, res: Response) => {
    try {
      const { testId } = req.params;
      if (!testId || !ObjectId.isValid(testId)) {
        return res
          .status(400)
          .json(createResponse(false, "Invalid test id", null));
      }
      const attemptTestCollection = (await clientPromise)
        .db("muniquizNew")
        .collection<TestAttemptType>("attempt_tests");
      const now = new Date();
      const findActiveAttemptTest = await attemptTestCollection.findOne({
        userId: ObjectId.createFromHexString(req.user.id),
        testId: ObjectId.createFromHexString(testId),
        status: "in_progress",
        expiresAt: { $gt: now },
      });
      if (!findActiveAttemptTest) {
        return res
          .status(404)
          .json(createResponse(false, "Active session not found"));
      }
      const submitTest = await attemptTestCollection.findOneAndUpdate(
        {
          userId: ObjectId.createFromHexString(req.user.id),
          testId: ObjectId.createFromHexString(testId),
          status: "in_progress",
          expiresAt: { $gt: now },
        },
        {
          $set: {
            status: "submitted",
            submittedAt: now,
          },
        },
        {
          includeResultMetadata: true,
          returnDocument: "after",
        },
      );
      // console.log(submitTest)
      res
        .status(200)
        .json(createResponse(true, "Test Submitted", submitTest.value));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
/**
 * @Param :attemptId
 * - attemptId:
 *     reference: _id from collection attempt_tests
 *
 * Required Auth
 */
router.get(
  "/results/:attemptId",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { attemptId } = req.params;
      if (!attemptId || !ObjectId.isValid(attemptId)) {
        return res
          .status(400)
          .json(createResponse(false, "Attempt id not found"));
      }
      const db = (await clientPromise).db("muniquizNew");
      const questionTestCollection =
        db.collection<QuestionType>("questions_test");
      const attemptTestCollection =
        db.collection<TestAttemptType>("attempt_tests");
        // console.log('attemptId ',attemptId, req.user.id)
      const findTest = await attemptTestCollection.findOne({
        _id: ObjectId.createFromHexString(attemptId),
        userId: ObjectId.createFromHexString(req.user.id),
        status: "submitted",
      });
      if (!findTest) {
        return res
          .status(404)
          .json(createResponse(false, "Test not found", null));
      }
      console.log(findTest);
      const findAllQuestionTest = await questionTestCollection
        .find({ testId: findTest.testId })
        .toArray();
      const answerMap = new Map(
        findTest.answers.map((a) => [a.questionId, a.choiceId]),
      );
      const result = findAllQuestionTest.map((v) => {
        const userChoiceId = answerMap.get(v._id.toString());
        // still considering if we should show answer / not
        // const correctAnswer = v.choices.find((c) => c.correctAnswer);
        const userAnswer = v.choices.find((v) => v.choiceId === userChoiceId);
        return {
          qId: v._id,
          qTitle: v.qTitle,
          qDescription: v.qDescription,
          userChoice: userAnswer?.cTitle,
          isCorrect: userAnswer?.correctAnswer === true,
        };
      });
      res.status(200).json(createResponse(true, "Fetch Success", result));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
/**
 * @query ?type=:type&page=:page
 * - types (string|optional):
 *     Allowed: "reading" | "listening" | "writing" | "speaking" | "all" or <VOUCHER_TYPEV,{"all"}
 *     Default: "all"
 *
 * Pagination
 * - Page (number|optional):
 *     Default: "1"
 *
 * Required Auth
 */
router.get(
  "/results",
  sessionMiddleware,
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const type = req.query.type as string | undefined??'all';
      const page = Math.max(Number(req.query.page) || 1, 1);
      const PAGE_SIZE = 6;
      const skip = (page - 1) * PAGE_SIZE;
      const db = (await clientPromise).db("muniquizNew");
      const attemptTestCollection =
        db.collection<TestAttemptType>("attempt_tests");
      const metaTestCollection = db.collection<MetaTestDoc>("meta_tests");
      if (!type) {
        return res.status(400).json(createResponse(false, "Type is required"));
      }
      console.log("selecting: ", type);
      if (
        type !== "all" &&
        !VALID_VOUCHER_TYPEV.includes(type as VOUCHER_TYPEV)
      ) {
        return res.status(400).json(createResponse(false, "Invalid Payload"));
      }
      const meta = await metaTestCollection
        .find(
          {
            ...(type !== "all" && { type: type as VOUCHER_TYPEV }),
          },
          {
            projection: {
              _id: 1,
              title: 1,
              titleSlug: 1,
              type: 1,
            },
          },
        )
        .toArray();
      console.log(meta);
      const idSet = [...new Set(meta.map((v) => v._id))];
      console.log(idSet);
      const [attempts, total] = await Promise.all([
        attemptTestCollection
          .find(
            {
              testId: { $in: idSet },
              userId: ObjectId.createFromHexString(req.user.id),
            },
            {
              skip,
              limit: PAGE_SIZE,
              projection: {
                _id:1,
                status: 1,
                userId: 1,
                testId: 1,
                submittedAt: 1,
                expiredAt: 1,
                expiresAt: 1,
              },
            },
          )
          .sort({submittedAt:-1})
          .toArray(),
        await attemptTestCollection.countDocuments({
              testId: { $in: idSet },
              userId: ObjectId.createFromHexString(req.user.id),
            }),
      ]);
      console.log(attempts);
      const attempsSet = [...new Set(attempts.map((v) => v.testId))];
      const filterMetaWithExistedAttempt = meta.filter((v) =>
        attempsSet.some((id) => id.equals(v._id)),
      );
      console.log(filterMetaWithExistedAttempt);
      return res.status(200).json(
        createResponse(true, "Successfully fetch", attempts, false, {
          ...(total !== 0 && { info: filterMetaWithExistedAttempt }),
          total: total,
        }),
      );
    } catch (err) {
      console.log(err)
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
export default router;
