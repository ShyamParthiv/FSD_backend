const express = require('express');
const { createSubmission, getSubmissions, getSubmissionById, resubmit, reviewSubmission } = require('../controllers/submissions.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticate, authorize('contributor'), createSubmission);
router.get('/', authenticate, getSubmissions); // Both can view, filtered by role in controller
router.get('/:id', authenticate, getSubmissionById);
router.post('/:id/resubmit', authenticate, authorize('contributor'), resubmit);
router.put('/:id/review', authenticate, authorize('reviewer'), reviewSubmission);

module.exports = router;
