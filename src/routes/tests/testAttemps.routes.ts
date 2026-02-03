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
const router = Express.Router();
router.get(
  "/get-all-question/:type/:testId",
  sessionMiddleware,
  requireAuth,
  // type params for this middleware
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
router.post(
  "/create-attempt-test/:type/:testId",
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
      const attemptTestsCollection = db.collection("attempt-tests");
      const metaTest = await metaTestCollection.findOne({
        testId: ObjectId.createFromHexString(testId),
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
      const AttemptTestData = {
        status: "in_progress",
        userId: ObjectId.createFromHexString(id),
        testId: metaTest._id,
        expiresAt: new Date(now.getTime() + durationMs),
        startedAt: now,
        answers: [],
      };
      const existing = await attemptTestsCollection.findOne({
        userId: ObjectId.createFromHexString(id),
        testId: metaTest._id,
        status: "in_progress",
        expiresAt: { $gt: new Date() },
      });
      if (existing) {
        return res
          .status(409)
          .json(createResponse(false, "Attempt already in progress"));
      }
      await attemptTestsCollection.insertOne(AttemptTestData);
      res.status(201).json(createResponse(true, "Successfully created", null));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
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
      const { questionId, choiceId } = req.body;
      if (!questionId || !choiceId) {
        return res.status(400).json(createResponse(false, "Invalid payload"));
      }
      const db = (await clientPromise).db("muniquizNew");
      const attemptTestsCollection =
        db.collection<TestAttemptType>("attempt-tests");
      await attemptTestsCollection.updateOne(
        {
          testId: ObjectId.createFromHexString(testId),
          userId: ObjectId.createFromHexString(req.user.id),
          status: "in_progress",
          expiresAt: { $gt: new Date() },
        },
        {
          $pull: { answers: { questionId } },
          $push: { answers: { questionId, choiceId } },
        },
      );
      return res.status(200).json(createResponse(true, "Answer saved"));
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  },
);
export default router;
