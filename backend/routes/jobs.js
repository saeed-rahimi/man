const express = require("express");
const jobController = require("../controllers/jobController");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

// مسیرهای محافظت شده (نیاز به احراز هویت)
router.use(authMiddleware.protect);

// مسیرهای مخصوص متخصصان
router.get(
  "/available",
  authMiddleware.restrictTo("specialist"),
  jobController.getAvailableJobs
);

// مسیرهای عمومی (بدون نیاز به محدودیت نوع کاربر)
router.get("/", jobController.getAllJobs);
router.get("/:id", jobController.getJob);

// مسیرهای مخصوص متخصصان
router.post(
  "/:id/apply",
  authMiddleware.restrictTo("specialist"),
  jobController.applyForJob
);

// مسیرهای مخصوص کارفرماها
router.post(
  "/",
  authMiddleware.restrictTo("employer"),
  jobController.createJob
);
router.patch(
  "/:id",
  authMiddleware.restrictTo("employer"),
  jobController.updateJob
);
router.delete(
  "/:id",
  authMiddleware.restrictTo("employer"),
  jobController.deleteJob
);
router.post(
  "/:jobId/accept-specialist/:specialistId",
  authMiddleware.restrictTo("employer"),
  jobController.acceptSpecialist
);
router.patch(
  "/:id/complete",
  authMiddleware.restrictTo("employer"),
  jobController.completeJob
);

module.exports = router;
