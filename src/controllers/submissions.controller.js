const { prisma } = require('../app');

const reviewSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, feedback } = req.body;
        const reviewer_id = req.user.userId;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        if (status === 'rejected' && !feedback) {
            return res.status(400).json({ success: false, error: 'Feedback is required for rejection' });
        }

        const submission = await prisma.submission.findUnique({ where: { id } });

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        if (submission.status !== 'pending') {
            return res.status(400).json({ success: false, error: `Submission is already ${submission.status}` });
        }

        const updatedSubmission = await prisma.submission.update({
            where: { id },
            data: { status }
        });

        const review = await prisma.review.create({
            data: {
                submission_id: id,
                reviewer_id,
                status,
                feedback: feedback || null
            }
        });

        res.json({
            success: true,
            message: 'Submission reviewed successfully',
            review
        });

    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};


const createSubmission = async (req, res) => {
    try {
        const { title, description, category, file_url } = req.body;
        const contributor_id = req.user.userId;

        if (!title || !description || !category) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const submission = await prisma.submission.create({
            data: {
                title,
                description,
                category,
                file_url,
                contributor_id,
                status: 'pending',
                resubmission_count: 0
            }
        });

        res.status(201).json({ success: true, message: 'Submission created successfully', submission });
    } catch (error) {
        console.error('Create submission error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getSubmissions = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        let where = {};
        if (req.user.role === 'contributor') {
            where.contributor_id = req.user.userId;
        }
        if (status) {
            where.status = status;
        }

        const [submissions, total] = await prisma.$transaction([
            prisma.submission.findMany({
                where,
                skip: parseInt(skip),
                take: parseInt(limit),
                orderBy: { created_at: 'desc' },
                include: { contributor: { select: { id: true, name: true, email: true } } }
            }),
            prisma.submission.count({ where })
        ]);

        res.json({
            success: true,
            data: submissions.map(s => ({
                ...s,
                resubmissions_remaining: 2 - s.resubmission_count
            })),
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get submissions error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const getSubmissionById = async (req, res) => {
    try {
        const { id } = req.params;
        const submission = await prisma.submission.findUnique({
            where: { id },
            include: {
                contributor: { select: { id: true, name: true, email: true } },
                reviews: {
                    where: { status: 'rejected' },
                    orderBy: { reviewed_at: 'desc' },
                    take: 1
                }
            }
        });

        if (!submission) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        // Access control
        if (req.user.role === 'contributor' && submission.contributor_id !== req.user.userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const response = {
            ...submission,
            resubmissions_remaining: 2 - submission.resubmission_count,
            feedback: submission.reviews.length > 0 ? submission.reviews[0].feedback : null
        };

        res.json({ success: true, submission: response });
    } catch (error) {
        console.error('Get submission error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

const resubmit = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, file_url } = req.body;
        const contributor_id = req.user.userId;

        const original = await prisma.submission.findUnique({ where: { id } });

        if (!original) {
            return res.status(404).json({ success: false, error: 'Submission not found' });
        }

        if (original.contributor_id !== contributor_id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        if (original.status !== 'rejected') {
            return res.status(400).json({ success: false, error: 'Only rejected submissions can be resubmitted' });
        }

        if (original.resubmission_count >= 2) {
            return res.status(400).json({ success: false, error: 'Maximum resubmission limit reached (2 attempts used)' });
        }

        const newSubmission = await prisma.submission.create({
            data: {
                title: title || original.title,
                description: description || original.description,
                category: category || original.category,
                file_url: file_url || original.file_url,
                contributor_id,
                status: 'pending',
                resubmission_count: original.resubmission_count + 1,
                original_submission_id: original.original_submission_id || original.id
            }
        });

        res.status(201).json({
            success: true,
            message: 'Resubmission successful',
            submission: newSubmission
        });

    } catch (error) {
        console.error('Resubmit error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

module.exports = { createSubmission, getSubmissions, getSubmissionById, resubmit, reviewSubmission };
