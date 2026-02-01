const prisma = require('../utils/prismaClient');

const getDashboardStats = async (req, res) => {
    try {
        const { role, userId } = req.user;
        let stats = {};

        if (role === 'contributor') {
            const submissions = await prisma.submission.groupBy({
                by: ['status'],
                where: { contributor_id: userId },
                _count: { status: true }
            });

            const counts = submissions.reduce((acc, curr) => {
                acc[curr.status] = curr._count.status;
                return acc;
            }, { pending: 0, approved: 0, rejected: 0 });

            stats = {
                total_submissions: counts.pending + counts.approved + counts.rejected,
                pending: counts.pending,
                approved: counts.approved,
                rejected: counts.rejected
            };
        } else if (role === 'reviewer') {
            const pendingReviews = await prisma.submission.count({
                where: { status: 'pending' }
            });

            const reviews = await prisma.review.groupBy({
                by: ['status'],
                where: { reviewer_id: userId },
                _count: { status: true }
            });

            const counts = reviews.reduce((acc, curr) => {
                acc[curr.status] = curr._count.status;
                return acc;
            }, { approved: 0, rejected: 0 });

            stats = {
                pending_reviews: pendingReviews,
                total_reviewed: counts.approved + counts.rejected,
                approved: counts.approved,
                rejected: counts.rejected
            };
        }

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

module.exports = { getDashboardStats };
