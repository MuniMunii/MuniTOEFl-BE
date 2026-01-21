import Express from "express";
import type { Request, Response } from "express";
import { createResponse } from "../../utils/createResponse.js";
import { cloudinary } from "../../config/cloudinary.js";
import { upload } from "../../middleware/uploadMulter.js";
import { sessionMiddleware } from "../../middleware/sessionMiddleware.js";
import { requireAuth } from "../../middleware/protectedApi.js";
const router = Express.Router();
// debugging
// router.get('/test-user-props',sessionMiddleware,
//   requireAuth,async (req:Request,res:Response)=>{
//   try{console.log(req.user)}catch(err){console.log('error get testprops')}
// })
router.post("/change-image",  sessionMiddleware,
  requireAuth,upload.single("image"),async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json(createResponse(false, "No file uploaded"));
      }
      // upload to Cloudinary
      const uploadResult = cloudinary.uploader.upload_stream(
        { folder: "user_images" },
        (error, result) => {
          if (error) {
            return res.status(500).json(createResponse(false, "Upload failed", null, error));
          }
          // Return Cloudinary URL
          res.json(
            createResponse(true, "Image uploaded", { url: result?.secure_url })
          );
        }
      );
      // pipe buffer to cloudinary
      uploadResult.end(file.buffer);
    } catch (err) {
      return res
        .status(500)
        .json(createResponse(false, "Internal Server Error", null, err));
    }
  }
);

export default router;
